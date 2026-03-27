import { pgTable, text, timestamp, uuid, varchar, index, pgEnum, json } from 'drizzle-orm/pg-core';

export const calendarProviderEnum = pgEnum('calendar_provider', ['google', 'outlook']);
export const syncStatusEnum = pgEnum('sync_status', ['synced', 'failed', 'pending']);

export const calendarSyncLogs = pgTable(
  'calendar_sync_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id').notNull(),
    provider: calendarProviderEnum('provider').notNull(),
    eventId: varchar('event_id', { length: 255 }).notNull(),
    status: syncStatusEnum('status').default('pending'),
    lastSyncedAt: timestamp('last_synced_at').defaultNow(),
    error: text('error'),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    familyIdIdx: index('calendar_sync_logs_family_id_idx').on(table.familyId),
    providerIdx: index('calendar_sync_logs_provider_idx').on(table.provider),
  })
);

export type CalendarSyncLog = typeof calendarSyncLogs.$inferSelect;
export type NewCalendarSyncLog = typeof calendarSyncLogs.$inferInsert;
