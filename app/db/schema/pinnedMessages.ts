import { pgTable, uuid, timestamp, index } from 'drizzle-orm/pg-core';
import { conversationsTable } from './conversations';
import { conversationMessagesTable } from './conversationMessages';
import { users } from './auth';

export const pinnedMessagesTable = pgTable(
  'pinned_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').notNull().references(() => conversationsTable.id, {
      onDelete: 'cascade',
    }),
    messageId: uuid('message_id').notNull().references(() => conversationMessagesTable.id, {
      onDelete: 'cascade',
    }),
    pinnedBy: uuid('pinned_by').notNull().references(() => users.id),
    pinnedAt: timestamp('pinned_at').notNull().defaultNow(),
    unpinnedAt: timestamp('unpinned_at'),
  },
  (table) => ({
    conversationIdIdx: index('idx_pinned_messages_conversation_id').on(table.conversationId),
    messageIdIdx: index('idx_pinned_messages_message_id').on(table.messageId),
    pinnedByIdx: index('idx_pinned_messages_pinned_by').on(table.pinnedBy),
    pinnedAtIdx: index('idx_pinned_messages_pinned_at').on(table.pinnedAt),
  })
);

export type PinnedMessage = typeof pinnedMessagesTable.$inferSelect;
export type PinnedMessageInsert = typeof pinnedMessagesTable.$inferInsert;
