import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { familyDigests } from './familyDigests';
import { users } from './auth';
import { relations } from 'drizzle-orm';

export const digestShares = pgTable(
  'digest_shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    digestId: uuid('digest_id')
      .notNull()
      .references(() => familyDigests.id, { onDelete: 'cascade' }),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    shareToken: varchar('share_token', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at'),
    guestEmail: varchar('guest_email', { length: 255 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    shareTokenIdx: index('digest_shares_share_token_idx').on(table.shareToken),
    digestIdIdx: index('digest_shares_digest_id_idx').on(table.digestId),
    creatorIdIdx: index('digest_shares_creator_id_idx').on(table.creatorId),
  })
);

export const digestSharesRelations = relations(digestShares, ({ one }) => ({
  digest: one(familyDigests, {
    fields: [digestShares.digestId],
    references: [familyDigests.id],
  }),
  creator: one(users, {
    fields: [digestShares.creatorId],
    references: [users.id],
  }),
}));

export type DigestShare = typeof digestShares.$inferSelect;
export type NewDigestShare = typeof digestShares.$inferInsert;
