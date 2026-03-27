import { z } from 'zod';
import { router, procedure } from '../trpc';
import {
  pinnedMessagesTable,
  conversationMessagesTable,
  conversationsTable,
  familyMembers,
  auditLog,
} from '../../../db/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';

// Validation schemas
const pinMessageSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  messageId: z.string().uuid('Invalid message ID'),
});

const unpinMessageSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  messageId: z.string().uuid('Invalid message ID'),
});

const getPinnedMessagesSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
});

const managePinPermissionsSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  userId: z.string().uuid('Invalid user ID'),
  canPin: z.boolean(),
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

export const messagesRouter = router({
  /**
   * Pin a message in a conversation (admin only)
   */
  pinMessage: procedure
    .input(pinMessageSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the conversation and verify it exists
      const [conversation] = await ctx.db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, input.conversationId))
        .limit(1);

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Check if user is admin in the family
      const isAdmin = await isUserAdmin(ctx.db, ctx.user.id, conversation.familyId);
      if (!isAdmin) {
        throw new Error('Only admins can pin messages');
      }

      // Verify the message exists and belongs to this conversation
      const [message] = await ctx.db
        .select()
        .from(conversationMessagesTable)
        .where(
          and(
            eq(conversationMessagesTable.id, input.messageId),
            eq(conversationMessagesTable.conversationId, input.conversationId)
          )
        )
        .limit(1);

      if (!message) {
        throw new Error('Message not found in this conversation');
      }

      // Check if message is already pinned
      const [existingPin] = await ctx.db
        .select()
        .from(pinnedMessagesTable)
        .where(
          and(
            eq(pinnedMessagesTable.messageId, input.messageId),
            isNull(pinnedMessagesTable.unpinnedAt)
          )
        )
        .limit(1);

      if (existingPin) {
        throw new Error('Message is already pinned');
      }

      // Create the pin record
      const [pinnedMessage] = await ctx.db
        .insert(pinnedMessagesTable)
        .values({
          conversationId: input.conversationId,
          messageId: input.messageId,
          pinnedBy: ctx.user.id,
          pinnedAt: new Date(),
        })
        .returning();

      // Log audit event
      await logAuditEvent(
        ctx.db,
        'message_pinned',
        ctx.user.id,
        input.messageId,
        'message',
        `Message pinned in conversation ${input.conversationId}`,
        {
          conversationId: input.conversationId,
          pinnedAt: pinnedMessage.pinnedAt,
        }
      );

      return pinnedMessage;
    }),

  /**
   * Unpin a message from a conversation (admin only)
   */
  unpinMessage: procedure
    .input(unpinMessageSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the conversation and verify it exists
      const [conversation] = await ctx.db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, input.conversationId))
        .limit(1);

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Check if user is admin in the family
      const isAdmin = await isUserAdmin(ctx.db, ctx.user.id, conversation.familyId);
      if (!isAdmin) {
        throw new Error('Only admins can unpin messages');
      }

      // Verify the message exists and belongs to this conversation
      const [message] = await ctx.db
        .select()
        .from(conversationMessagesTable)
        .where(
          and(
            eq(conversationMessagesTable.id, input.messageId),
            eq(conversationMessagesTable.conversationId, input.conversationId)
          )
        )
        .limit(1);

      if (!message) {
        throw new Error('Message not found in this conversation');
      }

      // Get the pinned record
      const [pinnedRecord] = await ctx.db
        .select()
        .from(pinnedMessagesTable)
        .where(
          and(
            eq(pinnedMessagesTable.messageId, input.messageId),
            isNull(pinnedMessagesTable.unpinnedAt)
          )
        )
        .limit(1);

      if (!pinnedRecord) {
        throw new Error('Message is not currently pinned');
      }

      // Mark as unpinned
      const [unpinnedRecord] = await ctx.db
        .update(pinnedMessagesTable)
        .set({
          unpinnedAt: new Date(),
        })
        .where(eq(pinnedMessagesTable.id, pinnedRecord.id))
        .returning();

      // Log audit event
      await logAuditEvent(
        ctx.db,
        'message_unpinned',
        ctx.user.id,
        input.messageId,
        'message',
        `Message unpinned from conversation ${input.conversationId}`,
        {
          conversationId: input.conversationId,
          unpinnedAt: unpinnedRecord.unpinnedAt,
        }
      );

      return unpinnedRecord;
    }),

  /**
   * Get all pinned messages for a conversation
   */
  getPinnedMessages: procedure
    .input(getPinnedMessagesSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the conversation and verify user is a participant
      const [conversation] = await ctx.db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, input.conversationId))
        .limit(1);

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      if (
        conversation.participant1Id !== ctx.user.id &&
        conversation.participant2Id !== ctx.user.id
      ) {
        throw new Error('You are not a participant in this conversation');
      }

      // Get all pinned messages (not unpinned) ordered by pinnedAt descending
      const pinnedMessages = await ctx.db
        .select()
        .from(pinnedMessagesTable)
        .where(
          and(
            eq(pinnedMessagesTable.conversationId, input.conversationId),
            isNull(pinnedMessagesTable.unpinnedAt)
          )
        )
        .orderBy(desc(pinnedMessagesTable.pinnedAt));

      // Enrich with message details
      const pinnedMessagesWithDetails = await Promise.all(
        pinnedMessages.map(async (pinnedRecord) => {
          const [message] = await ctx.db
            .select()
            .from(conversationMessagesTable)
            .where(eq(conversationMessagesTable.id, pinnedRecord.messageId))
            .limit(1);

          return {
            ...pinnedRecord,
            message,
          };
        })
      );

      return pinnedMessagesWithDetails;
    }),

  /**
   * Manage pin permissions for a user (superadmin only)
   * For now, this is a placeholder - pin permissions are determined by admin role
   */
  managePinPermissions: procedure
    .input(managePinPermissionsSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Check if user is admin in the family
      const isAdmin = await isUserAdmin(ctx.db, ctx.user.id, input.familyId);
      if (!isAdmin) {
        throw new Error('Only admins can manage permissions');
      }

      // Log the permission change
      await logAuditEvent(
        ctx.db,
        'pin_permission_changed',
        ctx.user.id,
        input.userId,
        'user',
        `Pin permission changed for user in family ${input.familyId}`,
        {
          familyId: input.familyId,
          canPin: input.canPin,
        }
      );

      return {
        success: true,
        message: 'Permission updated',
      };
    }),
});
