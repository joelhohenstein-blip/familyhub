import {
  pgTable,
  uuid,
  serial,
  boolean,
  integer,
  json,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { families } from "./families";

// User Face Blur Preferences table - stores per-user blur settings for family photos
export const userFaceBlurPreferences = pgTable(
  "user_face_blur_preferences",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    
    // Blur all faces toggle
    blurAllFaces: boolean("blur_all_faces").default(false).notNull(),
    
    // Blur intensity (0-100, where 0 is no blur and 100 is maximum blur)
    blurIntensity: integer("blur_intensity").default(50).notNull(),
    
    // Specific people to blur - JSONB array of user IDs or person identifiers
    blurSpecificPeople: json("blur_specific_people").default(JSON.stringify([])).notNull(),
    
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return {
      // Unique constraint on userId and familyId
      userFamilyUnique: unique("user_face_blur_preferences_user_family_unique").on(
        table.userId,
        table.familyId
      ),
      // Indexes for efficient queries
      userIdIdx: index("user_face_blur_preferences_user_id_idx").on(table.userId),
      familyIdIdx: index("user_face_blur_preferences_family_id_idx").on(table.familyId),
    };
  }
);

// Type exports
export type UserFaceBlurPreference = typeof userFaceBlurPreferences.$inferSelect;
export type NewUserFaceBlurPreference = typeof userFaceBlurPreferences.$inferInsert;
