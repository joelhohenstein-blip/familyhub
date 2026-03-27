import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';

// Define ChatMessage table
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: varchar('chat_id', { length: 255 }).notNull(),
  content: text('content').notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'user' or 'assistant'
  userId: varchar('user_id', { length: 255 }), // optional, for future user management
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  chatIdIdx: index('chat_id_idx').on(table.chatId),
  createdAtIdx: index('created_at_idx').on(table.createdAt)
}));

// Types for TypeScript
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert; 