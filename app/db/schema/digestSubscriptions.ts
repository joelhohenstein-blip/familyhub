import { pgTable, uuid, boolean, timestamp, index, varchar, jsonb } from 'drizzle-orm/pg-core';
import { families } from './families';
import { users } from './auth';
import { relations } from 'drizzle-orm';

export type DigestCadence = 'daily' | 'weekly';

export const digestSubscriptions = pgTable(
  'digest_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    cadence: varchar('cadence', { length: 20 }).notNull().default('weekly'),
    isActive: boolean('is_active').notNull().default(true),
    contentFilters: jsonb('content_filters').default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    familyIdIdx: index('digest_subscriptions_family_id_idx').on(table.familyId),
    userIdIdx: index('digest_subscriptions_user_id_idx').on(table.userId),
    familyUserIdx: index('digest_subscriptions_family_user_idx').on(table.familyId, table.userId),
  })
);

export const digestSubscriptionsRelations = relations(digestSubscriptions, ({ one }) => ({
  family: one(families, {
    fields: [digestSubscriptions.familyId],
    references: [families.id],
  }),
  user: one(users, {
    fields: [digestSubscriptions.userId],
    references: [users.id],
  }),
}));

export type DigestSubscription = typeof digestSubscriptions.$inferSelect;
export type NewDigestSubscription = typeof digestSubscriptions.$inferInsert;
