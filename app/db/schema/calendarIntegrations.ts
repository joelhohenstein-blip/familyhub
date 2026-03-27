import { pgTable, text, timestamp, uuid, varchar, index, pgEnum, boolean, unique } from 'drizzle-orm/pg-core';

export const calendarProviderIntegrationEnum = pgEnum('calendar_provider_integration', ['google', 'outlook']);

export const calendarIntegrations = pgTable(
  'calendar_integrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id').notNull(),
    provider: calendarProviderIntegrationEnum('provider').notNull(),
    accessToken: text('access_token').notNull(), // encrypted
    refreshToken: text('refresh_token'), // encrypted, nullable
    tokenExpiresAt: timestamp('token_expires_at'),
    isActive: boolean('is_active').default(true),
    lastSyncAt: timestamp('last_sync_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    familyIdIdx: index('calendar_integrations_family_id_idx').on(table.familyId),
    providerIdx: index('calendar_integrations_provider_idx').on(table.provider),
    uniqueFamilyProvider: unique().on(table.familyId, table.provider),
  })
);

export type CalendarIntegration = typeof calendarIntegrations.$inferSelect;
export type NewCalendarIntegration = typeof calendarIntegrations.$inferInsert;
