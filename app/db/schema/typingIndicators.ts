import { pgTable, uuid, timestamp, text, index } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { conversationsTable } from './conversations';

/**
 * Typing indicators for group/1-on-1 conversations
 * Tracks when users are actively typing with a timeout
 */
export const typingIndicatorsTable = pgTable(
  'typing_indicators',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').notNull().references(() => conversationsTable.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    isTyping: text('is_typing').notNull().default('true'), // Store as text for PostgreSQL compatibility
    startedAt: timestamp('started_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull(), // Auto-expire after inactivity (e.g., 3 seconds)
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    conversationIdIdx: index('typing_conversation_id_idx').on(table.conversationId),
    userIdIdx: index('typing_user_id_idx').on(table.userId),
    expiresAtIdx: index('typing_expires_at_idx').on(table.expiresAt),
  })
);

export type TypingIndicator = typeof typingIndicatorsTable.$inferSelect;
export type TypingIndicatorInsert = typeof typingIndicatorsTable.$inferInsert;
