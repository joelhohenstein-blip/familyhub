import { pgTable, text, timestamp, uuid, varchar, index, pgEnum } from 'drizzle-orm/pg-core';

export const visibilityEnum = pgEnum('event_visibility', ['public', 'family', 'private']);
export const rsvpStatusEnum = pgEnum('rsvp_status', ['attending', 'maybe', 'not_attending']);

export const calendarEvents = pgTable(
  'calendar_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id').notNull(),
    createdBy: uuid('created_by').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time').notNull(),
    location: varchar('location', { length: 255 }),
    visibility: visibilityEnum('visibility').default('family'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    familyIdIdx: index('calendar_events_family_id_idx').on(table.familyId),
    createdByIdx: index('calendar_events_created_by_idx').on(table.createdBy),
    startTimeIdx: index('calendar_events_start_time_idx').on(table.startTime),
    visibilityIdx: index('calendar_events_visibility_idx').on(table.visibility),
  })
);

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;
