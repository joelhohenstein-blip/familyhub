import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { families } from './families';
import { relations } from 'drizzle-orm';

export const familyDigests = pgTable(
  'family_digests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    familyIdIdx: index('family_digests_family_id_idx').on(table.familyId),
    dateRangeIdx: index('family_digests_date_range_idx').on(table.startDate, table.endDate),
    createdAtIdx: index('family_digests_created_at_idx').on(table.createdAt),
  })
);

export const familyDigestsRelations = relations(familyDigests, ({ one }) => ({
  family: one(families, {
    fields: [familyDigests.familyId],
    references: [families.id],
  }),
}));

export type FamilyDigest = typeof familyDigests.$inferSelect;
export type NewFamilyDigest = typeof familyDigests.$inferInsert;
