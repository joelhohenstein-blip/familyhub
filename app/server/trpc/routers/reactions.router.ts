import { z } from "zod";
import { router, procedure } from "../trpc";
import { messageReactions } from "../../../db/schema";
import { conversationMessagesTable } from "../../../db/schema";
import { and, eq } from "drizzle-orm";
import { observable } from "@trpc/server/observable";
import { EventEmitter } from "events";

// Create a global event emitter for real-time updates
const reactionsEventEmitter = new EventEmitter();

export const reactionsRouter = router({
  addReaction: procedure
    .input(
      z.object({
        messageId: z.string().uuid(),
        emoji: z.string().max(50),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const { db } = ctx;
      const userId = ctx.session.user.id;

      // Check if reaction already exists
      const existingReaction = await db
        .select()
        .from(messageReactions)
        .where(
          and(
            eq(messageReactions.messageId, input.messageId),
            eq(messageReactions.userId, userId),
            eq(messageReactions.emoji, input.emoji)
          )
        )
        .limit(1);

      if (existingReaction.length > 0) {
        // Duplicate reaction, return existing
        return existingReaction[0];
      }

      // Add new reaction
      const newReaction = await db
        .insert(messageReactions)
        .values({
          messageId: input.messageId,
          userId: userId,
          emoji: input.emoji,
        })
        .returning();

      // Update reactions count in conversation_messages
      const allReactions = await db
        .select()
        .from(messageReactions)
        .where(eq(messageReactions.messageId, input.messageId));

      const reactionsCount: Record<string, number> = {};
      allReactions.forEach((reaction: any) => {
        reactionsCount[reaction.emoji] =
          (reactionsCount[reaction.emoji] || 0) + 1;
      });

      await db
        .update(conversationMessagesTable)
        .set({ reactionsCount })
        .where(eq(conversationMessagesTable.id, input.messageId));

      // Emit event for real-time updates
      reactionsEventEmitter.emit("reactions_updated", {
        messageId: input.messageId,
        reactionsCount,
      });

      return newReaction[0];
    }),

  removeReaction: procedure
    .input(
      z.object({
        messageId: z.string().uuid(),
        emoji: z.string().max(50),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const { db } = ctx;
      const userId = ctx.session.user.id;

      // Find and delete the reaction
      const reaction = await db
        .select()
        .from(messageReactions)
        .where(
          and(
            eq(messageReactions.messageId, input.messageId),
            eq(messageReactions.userId, userId),
            eq(messageReactions.emoji, input.emoji)
          )
        )
        .limit(1);

      if (reaction.length === 0) {
        throw new Error("Reaction not found");
      }

      await db
        .delete(messageReactions)
        .where(
          and(
            eq(messageReactions.messageId, input.messageId),
            eq(messageReactions.userId, userId),
            eq(messageReactions.emoji, input.emoji)
          )
        );

      // Update reactions count in conversation_messages
      const allReactions = await db
        .select()
        .from(messageReactions)
        .where(eq(messageReactions.messageId, input.messageId));

      const reactionsCount: Record<string, number> = {};
      allReactions.forEach((reaction: any) => {
        reactionsCount[reaction.emoji] =
          (reactionsCount[reaction.emoji] || 0) + 1;
      });

      await db
        .update(conversationMessagesTable)
        .set({ reactionsCount })
        .where(eq(conversationMessagesTable.id, input.messageId));

      // Emit event for real-time updates
      reactionsEventEmitter.emit("reactions_updated", {
        messageId: input.messageId,
        reactionsCount,
      });

      return { success: true };
    }),

  getReactions: procedure
    .input(
      z.object({
        messageId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }: any) => {
      const { db } = ctx;

      const reactions = await db
        .select()
        .from(messageReactions)
        .where(eq(messageReactions.messageId, input.messageId));

      // Group by emoji and count
      const reactionsCount: Record<string, number> = {};
      const reactionsByEmoji: Record<
        string,
        { users: string[]; count: number }
      > = {};

      reactions.forEach((reaction: any) => {
        reactionsCount[reaction.emoji] =
          (reactionsCount[reaction.emoji] || 0) + 1;

        if (!reactionsByEmoji[reaction.emoji]) {
          reactionsByEmoji[reaction.emoji] = { users: [], count: 0 };
        }
        reactionsByEmoji[reaction.emoji].users.push(reaction.userId);
        reactionsByEmoji[reaction.emoji].count += 1;
      });

      return {
        messageId: input.messageId,
        reactionsCount,
        reactionsByEmoji,
        totalReactions: reactions.length,
      };
    }),

  onReactionsUpdate: procedure
    .input(
      z.object({
        messageId: z.string().uuid().optional(),
      })
    )
    .subscription(({ input }: any) => {
      return observable((emit) => {
        const handler = (data: {
          messageId: string;
          reactionsCount: Record<string, number>;
        }) => {
          // If specific messageId requested, filter; otherwise emit all
          if (!input.messageId || input.messageId === data.messageId) {
            emit.next(data);
          }
        };

        reactionsEventEmitter.on("reactions_updated", handler);

        return () => {
          reactionsEventEmitter.off("reactions_updated", handler);
        };
      });
    }),
});
