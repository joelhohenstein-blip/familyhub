import { pgTable, varchar, timestamp, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const webhookDedup = pgTable("webhook_dedup", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()::text`),
  stripeEventId: varchar("stripe_event_id", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, processed, failed
  error: text("error"), // Error message if status is failed
  processedAt: timestamp("processed_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type WebhookDedup = typeof webhookDedup.$inferSelect;
export type NewWebhookDedup = typeof webhookDedup.$inferInsert;
