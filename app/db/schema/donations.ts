import { pgTable, uuid, varchar, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './auth';

// Enum for donation status
export const donationStatusEnum = pgEnum('donation_status', ['pending', 'completed', 'failed']);

// Donations table
export const donations = pgTable('donations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  amount: integer('amount').notNull(),
  feesAmount: integer('fees_amount').notNull().default(0),
  netAmount: integer('net_amount').notNull().default(0),
  tierLabel: varchar('tier_label', { length: 255 }).notNull(),
  stripeSessionId: varchar('stripe_session_id', { length: 255 }),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  status: donationStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const donationsRelations = relations(donations, ({ one }) => ({
  user: one(users, {
    fields: [donations.userId],
    references: [users.id],
  }),
}));

// Types for TypeScript
export type Donation = typeof donations.$inferSelect;
export type NewDonation = typeof donations.$inferInsert;
