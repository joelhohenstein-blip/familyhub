import { z } from "zod";
import { router, procedure } from "../trpc";
import { familyMembers, familyInvitations, families, users } from "../../../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "crypto";
import { logAction } from "../../../utils/auditLog.server";
import { EmailService } from "../../services/email.service";

// Zod schemas for validation
const inviteMembersSchema = z.object({
  familyId: z.string().uuid(),
  emails: z.array(z.string().email()).min(1, "At least one email is required"),
  role: z.enum(["admin", "member", "guest"]).default("member"),
});

const acceptInviteSchema = z.object({
  token: z.string(),
});

const assignRoleSchema = z.object({
  familyId: z.string().uuid(),
  memberId: z.string().uuid(),
  role: z.enum(["admin", "member", "guest"]),
});

const removeFromFamilySchema = z.object({
  familyId: z.string().uuid(),
  memberId: z.string().uuid(),
});

const getMembersSchema = z.object({
  familyId: z.string().uuid(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});

const getMemberDetailsSchema = z.object({
  familyId: z.string().uuid(),
  memberId: z.string().uuid(),
});

const resendInviteSchema = z.object({
  invitationId: z.string().uuid(),
});

const addMemberByUserIdSchema = z.object({
  familyId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["admin", "member", "guest"]).default("member"),
});

const updateMemberNamesSchema = z.object({
  familyId: z.string().uuid(),
  memberId: z.string().uuid(),
  firstName: z.string()
    .min(1, "First name is required")
    .max(100, "First name must be 100 characters or less")
    .regex(/^[a-zA-Z\s'-]+$/, "First name contains prohibited characters"),
  lastName: z.string()
    .min(1, "Last name is required")
    .max(100, "Last name must be 100 characters or less")
    .regex(/^[a-zA-Z\s'-]+$/, "Last name contains prohibited characters"),
});

export const familyMembersRouter = router({
  // Invite members by email
  inviteMembers: procedure
    .input(inviteMembersSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Verify user is admin of the family
      const userMembership = await ctx.db
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

      if (!userMembership.length) {
        throw new Error("Only family admins can invite members");
      }

      // Fetch the inviter's name
      const inviter = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (!inviter.length) {
        throw new Error("Inviter user not found");
      }

      const inviterName = inviter[0].firstName && inviter[0].lastName
        ? `${inviter[0].firstName} ${inviter[0].lastName}`
        : inviter[0].email;

      // Fetch the family details
      const family = await ctx.db
        .select()
        .from(families)
        .where(eq(families.id, input.familyId))
        .limit(1);

      if (!family.length) {
        throw new Error("Family not found");
      }

      const familySurname = family[0].surname;

      // Get the deployment URL for invite links
      const baseUrl = process.env.PREDEV_DEPLOYMENT_URL || 'https://familyhub.com';

      const invitations = [];
      const skipped = [];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

      for (const email of input.emails) {
        // Check if user already exists in the family
        const existingMember = await ctx.db
          .select()
          .from(familyMembers)
          .innerJoin(users, eq(familyMembers.userId, users.id))
          .where(
            and(
              eq(familyMembers.familyId, input.familyId),
              eq(users.email, email)
            )
          )
          .limit(1);

        if (existingMember.length) {
          skipped.push({
            email,
            reason: "User is already a member of this family",
          });
          continue;
        }

        // Check if an active/pending invitation already exists
        const existingInvitation = await ctx.db
          .select()
          .from(familyInvitations)
          .where(
            and(
              eq(familyInvitations.familyId, input.familyId),
              eq(familyInvitations.email, email),
              isNull(familyInvitations.acceptedAt)
            )
          )
          .limit(1);

        if (existingInvitation.length) {
          const pendingInvite = existingInvitation[0];
          // If the pending invitation hasn't expired, skip it
          if (pendingInvite.inviteExpiresAt && pendingInvite.inviteExpiresAt > new Date()) {
            skipped.push({
              email,
              reason: "A pending invitation already exists for this email",
            });
            continue;
          }
        }

        const token = crypto.randomBytes(32).toString("hex");

        const invitation = await ctx.db
          .insert(familyInvitations)
          .values({
            familyId: input.familyId,
            email,
            role: input.role,
            inviteToken: token,
            inviteExpiresAt: expiresAt,
          })
          .returning();

        // Log the invitation creation
        await logAction({
          actionType: "INVITE_MEMBER",
          actorId: ctx.user.id,
          targetId: invitation[0].id,
          targetType: "invitation",
          description: `Admin ${ctx.user.id} sent an invite to ${email}`,
          metadata: {
            familyId: input.familyId,
            email,
            role: input.role,
            token: token.slice(0, 8) + "...", // Log first 8 chars only
          },
        });

        // Send invitation email
        const inviteLink = `${baseUrl}/family-invite/${token}`;
        await EmailService.sendFamilyInvitationEmail(
          {
            email,
            invitedByName: inviterName,
            familySurname,
            role: input.role,
            inviteLink,
            expiresAt,
          },
          ctx.user.id
        );

        invitations.push(invitation[0]);
      }

      return {
        invitations,
        skipped,
        message:
          invitations.length > 0
            ? `Successfully invited ${invitations.length} member(s)`
            : "No new invitations sent",
      };
    }),

  // Add member by user ID (direct add for existing users)
  addMemberByUserId: procedure
    .input(addMemberByUserIdSchema)
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
        throw new Error("Only family admins can add members");
      }

      // Check if user exists
      const userExists = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!userExists.length) {
        throw new Error("User not found");
      }

      // Check if user is already a member of the family
      const existingMember = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, input.userId)
          )
        )
        .limit(1);

      if (existingMember.length) {
        throw new Error("User is already a member of this family");
      }

      // Add user as family member
      const [newMember] = await ctx.db
        .insert(familyMembers)
        .values({
          familyId: input.familyId,
          userId: input.userId,
          role: input.role,
          status: "active",
          acceptedAt: new Date(),
        })
        .returning();

      return { member: newMember, message: "Member added successfully" };
    }),

  // Accept invite
  acceptInvite: procedure
    .input(acceptInviteSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Find the invitation
      const [invitation] = await ctx.db
        .select()
        .from(familyInvitations)
        .where(eq(familyInvitations.inviteToken, input.token))
        .limit(1);

      if (!invitation) {
        throw new Error("Invalid or expired invitation");
      }

      if (invitation.inviteExpiresAt < new Date()) {
        throw new Error("Invitation has expired");
      }

      if (invitation.acceptedAt) {
        throw new Error("This invitation has already been accepted");
      }

      // Add user to family members
      const [member] = await ctx.db
        .insert(familyMembers)
        .values({
          familyId: invitation.familyId,
          userId: ctx.user.id,
          role: invitation.role,
          status: "active",
          acceptedAt: new Date(),
        })
        .returning();

      // Mark invitation as accepted
      await ctx.db
        .update(familyInvitations)
        .set({ acceptedAt: new Date() })
        .where(eq(familyInvitations.id, invitation.id));

      return { member, familyId: invitation.familyId };
    }),

  // Assign/change member role
  assignRole: procedure
    .input(assignRoleSchema)
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
        throw new Error("Only family admins can change member roles");
      }

      // Check if member exists and get their current info
      const memberToUpdate = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.id, input.memberId),
            eq(familyMembers.familyId, input.familyId)
          )
        )
        .limit(1);

      if (!memberToUpdate.length) {
        throw new Error("Member not found in this family");
      }

      const currentMember = memberToUpdate[0];

      // Validate role transition
      if (currentMember.role === input.role) {
        throw new Error("Member already has this role");
      }

      // Update member role
      const [updatedMember] = await ctx.db
        .update(familyMembers)
        .set({
          role: input.role,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(familyMembers.id, input.memberId),
            eq(familyMembers.familyId, input.familyId)
          )
        )
        .returning();

      // Log the role change
      await logAction({
        actionType: "ASSIGN_ROLE",
        actorId: ctx.user.id,
        targetId: input.memberId,
        targetType: "member",
        description: `Admin ${ctx.user.id} changed member ${input.memberId} role from ${currentMember.role} to ${input.role}`,
        metadata: {
          familyId: input.familyId,
          memberId: input.memberId,
          previousRole: currentMember.role,
          newRole: input.role,
        },
      });

      return {
        member: updatedMember,
        message: `Member role updated to ${input.role}`,
      };
    }),

  // Remove member from family
  removeFromFamily: procedure
    .input(removeFromFamilySchema)
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
        throw new Error("Only family admins can remove members");
      }

      // Don't allow removing the family owner
      const memberToRemove = await ctx.db
        .select()
        .from(familyMembers)
        .innerJoin(families, eq(familyMembers.familyId, families.id))
        .where(
          and(
            eq(familyMembers.id, input.memberId),
            eq(familyMembers.familyId, input.familyId)
          )
        )
        .limit(1);

      if (!memberToRemove.length) {
        throw new Error("Member not found in this family");
      }

      const member = memberToRemove[0];
      if (member.family_members.userId === member.families.ownerId) {
        throw new Error("Cannot remove the family owner. Transfer ownership first if needed.");
      }

      // Remove member
      const [removedMember] = await ctx.db
        .delete(familyMembers)
        .where(
          and(
            eq(familyMembers.id, input.memberId),
            eq(familyMembers.familyId, input.familyId)
          )
        )
        .returning();

      return {
        success: true,
        member: removedMember,
        message: "Member removed successfully",
      };
    }),

  // Get family members
  getMembers: procedure
    .input(getMembersSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Verify user is member of the family
      const userMembership = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!userMembership.length) {
        throw new Error("You are not a member of this family");
      }

      // Get total count of members
      const countResult = await ctx.db
        .select()
        .from(familyMembers)
        .where(eq(familyMembers.familyId, input.familyId));
      
      const totalMembers = countResult.length;

      // Calculate pagination
      const page = input.page;
      const limit = input.limit;
      const offset = (page - 1) * limit;

      // Fetch paginated members with user data for complete information display
      const members = await ctx.db
        .select()
        .from(familyMembers)
        .innerJoin(users, eq(familyMembers.userId, users.id))
        .where(eq(familyMembers.familyId, input.familyId))
        .limit(limit)
        .offset(offset);

      // Fetch pending invitations
      const invitations = await ctx.db
        .select()
        .from(familyInvitations)
        .where(
          and(
            eq(familyInvitations.familyId, input.familyId),
            isNull(familyInvitations.acceptedAt)
          )
        );

      return {
        members,
        invitations,
        totalMembers,
        totalPendingInvitations: invitations.length,
        pagination: {
          page,
          limit,
          offset,
          totalPages: Math.ceil(totalMembers / limit),
        },
      };
    }),

  // Get member details
  getMemberDetails: procedure
    .input(getMemberDetailsSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Verify user is member of the family
      const [userMembership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!userMembership) {
        throw new Error("You are not a member of this family");
      }

      const [member] = await ctx.db
        .select()
        .from(familyMembers)
        .innerJoin(users, eq(familyMembers.userId, users.id))
        .where(eq(familyMembers.id, input.memberId))
        .limit(1);

      if (!member) {
        throw new Error("Member not found");
      }

      return member;
    }),

  // Resend invitation
  resendInvite: procedure
    .input(resendInviteSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      const [invitation] = await ctx.db
        .select()
        .from(familyInvitations)
        .where(eq(familyInvitations.id, input.invitationId))
        .limit(1);

      if (!invitation) {
        throw new Error("Invitation not found");
      }

      // Verify user is admin of the family
      const [adminMembership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, invitation.familyId),
            eq(familyMembers.userId, ctx.user.id),
            eq(familyMembers.role, "admin")
          )
        )
        .limit(1);

      if (!adminMembership) {
        throw new Error("Only family admins can resend invitations");
      }

      // Check if invitation is already accepted or cancelled
      if (invitation.acceptedAt) {
        throw new Error("Cannot resend an already accepted invitation");
      }

      if (invitation.status === "cancelled") {
        throw new Error("Cannot resend a cancelled invitation");
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const [updatedInvitation] = await ctx.db
        .update(familyInvitations)
        .set({
          status: "resent",
          inviteExpiresAt: expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(familyInvitations.id, input.invitationId))
        .returning();

      // Log the invitation resend
      await logAction({
        actionType: "RESEND_INVITE",
        actorId: ctx.user.id,
        targetId: input.invitationId,
        targetType: "invitation",
        description: `Admin ${ctx.user.id} resent invite to ${invitation.email}`,
        metadata: {
          familyId: invitation.familyId,
          email: invitation.email,
          invitationId: input.invitationId,
          newExpiresAt: expiresAt.toISOString(),
        },
      });

      return updatedInvitation;
    }),

  // Update member names
  updateMemberNames: procedure
    .input(updateMemberNamesSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Verify user is member of the family
      const [userMembership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!userMembership) {
        throw new Error("You are not a member of this family");
      }

      // Verify the member exists in the family
      const [memberToUpdate] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.id, input.memberId),
            eq(familyMembers.familyId, input.familyId)
          )
        )
        .limit(1);

      if (!memberToUpdate) {
        throw new Error("Member not found in this family");
      }

      // Update member names
      const [updatedMember] = await ctx.db
        .update(familyMembers)
        .set({
          firstName: input.firstName,
          lastName: input.lastName,
          updatedAt: new Date(),
        })
        .where(eq(familyMembers.id, input.memberId))
        .returning();

      return {
        member: updatedMember,
        message: "Member names updated successfully",
      };
    }),

  // Deactivate member
  deactivateMember: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
        memberId: z.string().uuid(),
      })
    )
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
        throw new Error("Only family admins can deactivate members");
      }

      // Get member to deactivate
      const [memberToDeactivate] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.id, input.memberId),
            eq(familyMembers.familyId, input.familyId)
          )
        )
        .limit(1);

      if (!memberToDeactivate) {
        throw new Error("Member not found in this family");
      }

      if (memberToDeactivate.status === "inactive") {
        throw new Error("Member is already deactivated");
      }

      // Update member status to inactive
      const [deactivatedMember] = await ctx.db
        .update(familyMembers)
        .set({
          status: "inactive",
          updatedAt: new Date(),
        })
        .where(eq(familyMembers.id, input.memberId))
        .returning();

      // Log the action
      await logAction({
        actionType: "DEACTIVATE_MEMBER",
        actorId: ctx.user.id,
        targetId: input.memberId,
        targetType: "member",
        description: `Admin ${ctx.user.id} deactivated member ${input.memberId} in family ${input.familyId}`,
        metadata: {
          familyId: input.familyId,
          memberId: input.memberId,
          previousStatus: memberToDeactivate.status,
        },
      });

      return {
        member: deactivatedMember,
        message: "Member deactivated successfully",
      };
    }),

  // Reactivate member
  reactivateMember: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
        memberId: z.string().uuid(),
      })
    )
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
        throw new Error("Only family admins can reactivate members");
      }

      // Get member to reactivate
      const [memberToReactivate] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.id, input.memberId),
            eq(familyMembers.familyId, input.familyId)
          )
        )
        .limit(1);

      if (!memberToReactivate) {
        throw new Error("Member not found in this family");
      }

      if (memberToReactivate.status === "active") {
        throw new Error("Member is already active");
      }

      // Update member status to active
      const [reactivatedMember] = await ctx.db
        .update(familyMembers)
        .set({
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(familyMembers.id, input.memberId))
        .returning();

      // Log the action
      await logAction({
        actionType: "REACTIVATE_MEMBER",
        actorId: ctx.user.id,
        targetId: input.memberId,
        targetType: "member",
        description: `Admin ${ctx.user.id} reactivated member ${input.memberId} in family ${input.familyId}`,
        metadata: {
          familyId: input.familyId,
          memberId: input.memberId,
          previousStatus: memberToReactivate.status,
        },
      });

      return {
        member: reactivatedMember,
        message: "Member reactivated successfully",
      };
    }),

  // Cancel/revoke invitation
  cancelInvite: procedure
    .input(
      z.object({
        invitationId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      const [invitation] = await ctx.db
        .select()
        .from(familyInvitations)
        .where(eq(familyInvitations.id, input.invitationId))
        .limit(1);

      if (!invitation) {
        throw new Error("Invitation not found");
      }

      // Verify user is admin of the family
      const [adminMembership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, invitation.familyId),
            eq(familyMembers.userId, ctx.user.id),
            eq(familyMembers.role, "admin")
          )
        )
        .limit(1);

      if (!adminMembership) {
        throw new Error("Only family admins can cancel invitations");
      }

      // Check if invitation is already accepted or cancelled
      if (invitation.acceptedAt) {
        throw new Error("Cannot cancel an already accepted invitation");
      }

      if (invitation.status === "cancelled") {
        throw new Error("Invitation is already cancelled");
      }

      // Update invitation status to cancelled
      const [updatedInvitation] = await ctx.db
        .update(familyInvitations)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(familyInvitations.id, input.invitationId))
        .returning();

      // Log the action
      await logAction({
        actionType: "CANCEL_INVITE",
        actorId: ctx.user.id,
        targetId: input.invitationId,
        targetType: "invitation",
        description: `Admin ${ctx.user.id} cancelled invite to ${invitation.email}`,
        metadata: {
          familyId: invitation.familyId,
          email: invitation.email,
          invitationId: input.invitationId,
        },
      });

      return {
        invitation: updatedInvitation,
        message: "Invitation cancelled successfully",
      };
    }),

  // Get pending invitations for admin dashboard
  getPendingInvitations: procedure
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
      const [adminMembership] = await ctx.db
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

      if (!adminMembership) {
        throw new Error("Only family admins can view pending invitations");
      }

      // Get all non-cancelled invitations
      const invitations = await ctx.db
        .select()
        .from(familyInvitations)
        .where(
          and(
            eq(familyInvitations.familyId, input.familyId)
          )
        );

      // Filter based on status and acceptance
      const pending = invitations.filter(
        (inv) =>
          (inv.status === "pending" || inv.status === "resent") &&
          !inv.acceptedAt
      );

      const accepted = invitations.filter((inv) => inv.acceptedAt);
      const cancelled = invitations.filter((inv) => inv.status === "cancelled");

      return {
        pending,
        accepted,
        cancelled,
        total: invitations.length,
      };
    }),

  // Get invitation history for audit trail
  getInvitationHistory: procedure
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
      const [adminMembership] = await ctx.db
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

      if (!adminMembership) {
        throw new Error("Only family admins can view invitation history");
      }

      // Get all invitations sorted by creation date descending
      const invitations = await ctx.db
        .select()
        .from(familyInvitations)
        .where(eq(familyInvitations.familyId, input.familyId));

      // Sort by creation date, most recent first
      const sorted = invitations.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      return {
        invitations: sorted,
        total: sorted.length,
      };
    }),

});
