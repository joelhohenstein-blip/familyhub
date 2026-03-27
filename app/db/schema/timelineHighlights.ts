import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { families } from "./families";
import { users } from "./auth";

export const timelineHighlights = pgTable("timeline_highlights", {
  id: uuid("id").primaryKey().defaultRandom(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const timelineHighlightsRelations = relations(
  timelineHighlights,
  ({ one, many }) => ({
    family: one(families, {
      fields: [timelineHighlights.familyId],
      references: [families.id],
    }),
    createdByUser: one(users, {
      fields: [timelineHighlights.createdBy],
      references: [users.id],
    }),
    media: many(timelineHighlightMedia),
    shares: many(timelineShares),
  })
);

export const timelineHighlightMedia = pgTable(
  "timeline_highlight_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    highlightId: uuid("highlight_id")
      .notNull()
      .references(() => timelineHighlights.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    type: varchar("type", { length: 20 }).notNull(), // 'image' or 'video'
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileSize: integer("file_size").notNull(),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  }
);

export const timelineHighlightMediaRelations = relations(
  timelineHighlightMedia,
  ({ one }) => ({
    highlight: one(timelineHighlights, {
      fields: [timelineHighlightMedia.highlightId],
      references: [timelineHighlights.id],
    }),
  })
);

export const timelineShares = pgTable("timeline_shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  highlightId: uuid("highlight_id").references(() => timelineHighlights.id, {
    onDelete: "cascade",
  }),
  shareToken: varchar("share_token", { length: 255 }).notNull().unique(),
  shareType: varchar("share_type", { length: 50 }).notNull().default("highlight"), // 'highlight' or 'timeline'
  guestEmail: varchar("guest_email", { length: 255 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const timelineSharesRelations = relations(
  timelineShares,
  ({ one }) => ({
    family: one(families, {
      fields: [timelineShares.familyId],
      references: [families.id],
    }),
    highlight: one(timelineHighlights, {
      fields: [timelineShares.highlightId],
      references: [timelineHighlights.id],
    }),
    createdByUser: one(users, {
      fields: [timelineShares.createdBy],
      references: [users.id],
    }),
  })
);

// Types
export type TimelineHighlight = typeof timelineHighlights.$inferSelect;
export type NewTimelineHighlight = typeof timelineHighlights.$inferInsert;
export type TimelineHighlightMedia = typeof timelineHighlightMedia.$inferSelect;
export type NewTimelineHighlightMedia = typeof timelineHighlightMedia.$inferInsert;
export type TimelineShare = typeof timelineShares.$inferSelect;
export type NewTimelineShare = typeof timelineShares.$inferInsert;
