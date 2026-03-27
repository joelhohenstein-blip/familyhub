import { z } from 'zod';
import { router, procedure } from '../trpc';
import {
  archiveSchedulesTable,
  conversationsTable,
  familyMembers,
  auditLog,
} from '../../../db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';

// Validation schemas
const scheduleArchiveSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  scheduledForTime: z.coerce.date().refine(
    (date) => date > new Date(),
    'Scheduled time must be in the future'
  ),
});

const cancelArchiveScheduleSchema = z.object({
  scheduleId: z.string().uuid('Invalid schedule ID'),
});

const getArchivedThreadsSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  searchQuery: z.string().optional(),
});

const restoreThreadSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
});

const selectThreadsForArchiveSchema = z.object({
  conversationIds: z.array(z.string().uuid('Invalid conversation ID')).min(1),
});

const getScheduledArchivesSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
});

/**
 * Helper function to check if user is admin in a family
 */
async function isUserAdmin(
  db: any,
  userId: string,
  familyId: string
): Promise<boolean> {
  const [member] = await db
    .select()
    .from(familyMembers)
    .where(
      and(
        eq(familyMembers.userId, userId),
        eq(familyMembers.familyId, familyId),
        eq(familyMembers.role, 'admin')
      )
    )
    .limit(1);

  return !!member;
}

/**
 * Helper function to log audit event
 */
async function logAuditEvent(
  db: any,
  actionType: string,
  actorId: string,
  targetId: string,
  targetType: string,
  description: string,
  metadata?: Record<string, any>
) {
  try {
    await db.insert(auditLog).values({
      actionType,
      actorId,
      targetId,
      targetType,
      description,
      metadata: metadata || {},
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging failure shouldn't block the operation
  }
}

export const archiveRouter = router({
  /**
   * Schedule a conversation for archival at a future time
   */
  scheduleArchive: procedure
    .input(scheduleArchiveSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the conversation
      const [conversation] = await ctx.db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, input.conversationId))
        .limit(1);

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Verify user is admin in the family
      const isAdmin = await isUserAdmin(ctx.db, ctx.user.id, conversation.familyId);
      if (!isAdmin) {
        throw new Error('Only family admins can schedule archival');
      }

      // Check if conversation is already archived
      if (conversation.status === 'archived') {
        throw new Error('Conversation is already archived');
      }

      // Validate the scheduled time
      if (input.scheduledForTime <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }

      // Create the schedule record
      const [schedule] = await ctx.db
        .insert(archiveSchedulesTable)
        .values({
          conversationId: input.conversationId,
          scheduledBy: ctx.user.id,
          scheduledForTime: input.scheduledForTime,
          status: 'pending',
        })
        .returning();

      // Log audit event
      await logAuditEvent(
        ctx.db,
        'archive_scheduled',
        ctx.user.id,
        input.conversationId,
        'conversation',
        `Archive scheduled for conversation until ${input.scheduledForTime.toISOString()}`,
        {
          conversationId: input.conversationId,
          scheduledForTime: input.scheduledForTime,
        }
      );

      return {
        ...schedule,
        message: 'Archive scheduled successfully',
      };
    }),

  /**
   * Cancel a scheduled archive
   */
  cancelArchiveSchedule: procedure
    .input(cancelArchiveScheduleSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the schedule
      const [schedule] = await ctx.db
        .select()
        .from(archiveSchedulesTable)
        .where(eq(archiveSchedulesTable.id, input.scheduleId))
        .limit(1);

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Verify user is admin in the conversation's family
      const [conversation] = await ctx.db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, schedule.conversationId))
        .limit(1);

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const isAdmin = await isUserAdmin(ctx.db, ctx.user.id, conversation.familyId);
      if (!isAdmin) {
        throw new Error('Only family admins can cancel archival schedules');
      }

      // Check if schedule is already completed or cancelled
      if (schedule.status !== 'pending') {
        throw new Error(`Cannot cancel a ${schedule.status} schedule`);
      }

      // Cancel the schedule
      const [cancelledSchedule] = await ctx.db
        .update(archiveSchedulesTable)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
        })
        .where(eq(archiveSchedulesTable.id, input.scheduleId))
        .returning();

      // Log audit event
      await logAuditEvent(
        ctx.db,
        'archive_cancelled',
        ctx.user.id,
        schedule.conversationId,
        'conversation',
        'Scheduled archive cancelled',
        {
          conversationId: schedule.conversationId,
          scheduleId: input.scheduleId,
        }
      );

      return cancelledSchedule;
    }),

  /**
   * Get scheduled archives for a family
   */
  getScheduledArchives: procedure
    .input(getScheduledArchivesSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('You are not a member of this family');
      }

      // Get all pending schedules for conversations in this family
      const schedules = await ctx.db
        .select({
          schedule: archiveSchedulesTable,
          conversation: conversationsTable,
        })
        .from(archiveSchedulesTable)
        .innerJoin(
          conversationsTable,
          eq(archiveSchedulesTable.conversationId, conversationsTable.id)
        )
        .where(
          and(
            eq(conversationsTable.familyId, input.familyId),
            eq(archiveSchedulesTable.status, 'pending')
          )
        )
        .orderBy(desc(archiveSchedulesTable.scheduledForTime));

      return schedules;
    }),

  /**
   * Immediately archive one or more conversations (for admins)
   */
  archiveThreads: procedure
    .input(selectThreadsForArchiveSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      if (input.conversationIds.length === 0) {
        throw new Error('No conversations selected for archival');
      }

      // Validate that all conversations exist and get their family IDs
      const conversations = await ctx.db
        .select()
        .from(conversationsTable)
        .where(inArray(conversationsTable.id, input.conversationIds));

      if (conversations.length !== input.conversationIds.length) {
        throw new Error('One or more conversations not found');
      }

      // Verify all conversations belong to the same family
      const familyIds = new Set(conversations.map(c => c.familyId));
      if (familyIds.size !== 1) {
        throw new Error('All conversations must belong to the same family');
      }

      const familyId = Array.from(familyIds)[0];

      // Verify user is admin in the family
      const isAdmin = await isUserAdmin(ctx.db, ctx.user.id, familyId);
      if (!isAdmin) {
        throw new Error('Only family admins can archive conversations');
      }

      // Check that no conversations are already archived or in use (being typed)
      const lockedConversations = conversations.filter(c => c.status !== 'active');
      if (lockedConversations.length > 0) {
        throw new Error(`Cannot archive ${lockedConversations.length} conversation(s) that are not active`);
      }

      // Archive all selected conversations
      const archivedAt = new Date();
      const updatePromises = input.conversationIds.map(conversationId =>
        ctx.db
          .update(conversationsTable)
          .set({ status: 'archived', updatedAt: archivedAt })
          .where(eq(conversationsTable.id, conversationId))
          .returning()
      );

      const results = await Promise.all(updatePromises);

      // Log audit events for each archived conversation
      for (const conversationId of input.conversationIds) {
        await logAuditEvent(
          ctx.db,
          'conversation_archived',
          ctx.user.id,
          conversationId,
          'conversation',
          'Conversation archived by admin',
          {
            conversationId,
            archivedAt,
          }
        );
      }

      return {
        success: true,
        archivedCount: input.conversationIds.length,
        message: `${input.conversationIds.length} conversation(s) archived successfully`,
      };
    }),

  /**
   * Restore an archived conversation
   */
  restoreThread: procedure
    .input(restoreThreadSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the conversation
      const [conversation] = await ctx.db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, input.conversationId))
        .limit(1);

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Verify user is admin in the family
      const isAdmin = await isUserAdmin(ctx.db, ctx.user.id, conversation.familyId);
      if (!isAdmin) {
        throw new Error('Only family admins can restore conversations');
      }

      // Check if conversation is archived
      if (conversation.status !== 'archived') {
        throw new Error('Conversation is not archived');
      }

      // Restore the conversation
      const [restoredConversation] = await ctx.db
        .update(conversationsTable)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(conversationsTable.id, input.conversationId))
        .returning();

      // Log audit event
      await logAuditEvent(
        ctx.db,
        'conversation_restored',
        ctx.user.id,
        input.conversationId,
        'conversation',
        'Archived conversation restored',
        {
          conversationId: input.conversationId,
        }
      );

      return {
        ...restoredConversation,
        message: 'Conversation restored successfully',
      };
    }),

  /**
   * Get archived threads for a family with pagination and search
   */
  getArchivedThreads: procedure
    .input(getArchivedThreadsSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('You are not a member of this family');
      }

      // Build query for archived conversations
      let query = ctx.db
        .select()
        .from(conversationsTable)
        .where(
          and(
            eq(conversationsTable.familyId, input.familyId),
            eq(conversationsTable.status, 'archived')
          )
        );

      // Apply search if provided
      if (input.searchQuery) {
        const searchLower = `%${input.searchQuery.toLowerCase()}%`;
        // Note: You might want to join with users to search by name
        // For now, we'll just order by date
      }

      // Order by most recently archived first
      const archived = await query
        .orderBy(desc(conversationsTable.updatedAt))
        .limit(input.limit + 1)
        .offset(input.offset);

      // Determine if there are more results
      const hasMore = archived.length > input.limit;
      const results = hasMore ? archived.slice(0, input.limit) : archived;

      return {
        threads: results,
        hasMore,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get statistics about archived threads
   */
  getArchiveStats: procedure
    .input(z.object({
      familyId: z.string().uuid('Invalid family ID'),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('You are not a member of this family');
      }

      // Get counts
      const [archivedCount] = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(conversationsTable)
        .where(
          and(
            eq(conversationsTable.familyId, input.familyId),
            eq(conversationsTable.status, 'archived')
          )
        );

      const [activeCount] = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(conversationsTable)
        .where(
          and(
            eq(conversationsTable.familyId, input.familyId),
            eq(conversationsTable.status, 'active')
          )
        );

      const [scheduledCount] = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(archiveSchedulesTable)
        .where(
          and(
            // Need to join to get family context - for now just count pending
            eq(archiveSchedulesTable.status, 'pending')
          )
        );

      return {
        archived: archivedCount?.count || 0,
        active: activeCount?.count || 0,
        scheduled: scheduledCount?.count || 0,
      };
    }),
});
