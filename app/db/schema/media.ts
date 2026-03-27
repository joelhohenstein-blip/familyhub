import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { families } from "./families";

// Media Gallery table - parent container for media
export const mediaGalleries = pgTable(
  "media_galleries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id").notNull(), // User ID of gallery owner
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    familyIdIdx: index("media_galleries_family_id_idx").on(table.familyId),
    ownerIdIdx: index("media_galleries_owner_id_idx").on(table.ownerId),
  })
);

// Media Items table - individual photos and videos
export const mediaItems = pgTable(
  "media_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    galleryId: uuid("gallery_id")
      .notNull()
      .references(() => mediaGalleries.id, { onDelete: "cascade" }),
    albumId: uuid("album_id").references(() => mediaAlbums.id, {
      onDelete: "set null",
    }),
    url: text("url").notNull(), // S3 URL
    type: text("type", { enum: ["image", "video"] }).notNull(), // image or video
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size").notNull(), // bytes
    duration: integer("duration"), // seconds, for videos
    thumbnailUrl: text("thumbnail_url"), // Thumbnail for videos/images
    uploadedBy: uuid("uploaded_by").notNull(), // User ID who uploaded
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    galleryIdIdx: index("media_items_gallery_id_idx").on(table.galleryId),
    albumIdIdx: index("media_items_album_id_idx").on(table.albumId),
    uploadedByIdx: index("media_items_uploaded_by_idx").on(table.uploadedBy),
  })
);

// Media Watch History - tracks video playback position per user
export const mediaWatchHistory = pgTable(
  "media_watch_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mediaItemId: uuid("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    lastPosition: integer("last_position").notNull().default(0), // seconds
    lastWatchedAt: timestamp("last_watched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    mediaItemIdUserIdUnique: unique(
      "media_watch_history_media_item_user_id_idx"
    ).on(table.mediaItemId, table.userId),
    userIdIdx: index("media_watch_history_user_id_idx").on(table.userId),
  })
);
// Media Albums table - for organizing media items
export const mediaAlbums = pgTable(
  "media_albums",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    galleryId: uuid("gallery_id")
      .notNull()
      .references(() => mediaGalleries.id, { onDelete: "cascade" }),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    galleryIdIdx: index("media_albums_gallery_id_idx").on(table.galleryId),
    familyIdIdx: index("media_albums_family_id_idx").on(table.familyId),
  })
);

// Relations
export const mediaGalleriesRelations = relations(
  mediaGalleries,
  ({ many }) => ({
    items: many(mediaItems),
    albums: many(mediaAlbums),
  })
);

export const mediaItemsRelations = relations(mediaItems, ({ one, many }) => ({
  gallery: one(mediaGalleries, {
    fields: [mediaItems.galleryId],
    references: [mediaGalleries.id],
  }),
  album: one(mediaAlbums, {
    fields: [mediaItems.albumId],
    references: [mediaAlbums.id],
  }),
  watchHistory: many(mediaWatchHistory),
}));

export const mediaWatchHistoryRelations = relations(
  mediaWatchHistory,
  ({ one }) => ({
    mediaItem: one(mediaItems, {
      fields: [mediaWatchHistory.mediaItemId],
      references: [mediaItems.id],
    }),
  })
);

export const mediaAlbumsRelations = relations(mediaAlbums, ({ one, many }) => ({
  gallery: one(mediaGalleries, {
    fields: [mediaAlbums.galleryId],
    references: [mediaGalleries.id],
  }),
  items: many(mediaItems),
}));

// Export types
export type MediaGallery = typeof mediaGalleries.$inferSelect;
export type MediaGalleryInsert = typeof mediaGalleries.$inferInsert;

export type MediaItem = typeof mediaItems.$inferSelect;
export type MediaItemInsert = typeof mediaItems.$inferInsert;

export type MediaWatchHistory = typeof mediaWatchHistory.$inferSelect;
export type MediaWatchHistoryInsert = typeof mediaWatchHistory.$inferInsert;

export type MediaAlbum = typeof mediaAlbums.$inferSelect;
export type MediaAlbumInsert = typeof mediaAlbums.$inferInsert;
