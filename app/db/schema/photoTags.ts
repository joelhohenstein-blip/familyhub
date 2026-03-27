import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { mediaItems } from "./media";

export const photoTags = pgTable(
  "photo_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mediaItemId: uuid("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("photo_tags_media_item_id_idx").on(table.mediaItemId),
    index("photo_tags_tag_idx").on(table.tag),
  ]
);

export const photoTagsRelations = relations(photoTags, ({ one }) => ({
  mediaItem: one(mediaItems, {
    fields: [photoTags.mediaItemId],
    references: [mediaItems.id],
  }),
}));
