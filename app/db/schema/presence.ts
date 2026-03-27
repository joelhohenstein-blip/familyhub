import { pgTable, uuid, timestamp, text, index } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { families } from './families';

/**
 * User presence tracking for real-time status (online/offline)
 * Stores current presence state and last-seen timestamp
 */
export const userPresenceTable = pgTable(
  'user_presence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('offline'), // 'online' or 'offline'
    lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
    sessionId: text('session_id'), // To track specific browser/device sessions
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('presence_user_id_idx').on(table.userId),
    familyIdIdx: index('presence_family_id_idx').on(table.familyId),
    statusIdx: index('presence_status_idx').on(table.status),
  })
);

export type UserPresence = typeof userPresenceTable.$inferSelect;
export type UserPresenceInsert = typeof userPresenceTable.$inferInsert;
