import { pgTable, text, timestamp, uuid, varchar, index, pgEnum } from 'drizzle-orm/pg-core';

export const eventSuggestionStatusEnum = pgEnum('event_suggestion_status', ['pending', 'confirmed', 'rejected']);
export const eventCategoryEnum = pgEnum('event_category', ['activity', 'meal', 'game', 'movie', 'outing', 'celebration', 'other']);

export const eventSuggestions = pgTable(
  'event_suggestions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    suggestedTime: timestamp('suggested_time').notNull(),
    location: varchar('location', { length: 255 }),
    category: eventCategoryEnum('category').default('other'),
    rationale: text('rationale'),
    status: eventSuggestionStatusEnum('status').default('pending'),
    confirmedAt: timestamp('confirmed_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    familyIdIdx: index('event_suggestions_family_id_idx').on(table.familyId),
    statusIdx: index('event_suggestions_status_idx').on(table.status),
  })
);

export type EventSuggestion = typeof eventSuggestions.$inferSelect;
export type NewEventSuggestion = typeof eventSuggestions.$inferInsert;
