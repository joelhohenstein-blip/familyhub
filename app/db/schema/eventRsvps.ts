import { pgTable, uuid, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';

export const eventRsvpStatusEnum = pgEnum('event_rsvp_status', ['attending', 'maybe', 'not_attending']);

export const eventRsvps = pgTable(
  'event_rsvps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull(),
    userId: uuid('user_id').notNull(),
    status: eventRsvpStatusEnum('status').notNull(),
    rsvpedAt: timestamp('rsvped_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    eventIdIdx: index('event_rsvps_event_id_idx').on(table.eventId),
    userIdIdx: index('event_rsvps_user_id_idx').on(table.userId),
    eventUserIdx: index('event_rsvps_event_user_idx').on(table.eventId, table.userId),
  })
);

export type EventRsvp = typeof eventRsvps.$inferSelect;
export type NewEventRsvp = typeof eventRsvps.$inferInsert;
