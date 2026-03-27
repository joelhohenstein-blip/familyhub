import { pgTable, text, uuid, timestamp, index, json } from 'drizzle-orm/pg-core';
import { conversationsTable } from './conversations';
import { users } from './auth';

export const conversationMessagesTable = pgTable(
  'conversation_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').notNull().references(() => conversationsTable.id, {
      onDelete: 'cascade',
    }),
    senderId: uuid('sender_id').notNull().references(() => users.id),
    content: text('content').notNull(),
    status: text('status').notNull().default('sent'), // sent, delivered, read
    readAt: timestamp('read_at'),
    reactionsCount: json('reactions_count').$type<Record<string, number>>().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    conversationIdIdx: index('idx_conversation_messages_conversation_id').on(table.conversationId),
    senderIdIdx: index('idx_conversation_messages_sender_id').on(table.senderId),
    createdAtIdx: index('idx_conversation_messages_created_at').on(table.createdAt),
  })
);

export type ConversationMessage = typeof conversationMessagesTable.$inferSelect;
export type ConversationMessageInsert = typeof conversationMessagesTable.$inferInsert;
