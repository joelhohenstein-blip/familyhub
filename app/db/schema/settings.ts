import {
  pgTable,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  json,
  serial,
  index,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

// Settings table - stores user settings and preferences
export const settings = pgTable(
  "settings",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // Model selection (for AI features)
    model: varchar("model", { length: 255 }).default("default"),
    
    // Video call settings
    videoCallQuality: varchar("video_call_quality", { length: 50 }).default("high"),
    audioEnabled: boolean("audio_enabled").default(true),
    videoEnabled: boolean("video_enabled").default(true),
    jitsiServerUrl: text("jitsi_server_url").default("https://meet.jitsi.example.com"),
    
    // Weather settings
    weatherCacheDuration: integer("weather_cache_duration").default(600), // 10 minutes in seconds
    
    // i18n settings
    language: varchar("language", { length: 10 }).default("en"),
    locationDetectionEnabled: boolean("location_detection_enabled").default(true),
    
    // Media settings
    mediaUploadSizeLimit: integer("media_upload_size_limit").default(52428800), // 50MB in bytes
    mediaRetentionDays: integer("media_retention_days").default(365),
    
    // Streaming settings
    streamingSourcesEnabled: json("streaming_sources_enabled").default(JSON.stringify({
      pluto: true,
      tubi: true,
      roku: true,
      freeview: true,
    })),
    parentalControlEnabled: boolean("parental_control_enabled").default(false),
    parentalControlPin: varchar("parental_control_pin", { length: 255 }),
    contentFilterAge: integer("content_filter_age"),
    
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: index("settings_user_id_idx").on(table.userId),
    };
  }
);

// User preferences table - channel-scoped per-user preferences
export const userPreferences = pgTable(
  "user_preferences",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channelId: integer("channel_id"),
    themeMode: varchar("theme_mode", { length: 20 }).default("light"),
    notificationsEnabled: boolean("notifications_enabled").default(true),
    emailNotifications: boolean("email_notifications").default(true),
    pushNotifications: boolean("push_notifications").default(true),
    privateMessagesAllowed: boolean("private_messages_allowed").default(true),
    metadata: json("metadata").default(JSON.stringify({})),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: index("user_preferences_user_id_idx").on(table.userId),
      channelIdIdx: index("user_preferences_channel_id_idx").on(table.channelId),
    };
  }
);

// API Keys table - secure API key storage for integrations
export const apiKeys = pgTable(
  "api_keys",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    keyHash: text("key_hash").notNull(),
    scopes: json("scopes").default(JSON.stringify([])).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    lastRotatedAt: timestamp("last_rotated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: index("api_keys_user_id_idx").on(table.userId),
      keyHashIdx: index("api_keys_key_hash_idx").on(table.keyHash),
    };
  }
);

// Agent permissions table - manage permissions for family members
export const agentPermissions = pgTable(
  "agent_permissions",
  {
    id: serial("id").primaryKey(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permissionKey: varchar("permission_key", { length: 255 }).notNull(),
    allowed: boolean("allowed").default(true).notNull(),
    metadata: json("metadata").default(JSON.stringify({})),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return {
      agentIdIdx: index("agent_permissions_agent_id_idx").on(table.agentId),
      permissionKeyIdx: index("agent_permissions_permission_key_idx").on(table.permissionKey),
    };
  }
);

// Type exports
export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;

export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type AgentPermission = typeof agentPermissions.$inferSelect;
export type NewAgentPermission = typeof agentPermissions.$inferInsert;
