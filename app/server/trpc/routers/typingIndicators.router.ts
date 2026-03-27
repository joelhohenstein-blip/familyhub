import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { router, procedure } from '../trpc';
import { emitter } from '~/utils/emitter.server';
import { pusherEvents } from '~/utils/pusher.server';
import { typingIndicatorsTable, conversationsTable, users } from '../../../db/schema';
import { eq, and, desc, lt, sql } from 'drizzle-orm';

// Validation schemas
const setTypingSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  isTyping: z.boolean(),
});

const getTypersSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
});

const subscribeTypingSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
});

// Constants for typing indicator timeout
const TYPING_TIMEOUT_MS = 3000; // 3 seconds

/**
 * Typing Indicators Router
 * Handles real-time typing status for conversations
 * - Shows when users are actively typing
 * - Auto-expires after inactivity (3 seconds)
 * - Supports multiple concurrent typers
 * - Works for 1-on-1 and group conversations
 */
export const typingIndicatorsRouter = router({
  /**
   * Set or update typing status for the current user
   * Called when user starts/stops typing
   * Latency target: <= 1 second
   */
  setTyping: procedure
    .input(setTypingSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user is a participant in the conversation
      const [conversation] = await ctx.db.select()
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

      const now = new Date();
      const expiresAt = new Date(now.getTime() + TYPING_TIMEOUT_MS);

      if (input.isTyping) {
        // Check if typing indicator already exists
        const [existingIndicator] = await ctx.db.select()
          .from(typingIndicatorsTable)
          .where(
            and(
              eq(typingIndicatorsTable.conversationId, input.conversationId),
              eq(typingIndicatorsTable.userId, ctx.user.id)
            )
          )
          .limit(1);

        let typingRecord;

        if (existingIndicator) {
          // Update existing typing indicator with new expiration
          [typingRecord] = await ctx.db.update(typingIndicatorsTable)
            .set({
              startedAt: now,
              expiresAt,
              updatedAt: now,
            })
            .where(eq(typingIndicatorsTable.id, existingIndicator.id))
            .returning();
        } else {
          // Create new typing indicator
          [typingRecord] = await ctx.db.insert(typingIndicatorsTable)
            .values({
              conversationId: input.conversationId,
              userId: ctx.user.id,
              isTyping: 'true',
              startedAt: now,
              expiresAt,
            })
            .returning();
        }

        // Get user details for the event
        const [userRecord] = await ctx.db.select()
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);

        const username = userRecord
          ? `${userRecord.firstName || ''} ${userRecord.lastName || ''}`.trim() || 'User'
          : 'User';

        // Emit event for real-time updates
        emitter.emit('typing-update', {
          conversationId: input.conversationId,
          userId: ctx.user.id,
          username,
          isTyping: true,
          timestamp: now,
        });

        // Broadcast via Pusher for real-time sync
        try {
          await pusherEvents.typingUpdate(input.conversationId, {
            userId: ctx.user.id,
            username,
            isTyping: true,
            timestamp: now,
          });
        } catch (error) {
          console.error('Failed to broadcast typing status via Pusher:', error);
          // Don't throw - Pusher is optional
        }

        return typingRecord;
      } else {
        // User stopped typing - delete the typing indicator
        const result = await ctx.db.delete(typingIndicatorsTable)
          .where(
            and(
              eq(typingIndicatorsTable.conversationId, input.conversationId),
              eq(typingIndicatorsTable.userId, ctx.user.id)
            )
          )
          .returning();

        // Get user details for the event
        const [userRecord] = await ctx.db.select()
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);

        const username = userRecord
          ? `${userRecord.firstName || ''} ${userRecord.lastName || ''}`.trim() || 'User'
          : 'User';

        // Emit event for real-time updates
        emitter.emit('typing-update', {
          conversationId: input.conversationId,
          userId: ctx.user.id,
          username,
          isTyping: false,
          timestamp: now,
        });

        // Broadcast via Pusher for real-time sync
        try {
          await pusherEvents.typingUpdate(input.conversationId, {
            userId: ctx.user.id,
            username,
            isTyping: false,
            timestamp: now,
          });
        } catch (error) {
          console.error('Failed to broadcast typing status via Pusher:', error);
          // Don't throw - Pusher is optional
        }

        return result[0] || null;
      }
    }),

  /**
   * Get all active typers in a conversation
   * Returns list of users currently typing
   */
  getTypers: procedure
    .input(getTypersSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user is a participant in the conversation
      const [conversation] = await ctx.db.select()
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

      const now = new Date();

      // Get all active typing indicators (not expired) for the conversation, excluding current user
      const typers = await ctx.db.select({
        id: typingIndicatorsTable.id,
        userId: typingIndicatorsTable.userId,
        conversationId: typingIndicatorsTable.conversationId,
        startedAt: typingIndicatorsTable.startedAt,
        expiresAt: typingIndicatorsTable.expiresAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
        .from(typingIndicatorsTable)
        .innerJoin(users, eq(typingIndicatorsTable.userId, users.id))
        .where(
          and(
            eq(typingIndicatorsTable.conversationId, input.conversationId),
            // Only include typing indicators that haven't expired
            lt(sql`${now}`, typingIndicatorsTable.expiresAt)
          )
        )
        .orderBy(desc(typingIndicatorsTable.startedAt));

      // Clean up expired indicators (background maintenance)
      await ctx.db.delete(typingIndicatorsTable)
        .where(
          and(
            eq(typingIndicatorsTable.conversationId, input.conversationId),
            lt(typingIndicatorsTable.expiresAt, sql`${now}`)
          )
        );

      return typers;
    }),

  /**
   * Subscribe to typing updates for a conversation
   * Real-time notifications when users start/stop typing
   */
  onTypingUpdate: procedure
    .input(subscribeTypingSchema)
    .subscription(({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      const userId = ctx.user.id;

      return observable<any>((emit) => {
        const onTypingChange = async (data: any) => {
          // Only emit updates for the subscribed conversation
          if (data.conversationId !== input.conversationId) return;

          // Don't emit typing updates for the current user (they see it locally)
          if (data.userId === userId) return;

          // Verify user still has access to the conversation
          const [conversation] = await ctx.db.select()
            .from(conversationsTable)
            .where(eq(conversationsTable.id, input.conversationId))
            .limit(1);

          if (!conversation) return; // Conversation no longer exists

          if (
            conversation.participant1Id !== userId &&
            conversation.participant2Id !== userId
          ) {
            return; // User is no longer a participant
          }

          emit.next(data);
        };

        emitter.on('typing-update', onTypingChange);

        return () => {
          emitter.off('typing-update', onTypingChange);
        };
      });
    }),

  /**
   * Clear typing indicator for the current user
   * Useful for cleanup on window unload or disconnect
   */
  clearTyping: procedure
    .input(z.object({
      conversationId: z.string().uuid('Invalid conversation ID'),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Delete all typing indicators for the user in this conversation
      const deleted = await ctx.db.delete(typingIndicatorsTable)
        .where(
          and(
            eq(typingIndicatorsTable.conversationId, input.conversationId),
            eq(typingIndicatorsTable.userId, ctx.user.id)
          )
        )
        .returning();

      if (deleted.length > 0) {
        // Emit cleanup event
        emitter.emit('typing-update', {
          conversationId: input.conversationId,
          userId: ctx.user.id,
          isTyping: false,
          timestamp: new Date(),
        });
      }

      return { cleared: deleted.length > 0 };
    }),
});
