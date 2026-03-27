import { pgTable, text, timestamp, varchar, boolean, uuid, json, integer } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).unique(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).notNull(),
  tier: varchar("tier", { length: 50 }).notNull().default("free"), // free, pro, enterprise
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, canceled, past_due, incomplete, trialing
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  trialEndDate: timestamp("trial_end_date"), // For trial subscriptions
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  entitlements: json("entitlements").$type<Record<string, boolean>>().default({}), // Feature flags specific to this subscription
  billingMetadata: json("billing_metadata").$type<{
    priceId?: string;
    productId?: string;
    quantity?: number;
    lastBilledAt?: string;
  }>().default({}), // Stripe billing details
  stripePaymentMethodId: varchar("stripe_payment_method_id", { length: 255 }), // Saved payment method ID
  failedPaymentAttempts: integer("failed_payment_attempts").default(0), // Number of failed payment retry attempts
  nextRetryAt: timestamp("next_retry_at"), // Timestamp for next payment retry
  lastPaymentError: varchar("last_payment_error", { length: 500 }), // Last error message from failed payment
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
