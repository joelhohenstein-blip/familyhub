import { z } from "zod";
import { router, procedure } from "../trpc";
import { familyInvitations, familyMembers, users } from "../../../db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import crypto from "crypto";
import { logAction } from "../../../utils/auditLog.server";

// Zod schemas for validation
const generateInviteLinkSchema = z.object({
  familyId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "member", "guest"]).default("member"),
  expirationDays: z.number().int().positive().max(90).default(7),
});

const revokeInviteSchema = z.object({
  familyId: z.string().uuid(),
  invitationId: z.string().uuid(),
});

const validateInviteSchema = z.object({
  token: z.string(),
});

const getInviteDetailsSchema = z.object({
  familyId: z.string().uuid(),
});

const getPendingInvitesSchema = z.object({
  email: z.string().email(),
});

export const invitesRouter = router({
  // Generate a new invite link
  generateInviteLink: procedure
    .input(generateInviteLinkSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Verify user is admin of the family
      const adminMembership = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id),
            eq(familyMembers.role, "admin")
          )
        )
        .limit(1);

      if (!adminMembership.length) {
        throw new Error("Only family admins can generate invite links");
      }

      // Check if user is already a member
      const existingMember = await ctx.db
        .select()
        .from(familyMembers)
        .innerJoin(users, eq(familyMembers.userId, users.id))
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(users.email, input.email)
          )
        )
        .limit(1);

      if (existingMember.length) {
        throw new Error("User is already a member of this family");
      }

      // Check for active pending invitations
      const activePendingInvite = await ctx.db
        .select()
        .from(familyInvitations)
        .where(
          and(
            eq(familyInvitations.familyId, input.familyId),
            eq(familyInvitations.email, input.email),
            isNull(familyInvitations.acceptedAt)
          )
        )
        .limit(1);

      // If there's an active pending invite, revoke it first
      if (activePendingInvite.length) {
        const pendingInvite = activePendingInvite[0];
        if (pendingInvite.inviteExpiresAt && pendingInvite.inviteExpiresAt > new Date()) {
          // Mark the old one as revoked by setting it to accepted state conceptually
          // In reality, we'd add a revokedAt field to the schema, but working with existing
          // We'll create a new one instead
        }
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expirationDays);

      // Create invitation
      const [invitation] = await ctx.db
        .insert(familyInvitations)
        .values({
          familyId: input.familyId,
          email: input.email,
          role: input.role,
          inviteToken: token,
          inviteExpiresAt: expiresAt,
        })
        .returning();

      // Log the action
      await logAction({
        actionType: "GENERATE_INVITE_LINK",
        actorId: ctx.user.id,
        targetId: invitation.id,
        targetType: "invitation",
        description: `Admin created invite link for ${input.email}`,
        metadata: {
          familyId: input.familyId,
          email: input.email,
          role: input.role,
          expiresAt: expiresAt.toISOString(),
          revocable: true,
        },
      });

      // Generate the invite link (in production, this would be a full URL)
      const inviteLink = `${process.env.PREDEV_DEPLOYMENT_URL}/invite/${token}`;

      return {
        invitation,
        inviteLink,
        token,
        expiresAt,
        message: "Invite link generated successfully",
      };
    }),

  // Revoke an invite
  revokeInvite: procedure
    .input(revokeInviteSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Get the invitation
      const [invitation] = await ctx.db
        .select()
        .from(familyInvitations)
        .where(eq(familyInvitations.id, input.invitationId))
        .limit(1);

      if (!invitation) {
        throw new Error("Invitation not found");
      }

      // Verify user is admin of the family
      const adminMembership = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id),
            eq(familyMembers.role, "admin")
          )
        )
        .limit(1);

      if (!adminMembership.length) {
        throw new Error("Only family admins can revoke invites");
      }

      // Update invitation to set expiry to now (effectively revokes it)
      const [revokedInvitation] = await ctx.db
        .update(familyInvitations)
        .set({
          inviteExpiresAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(familyInvitations.id, input.invitationId))
        .returning();

      // Log the action
      await logAction({
        actionType: "REVOKE_INVITE",
        actorId: ctx.user.id,
        targetId: input.invitationId,
        targetType: "invitation",
        description: `Admin revoked invite for ${invitation.email}`,
        metadata: {
          familyId: input.familyId,
          email: invitation.email,
          invitationId: input.invitationId,
          revokedAt: new Date().toISOString(),
        },
      });

      return {
        invitation: revokedInvitation,
        message: "Invite revoked successfully",
      };
    }),

  // Validate an invite token
  validateInvite: procedure
    .input(validateInviteSchema)
    .query(async ({ ctx, input }) => {
      const [invitation] = await ctx.db
        .select()
        .from(familyInvitations)
        .where(eq(familyInvitations.inviteToken, input.token))
        .limit(1);

      if (!invitation) {
        return { valid: false, reason: "Invalid or expired token" };
      }

      if (invitation.acceptedAt) {
        return { valid: false, reason: "This invitation has already been accepted" };
      }

      if (invitation.inviteExpiresAt && invitation.inviteExpiresAt < new Date()) {
        return { valid: false, reason: "This invitation has expired" };
      }

      return {
        valid: true,
        invitation: {
          email: invitation.email,
          role: invitation.role,
          familyId: invitation.familyId,
        },
      };
    }),

  // Get pending invites for a family
  getInviteDetails: procedure
    .input(getInviteDetailsSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Verify user is admin of the family
      const adminMembership = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id),
            eq(familyMembers.role, "admin")
          )
        )
        .limit(1);

      if (!adminMembership.length) {
        throw new Error("Only family admins can view invite details");
      }

      // Get all pending invitations
      const pendingInvites = await ctx.db
        .select()
        .from(familyInvitations)
        .where(
          and(
            eq(familyInvitations.familyId, input.familyId),
            isNull(familyInvitations.acceptedAt)
          )
        )
        .orderBy(desc(familyInvitations.createdAt));

      // Filter out expired ones
      const activeInvites = pendingInvites.filter(
        (inv) => inv.inviteExpiresAt && inv.inviteExpiresAt > new Date()
      );

      const expiredInvites = pendingInvites.filter(
        (inv) => !inv.inviteExpiresAt || inv.inviteExpiresAt <= new Date()
      );

      return {
        activeInvites,
        expiredInvites,
        totalPending: activeInvites.length,
        totalExpired: expiredInvites.length,
      };
    }),

  // Get pending invites for a specific email
  getPendingInvites: procedure
    .input(getPendingInvitesSchema)
    .query(async ({ ctx, input }) => {
      const pendingInvites = await ctx.db
        .select()
        .from(familyInvitations)
        .where(
          and(
            eq(familyInvitations.email, input.email),
            isNull(familyInvitations.acceptedAt)
          )
        )
        .orderBy(desc(familyInvitations.createdAt));

      // Filter valid (non-expired) invites
      const validInvites = pendingInvites.filter(
        (inv) => inv.inviteExpiresAt && inv.inviteExpiresAt > new Date()
      );

      return { invites: validInvites, count: validInvites.length };
    }),

  // Get invite statistics
  getInviteStatistics: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Verify user is admin of the family
      const adminMembership = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id),
            eq(familyMembers.role, "admin")
          )
        )
        .limit(1);

      if (!adminMembership.length) {
        throw new Error("Only family admins can view statistics");
      }

      const allInvites = await ctx.db
        .select()
        .from(familyInvitations)
        .where(eq(familyInvitations.familyId, input.familyId));

      const acceptedInvites = allInvites.filter((inv) => inv.acceptedAt);
      const pendingInvites = allInvites.filter((inv) => !inv.acceptedAt);
      const expiredInvites = pendingInvites.filter(
        (inv) => !inv.inviteExpiresAt || inv.inviteExpiresAt <= new Date()
      );
      const activeInvites = pendingInvites.filter(
        (inv) => inv.inviteExpiresAt && inv.inviteExpiresAt > new Date()
      );

      return {
        total: allInvites.length,
        accepted: acceptedInvites.length,
        pending: pendingInvites.length,
        active: activeInvites.length,
        expired: expiredInvites.length,
        acceptanceRate:
          allInvites.length > 0
            ? ((acceptedInvites.length / allInvites.length) * 100).toFixed(1)
            : 0,
      };
    }),
});
