import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { router, procedure } from '../trpc';
import { emitter } from '~/utils/emitter.server';
import { chatMessages, type ChatMessage } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';

export const chatRouter = router({
  /**
   * Send a chat message
   */
  sendMessage: procedure
    .input(z.object({
      chatId: z.string(),
      message: z.string().min(1, 'Message cannot be empty'),
      userId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Save user message to database
      const [userMessage] = await ctx.db.insert(chatMessages)
        .values({
          chatId: input.chatId,
          content: input.message.trim(),
          role: 'user',
          userId: input.userId || null,
        })
        .returning();

      // Create assistant message placeholder
      const [assistantMessage] = await ctx.db.insert(chatMessages)
        .values({
          chatId: input.chatId,
          content: '',
          role: 'assistant',
          userId: null,
        })
        .returning();

      // Get all messages for this chat
      const allMessages = await ctx.db.select()
        .from(chatMessages)
        .where(eq(chatMessages.chatId, input.chatId))
        .orderBy(chatMessages.createdAt);

      // Emit event to trigger subscription updates
      emitter.emit('chat-update', { 
        chatId: input.chatId,
        messages: allMessages
      });

      // Start streaming response
      setTimeout(() => {
        simulateStreamingResponse(assistantMessage.id, input.message, input.chatId, ctx.db);
      }, 100);
      
      return { messageId: assistantMessage.id, success: true };
    }),

  /**
   * Get chat messages
   */
  getMessages: procedure
    .input(z.object({
      chatId: z.string(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const messages = await ctx.db.select()
        .from(chatMessages)
        .where(eq(chatMessages.chatId, input.chatId))
        .orderBy(chatMessages.createdAt)
        .limit(input.limit);

      return { messages };
    }),

  /**
   * Subscribe to chat updates - handles all chat updates (new messages + streaming)
   * Now properly integrated with tRPC for end-to-end type safety
   */
  onChatUpdate: procedure
    .input(z.object({ 
      chatId: z.string() 
    }))
    .subscription(({ input }) => {
      return observable<{ messages: ChatMessage[] }>((emit) => {
        const onUpdate = (data: any) => {
          // Filter by chatId if the event includes it
          if (!data.chatId || data.chatId === input.chatId) {
            emit.next(data);
          }
        };

        emitter.on('chat-update', onUpdate);

        return () => {
          emitter.off('chat-update', onUpdate);
        };
      });
    }),
});

// Simulate streaming LLM response
async function simulateStreamingResponse(messageId: string, userMessage: string, chatId: string, db: any) {
  const responses = [
    "That's an interesting question! Let me think about it...",
    "Based on what you've asked, I can provide some insights.",
    "Here's what I think would be helpful for your situation.",
    "I'd be happy to help you with that. Let me break it down:",
    "Great question! Here's my perspective on this topic.",
  ];
  
  const response = responses[Math.floor(Math.random() * responses.length)];
  const words = response.split(" ");
  
  let currentContent = "";
  
  for (let i = 0; i < words.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 200));
    
    currentContent += (i > 0 ? " " : "") + words[i];
    
    // Update the message in database
    await db.update(chatMessages)
      .set({ 
        content: currentContent,
        updatedAt: new Date()
      })
      .where(eq(chatMessages.id, messageId));
    
    // Get all messages for this chat to emit
    const allMessages = await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.chatId, chatId))
      .orderBy(chatMessages.createdAt);

    // Emit full chat state update (unified approach)
    emitter.emit("chat-update", { 
      chatId: chatId,
      messages: allMessages 
    });
  }
} 