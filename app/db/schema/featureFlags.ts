import { pgTable, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const featureFlags = pgTable("feature_flags", {
  id: varchar("id", { length: 255 }).primaryKey(),
  featureName: varchar("feature_name", { length: 255 }).notNull().unique(),
  tier: varchar("tier", { length: 50 }).notNull(), // free, premium
  enabled: boolean("enabled").notNull().default(true),
  description: varchar("description", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;
