import { pgTable, varchar, integer, text, json, timestamp, boolean } from "drizzle-orm/pg-core";

export const subscriptionTiers = pgTable("subscription_tiers", {
  id: varchar("id", { length: 50 }).primaryKey(), // 'free', 'pro', 'enterprise'
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  
  // Pricing
  priceMonthly: integer("price_monthly"), // in cents, NULL for free tier
  priceYearly: integer("price_yearly"), // in cents, NULL for free tier
  stripePriceIdMonthly: varchar("stripe_price_id_monthly", { length: 255 }),
  stripePriceIdYearly: varchar("stripe_price_id_yearly", { length: 255 }),
  stripeProductId: varchar("stripe_product_id", { length: 255 }),
  
  // Trial settings
  trialDays: integer("trial_days").default(14), // Days of trial access
  
  // Feature entitlements
  features: json("features").$type<Record<string, boolean>>().notNull().default({}), // Feature flags for this tier
  
  // Limits
  maxFamilyMembers: integer("max_family_members"), // NULL for unlimited
  maxStorageGB: integer("max_storage_gb"), // NULL for unlimited
  maxMediaLibraryItems: integer("max_media_library_items"), // NULL for unlimited
  
  // Activation
  isActive: boolean("is_active").default(true),
  isDeleted: boolean("is_deleted").default(false), // Soft delete
  displayOrder: integer("display_order").default(0), // For UI ordering
  
  // Admin notes and metadata
  internalNotes: text("internal_notes"), // Admin-only notes
  stripeProductIdAlt: varchar("stripe_product_id_alt", { length: 255 }), // For migration
  metadata: json("metadata").$type<Record<string, any>>().default({}), // Future extensibility
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SubscriptionTier = typeof subscriptionTiers.$inferSelect;
export type NewSubscriptionTier = typeof subscriptionTiers.$inferInsert;
