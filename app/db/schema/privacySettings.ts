import { pgTable, text, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const privacySettings = pgTable("privacy_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull(),
  profileVisibility: text("profile_visibility").default("family"), // public, family, private
  allowMessageRequests: boolean("allow_message_requests").default(true),
  allowMediaSharing: boolean("allow_media_sharing").default(true),
  allowLocationSharing: boolean("allow_location_sharing").default(false),
  allowActivityStatus: boolean("allow_activity_status").default(true),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  blockNonFamilyMessages: boolean("block_non_family_messages").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
