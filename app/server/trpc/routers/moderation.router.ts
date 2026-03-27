import { z } from "zod";
import { router, procedure } from "../trpc";
import { mediaModeration, auditLog, mediaItems, familyMembers } from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import { logAction } from "../../../utils/auditLog.server";

// Alias for clarity
const media = mediaItems;

// Zod schemas for validation
const approveMediaSchema = z.object({
  mediaId: z.string(),
});

const rejectMediaSchema = z.object({
  mediaId: z.string(),
  reason: z.string().min(1, "Rejection reason is required").optional(),
});

const deleteMediaSchema = z.object({
  mediaId: z.string(),
  confirmed: z.boolean().default(false),
});

const getMediaQueueSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});

export const moderationRouter = router({
  // Approve media
  approveMedia: procedure
    .input(approveMediaSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Verify user is admin of a family
      const [userMembership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.userId, ctx.user.id),
            eq(familyMembers.role, "admin")
          )
        )
        .limit(1);

      if (!userMembership) {
        throw new Error("Only admins can approve media");
      }

      // Check media exists
      const [mediaRecord] = await ctx.db
        .select()
        .from(media)
        .where(eq(media.id, input.mediaId))
        .limit(1);

      if (!mediaRecord) {
        throw new Error("Media not found");
      }

      // Check moderation record exists
      const [existingModeration] = await ctx.db
        .select()
        .from(mediaModeration)
        .where(eq(mediaModeration.mediaId, input.mediaId))
        .limit(1);

      if (existingModeration && existingModeration.status === "approved") {
        throw new Error(
          "This media has already been approved. No further moderation is needed."
        );
      }

      // Create or update moderation record
      if (existingModeration) {
        await ctx.db
          .update(mediaModeration)
          .set({
            status: "approved",
            moderatorId: ctx.user.id,
            moderationTimestamp: new Date(),
          })
          .where(eq(mediaModeration.id, existingModeration.id));
      } else {
        await ctx.db.insert(mediaModeration).values({
          mediaId: input.mediaId,
          status: "approved",
          moderatorId: ctx.user.id,
          moderationTimestamp: new Date(),
        });
      }

      // Log the action
      await logAction({
        actionType: "APPROVE_MEDIA",
        actorId: ctx.user.id,
        targetId: input.mediaId,
        targetType: "media",
        description: `Admin ${ctx.user.id} approved media ${input.mediaId}`,
        metadata: {
          mediaId: input.mediaId,
          previousStatus: existingModeration?.status,
        },
      });

      return { success: true, message: "Media approved successfully" };
    }),

  // Reject media
  rejectMedia: procedure
    .input(rejectMediaSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Verify user is admin of a family
      const [userMembership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.userId, ctx.user.id),
            eq(familyMembers.role, "admin")
          )
        )
        .limit(1);

      if (!userMembership) {
        throw new Error("Only admins can reject media");
      }

      // Check media exists
      const [mediaRecord] = await ctx.db
        .select()
        .from(media)
        .where(eq(media.id, input.mediaId))
        .limit(1);

      if (!mediaRecord) {
        throw new Error("Media not found");
      }

      // Check moderation record exists
      const [existingModeration] = await ctx.db
        .select()
        .from(mediaModeration)
        .where(eq(mediaModeration.mediaId, input.mediaId))
        .limit(1);

      // Create or update moderation record
      if (existingModeration) {
        await ctx.db
          .update(mediaModeration)
          .set({
            status: "rejected",
            moderatorId: ctx.user.id,
            moderationNotes: input.reason || existingModeration.moderationNotes,
            moderationTimestamp: new Date(),
          })
          .where(eq(mediaModeration.id, existingModeration.id));
      } else {
        await ctx.db.insert(mediaModeration).values({
          mediaId: input.mediaId,
          status: "rejected",
          moderatorId: ctx.user.id,
          moderationNotes: input.reason,
          moderationTimestamp: new Date(),
        });
      }

      // Log the action
      await logAction({
        actionType: "REJECT_MEDIA",
        actorId: ctx.user.id,
        targetId: input.mediaId,
        targetType: "media",
        description: `Admin ${ctx.user.id} rejected media ${input.mediaId}`,
        metadata: {
          mediaId: input.mediaId,
          reason: input.reason,
          previousStatus: existingModeration?.status,
        },
      });

      return { success: true, message: "Media rejected successfully" };
    }),

  // Delete media
  deleteMedia: procedure
    .input(deleteMediaSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Verify user is admin of a family
      const [userMembership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.userId, ctx.user.id),
            eq(familyMembers.role, "admin")
          )
        )
        .limit(1);

      if (!userMembership) {
        throw new Error("Only admins can delete media");
      }

      if (!input.confirmed) {
        throw new Error(
          "Deletion must be confirmed. Please pass confirmed: true"
        );
      }

      // Check media exists
      const [mediaRecord] = await ctx.db
        .select()
        .from(media)
        .where(eq(media.id, input.mediaId))
        .limit(1);

      if (!mediaRecord) {
        throw new Error("Media not found");
      }

      // Delete moderation record if exists
      await ctx.db
        .delete(mediaModeration)
        .where(eq(mediaModeration.mediaId, input.mediaId));

      // Delete media
      await ctx.db.delete(media).where(eq(media.id, input.mediaId));

      // Log the action
      await logAction({
        actionType: "DELETE_MEDIA",
        actorId: ctx.user.id,
        targetId: input.mediaId,
        targetType: "media",
        description: `Admin ${ctx.user.id} deleted media ${input.mediaId}`,
        metadata: {
          mediaId: input.mediaId,
          mediaType: mediaRecord.type,
        },
      });

      return { success: true, message: "Media deleted successfully" };
    }),

  // Get media queue for moderation
  getMediaQueue: procedure
    .input(getMediaQueueSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Verify user is admin of a family
      const [userMembership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.userId, ctx.user.id),
            eq(familyMembers.role, "admin")
          )
        )
        .limit(1);

      if (!userMembership) {
        throw new Error("Only admins can view media queue");
      }

      // Get total count
      const countResult = await ctx.db
        .select()
        .from(mediaModeration)
        .where(eq(mediaModeration.status, input.status));

      const totalCount = countResult.length;

      // Calculate pagination
      const page = input.page;
      const limit = input.limit;
      const offset = (page - 1) * limit;

      // Fetch paginated media with moderation details
      const queueItems = await ctx.db
        .select()
        .from(mediaModeration)
        .innerJoin(media, eq(mediaModeration.mediaId, media.id))
        .where(eq(mediaModeration.status, input.status))
        .limit(limit)
        .offset(offset);

      return {
        items: queueItems,
        pagination: {
          page,
          limit,
          offset,
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    }),

  // Get audit log for moderation actions
  getAuditLog: procedure
    .input(
      z.object({
        actionType: z.string().optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Verify user is admin of a family
      const [userMembership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.userId, ctx.user.id),
            eq(familyMembers.role, "admin")
          )
        )
        .limit(1);

      if (!userMembership) {
        throw new Error("Only admins can view audit logs");
      }

      // Build query
      let query = ctx.db.select().from(auditLog);

      if (input.actionType) {
        query = query.where(eq(auditLog.actionType, input.actionType)) as any;
      }

      const logs = await query;
      const totalCount = logs.length;

      // Calculate pagination
      const page = input.page;
      const limit = input.limit;
      const offset = (page - 1) * limit;

      const paginatedLogs = logs.slice(offset, offset + limit);

      return {
        logs: paginatedLogs,
        pagination: {
          page,
          limit,
          offset,
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    }),
});
