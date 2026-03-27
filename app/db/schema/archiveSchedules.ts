import { pgTable, uuid, timestamp, text, index } from 'drizzle-orm/pg-core';
import { conversationsTable } from './conversations';
import { users } from './auth';

export const archiveSchedulesTable = pgTable(
  'archive_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').notNull().references(() => conversationsTable.id, {
      onDelete: 'cascade',
    }),
    scheduledBy: uuid('scheduled_by').notNull().references(() => users.id),
    scheduledForTime: timestamp('scheduled_for_time').notNull(),
    status: text('status').notNull().default('pending'), // pending, completed, cancelled
    createdAt: timestamp('created_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
    cancelledAt: timestamp('cancelled_at'),
  },
  (table) => ({
    conversationIdIdx: index('idx_archive_schedules_conversation_id').on(table.conversationId),
    scheduledByIdx: index('idx_archive_schedules_scheduled_by').on(table.scheduledBy),
    scheduledForTimeIdx: index('idx_archive_schedules_scheduled_for_time').on(table.scheduledForTime),
    statusIdx: index('idx_archive_schedules_status').on(table.status),
  })
);

export type ArchiveSchedule = typeof archiveSchedulesTable.$inferSelect;
export type ArchiveScheduleInsert = typeof archiveSchedulesTable.$inferInsert;
