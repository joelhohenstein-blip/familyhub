import {
  pgTable,
  uuid,
  integer,
  boolean,
  timestamp,
  index,
  unique,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { mediaItems } from "./media";
import { users } from "./auth";

// Enum for face detection status
export const faceDetectionStatusEnum = pgEnum("face_detection_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "skipped",
]);

// Media Face Blur Settings table - tracks blur status per media item
export const mediaFaceBlurSettings = pgTable(
  "media_face_blur_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mediaItemId: uuid("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    uploaderId: uuid("uploader_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    faceDetectionStatus: faceDetectionStatusEnum("face_detection_status")
      .notNull()
      .default("pending"),
    detectedFaceCount: integer("detected_face_count").notNull().default(0),
    blurIntensity: integer("blur_intensity").notNull().default(50), // 0-100 scale
    isAutoBlurred: boolean("is_auto_blurred").notNull().default(false),
    forceBlurByAdmin: boolean("force_blur_by_admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    mediaItemIdUnique: unique("media_face_blur_settings_media_item_id_unique").on(
      table.mediaItemId
    ),
    mediaItemIdIdx: index("media_face_blur_settings_media_item_id_idx").on(
      table.mediaItemId
    ),
    uploaderIdIdx: index("media_face_blur_settings_uploader_id_idx").on(
      table.uploaderId
    ),
    detectionStatusIdx: index(
      "media_face_blur_settings_detection_status_idx"
    ).on(table.faceDetectionStatus),
  })
);

// Relations
export const mediaFaceBlurSettingsRelations = relations(
  mediaFaceBlurSettings,
  ({ one }) => ({
    mediaItem: one(mediaItems, {
      fields: [mediaFaceBlurSettings.mediaItemId],
      references: [mediaItems.id],
    }),
    uploader: one(users, {
      fields: [mediaFaceBlurSettings.uploaderId],
      references: [users.id],
    }),
  })
);

// Export types
export type MediaFaceBlurSettings = typeof mediaFaceBlurSettings.$inferSelect;
export type MediaFaceBlurSettingsInsert =
  typeof mediaFaceBlurSettings.$inferInsert;
