import { pgTable, text, uuid, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { families } from './families';
import { sql } from 'drizzle-orm';

export const conversationsTable = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    participant1Id: uuid('participant1_id').notNull().references(() => users.id),
    participant2Id: uuid('participant2_id').notNull().references(() => users.id),
    familyId: uuid('family_id').notNull().references(() => families.id),
    status: text('status').notNull().default('active'), // active, archived
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint on sorted participant pair + familyId to prevent duplicates
    uniqueConversation: uniqueIndex('unique_conversation').on(
      sql`LEAST(${table.participant1Id}, ${table.participant2Id})`,
      sql`GREATEST(${table.participant1Id}, ${table.participant2Id})`,
      table.familyId
    ),
  })
);

export type Conversation = typeof conversationsTable.$inferSelect;
export type ConversationInsert = typeof conversationsTable.$inferInsert;
