import { pgTable, text, timestamp, uuid, varchar, index, pgEnum } from 'drizzle-orm/pg-core';

export const visibilityAuditEnum = pgEnum('event_visibility_audit_status', ['public', 'family', 'private']);

export const eventVisibilityAudit = pgTable(
  'event_visibility_audit',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull(),
    userId: uuid('user_id').notNull(),
    oldVisibility: visibilityAuditEnum('old_visibility'),
    newVisibility: visibilityAuditEnum('new_visibility').notNull(),
    reason: text('reason'),
    changedAt: timestamp('changed_at').defaultNow(),
  },
  (table) => ({
    eventIdIdx: index('event_visibility_audit_event_id_idx').on(table.eventId),
    userIdIdx: index('event_visibility_audit_user_id_idx').on(table.userId),
    changedAtIdx: index('event_visibility_audit_changed_at_idx').on(table.changedAt),
  })
);

export type EventVisibilityAudit = typeof eventVisibilityAudit.$inferSelect;
export type NewEventVisibilityAudit = typeof eventVisibilityAudit.$inferInsert;
