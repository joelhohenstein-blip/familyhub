import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { router, procedure } from '../trpc';
import { emitter } from '~/utils/emitter.server';
import { pusherEvents } from '~/utils/pusher.server';
import { conversationsTable, conversationMessagesTable, familyMembers, users, pinnedMessagesTable } from '../../../db/schema';
import { eq, desc, and, or, inArray, sql, isNull } from 'drizzle-orm';

// Validation schemas
const startConversationSchema = z.object({
  otherUserId: z.string().uuid('Invalid user ID'),
  familyId: z.string().uuid('Invalid family ID'),
});

const sendMessageSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message must be less than 5000 characters'),
});

const markAsReadSchema = z.object({
  messageId: z.string().uuid('Invalid message ID'),
});

const getConversationsSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
});

const getMessagesSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const onConversationUpdateSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
});

const onReactionsUpdateSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
});

export const conversationsRouter = router({
  /**
   * Start a new 1-on-1 conversation
   */
  startConversation: procedure
    .input(startConversationSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Prevent starting conversation with self
      if (input.otherUserId === ctx.user.id) {
        throw new Error('Cannot start a conversation with yourself');
      }

      // Verify both users are members of the family
      const [currentUserMembership] = await ctx.db.select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!currentUserMembership) {
        throw new Error('You are not a member of this family');
      }

      const [otherUserMembership] = await ctx.db.select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, input.otherUserId)
          )
        )
        .limit(1);

      if (!otherUserMembership) {
        throw new Error('The other user is not a member of this family');
      }

      // Check if conversation already exists (using sorted participant IDs)
      const participant1Id = input.otherUserId < ctx.user.id ? input.otherUserId : ctx.user.id;
      const participant2Id = input.otherUserId < ctx.user.id ? ctx.user.id : input.otherUserId;

      const [existingConversation] = await ctx.db.select()
        .from(conversationsTable)
        .where(
          and(
            eq(conversationsTable.participant1Id, participant1Id),
            eq(conversationsTable.participant2Id, participant2Id),
            eq(conversationsTable.familyId, input.familyId)
          )
        )
        .limit(1);

      if (existingConversation) {
        return existingConversation;
      }

      // Create new conversation
      const [newConversation] = await ctx.db.insert(conversationsTable)
        .values({
          participant1Id,
          participant2Id,
          familyId: input.familyId,
          status: 'active',
        })
        .returning();

      // Emit event for real-time updates
      emitter.emit('conversation-created', {
        conversationId: newConversation.id,
        participants: [participant1Id, participant2Id],
        familyId: input.familyId,
      });

      // Broadcast via Pusher for real-time sync
      try {
        await pusherEvents.conversationCreated(input.familyId, newConversation, input.otherUserId);
      } catch (error) {
        console.error('Failed to broadcast conversation creation via Pusher:', error);
        // Don't throw - Pusher is optional
      }

      return newConversation;
    }),

  /**
   * Send a message in a conversation
   */
  sendMessage: procedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the conversation and verify user is a participant
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

      if (conversation.status !== 'active') {
        throw new Error('Cannot send message to an archived conversation');
      }

      // Trim content
      const trimmedContent = input.content.trim();

      // Create the message
      const [newMessage] = await ctx.db.insert(conversationMessagesTable)
        .values({
          conversationId: input.conversationId,
          senderId: ctx.user.id,
          content: trimmedContent,
          status: 'sent',
        })
        .returning();

      // Emit event for real-time updates
      emitter.emit('conversation-message', {
        conversationId: input.conversationId,
        message: newMessage,
      });

      // Broadcast via Pusher for real-time sync
      try {
        await pusherEvents.conversationMessage(input.conversationId, newMessage);
      } catch (error) {
        console.error('Failed to broadcast message via Pusher:', error);
        // Don't throw - Pusher is optional
      }

      return newMessage;
    }),

  /**
   * Mark a message as read
   */
  markAsRead: procedure
    .input(markAsReadSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the message and verify it's for the current user
      const [message] = await ctx.db.select()
        .from(conversationMessagesTable)
        .where(eq(conversationMessagesTable.id, input.messageId))
        .limit(1);

      if (!message) {
        throw new Error('Message not found');
      }

      // Can only mark messages from other users as read
      if (message.senderId === ctx.user.id) {
        throw new Error('Cannot mark your own messages as read');
      }

      // Get conversation to verify user is a participant
      const [conversation] = await ctx.db.select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, message.conversationId))
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

      // Update message status and readAt timestamp
      const [updatedMessage] = await ctx.db.update(conversationMessagesTable)
        .set({
          status: 'read',
          readAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(conversationMessagesTable.id, input.messageId))
        .returning();

      // Emit event for real-time updates
      emitter.emit('message-read', {
        conversationId: message.conversationId,
        messageId: input.messageId,
        readBy: ctx.user.id,
      });

      // Broadcast via Pusher for real-time sync
      try {
        await pusherEvents.messageRead(message.conversationId, input.messageId, ctx.user.id);
      } catch (error) {
        console.error('Failed to broadcast message read receipt via Pusher:', error);
        // Don't throw - Pusher is optional
      }

      return updatedMessage;
    }),

  /**
   * Get all conversations for the current user in a family
   */
  getConversations: procedure
    .input(getConversationsSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db.select()
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

      // Get conversations where user is a participant
      const conversations = await ctx.db.select()
        .from(conversationsTable)
        .where(
          and(
            eq(conversationsTable.familyId, input.familyId),
            or(
              eq(conversationsTable.participant1Id, ctx.user.id),
              eq(conversationsTable.participant2Id, ctx.user.id)
            ),
            eq(conversationsTable.status, 'active')
          )
        )
        .orderBy(desc(conversationsTable.updatedAt));

      // Enrich with other participant info and last message
      const conversationsWithDetails = await Promise.all(
        conversations.map(async (conversation) => {
          const otherParticipantId =
            conversation.participant1Id === ctx.user!.id
              ? conversation.participant2Id
              : conversation.participant1Id;

          const [otherParticipant] = await ctx.db.select()
            .from(users)
            .where(eq(users.id, otherParticipantId));

          // Get last message
          const [lastMessage] = await ctx.db.select()
            .from(conversationMessagesTable)
            .where(eq(conversationMessagesTable.conversationId, conversation.id))
            .orderBy(desc(conversationMessagesTable.createdAt))
            .limit(1);

          return {
            ...conversation,
            otherParticipant,
            lastMessage,
          };
        })
      );

      return conversationsWithDetails;
    }),

  /**
   * Get messages for a conversation (paginated)
   */
  getMessages: procedure
    .input(getMessagesSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get conversation and verify user is a participant
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

      // Get messages (most recent first, then reverse for display)
      const messages = await ctx.db.select()
        .from(conversationMessagesTable)
        .where(eq(conversationMessagesTable.conversationId, input.conversationId))
        .orderBy(desc(conversationMessagesTable.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Reverse to get chronological order (oldest first)
      return messages.reverse();
    }),

  /**
   * Get pinned messages for a conversation
   */
  getPinnedMessages: procedure
    .input(z.object({
      conversationId: z.string().uuid('Invalid conversation ID'),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get conversation and verify user is a participant
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
   * Subscribe to conversation updates (new messages and read receipts)
   */
  onConversationUpdate: procedure
    .input(onConversationUpdateSchema)
    .subscription(({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      const userId = ctx.user.id;

      return observable<any>((emit) => {
        const onMessage = async (data: any) => {
          // Only emit updates for the subscribed conversation
          if (data.conversationId !== input.conversationId) return;

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

        emitter.on('conversation-message', onMessage);
        emitter.on('message-read', onMessage);

        return () => {
          emitter.off('conversation-message', onMessage);
          emitter.off('message-read', onMessage);
        };
      });
    }),

  /**
   * Subscribe to reaction updates for a conversation
   */
  onReactionsUpdate: procedure
    .input(onReactionsUpdateSchema)
    .subscription(({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      const userId = ctx.user.id;

      return observable<any>((emit) => {
        const onReactionUpdate = async (data: any) => {
          // Get the message to verify conversation
          const [message] = await ctx.db.select()
            .from(conversationMessagesTable)
            .where(eq(conversationMessagesTable.id, data.messageId))
            .limit(1);

          if (!message || message.conversationId !== input.conversationId) {
            return; // Message not in this conversation
          }

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

        emitter.on('reactions-updated', onReactionUpdate);

        return () => {
          emitter.off('reactions-updated', onReactionUpdate);
        };
      });
    }),
});
