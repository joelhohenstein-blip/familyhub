import { sql } from "drizzle-orm";
import {
  text,
  timestamp,
  uuid,
  pgTable,
  integer,
  decimal,
  index,
  foreignKey,
  boolean,
} from "drizzle-orm/pg-core";
import { families } from "./families";
import { users } from "./auth";

// Streaming Sources Table
export const streamingSources = pgTable(
  "streaming_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url"),
    embedCode: text("embed_code"),
    type: text("type").notNull(), // 'pluto', 'tubi', 'roku', 'freeview', 'custom'
    genre: text("genre"),
    ageRating: integer("age_rating").default(0), // 0 = all ages, 13, 16, 18, etc.
    thumbnail: text("thumbnail"),
    description: text("description"),
    position: integer("position").default(0), // For reordering
    enabled: boolean("enabled").default(true), // Admin control for streaming service access
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.familyId],
      foreignColumns: [families.id],
      name: "streaming_sources_family_id_fk",
    }),
    index("streaming_sources_family_id_idx").on(table.familyId),
    index("streaming_sources_position_idx").on(table.position),
    index("streaming_sources_type_idx").on(table.type),
  ]
);

// Parental Locks Table
export const parentalLocks = pgTable(
  "parental_locks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").references(() => streamingSources.id, {
      onDelete: "cascade",
    }),
    minAgeRating: integer("min_age_rating").notNull().default(0), // Minimum age to access
    isGlobalLock: boolean("is_global_lock").default(false), // If true, applies to all sources
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.familyId],
      foreignColumns: [families.id],
      name: "parental_locks_family_id_fk",
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "parental_locks_user_id_fk",
    }),
    foreignKey({
      columns: [table.sourceId],
      foreignColumns: [streamingSources.id],
      name: "parental_locks_source_id_fk",
    }),
    index("parental_locks_family_id_idx").on(table.familyId),
    index("parental_locks_user_id_idx").on(table.userId),
    index("parental_locks_source_id_idx").on(table.sourceId),
  ]
);

// Streaming Playback State Table
export const streamingPlaybackState = pgTable(
  "streaming_playback_state",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => streamingSources.id, { onDelete: "cascade" }),
    currentTime: decimal("current_time", { precision: 10, scale: 2 }).default("0"),
    duration: decimal("duration", { precision: 10, scale: 2 }).default("0"),
    lastPlayedAt: timestamp("last_played_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "streaming_playback_state_user_id_fk",
    }),
    foreignKey({
      columns: [table.sourceId],
      foreignColumns: [streamingSources.id],
      name: "streaming_playback_state_source_id_fk",
    }),
    index("streaming_playback_state_user_id_idx").on(table.userId),
    index("streaming_playback_state_source_id_idx").on(table.sourceId),
    index("streaming_playback_state_user_source_idx").on(table.userId, table.sourceId),
  ]
);

export type StreamingSource = typeof streamingSources.$inferSelect;
export type InsertStreamingSource = typeof streamingSources.$inferInsert;
export type ParentalLock = typeof parentalLocks.$inferSelect;
export type InsertParentalLock = typeof parentalLocks.$inferInsert;
export type StreamingPlaybackState = typeof streamingPlaybackState.$inferSelect;
export type InsertStreamingPlaybackState = typeof streamingPlaybackState.$inferInsert;
