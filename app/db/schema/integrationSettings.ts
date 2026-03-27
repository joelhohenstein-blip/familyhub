import { pgTable, text, timestamp, uuid, varchar, boolean, jsonb } from "drizzle-orm/pg-core";

export const integrationSettings = pgTable("integration_settings", {
  id: uuid("id")
    .primaryKey()
    .defaultRandom(),
  settingKey: varchar("setting_key", { length: 255 }).notNull().unique(),
  webSocketEnabled: boolean("websocket_enabled").default(true),
  webSocketHealthStatus: text("websocket_health_status", {
    enum: ["healthy", "degraded", "offline"],
  }).default("healthy"),
  jitsiEnabled: boolean("jitsi_enabled").default(true),
  jitsiServerUrl: text("jitsi_server_url"),
  weatherEnabled: boolean("weather_enabled").default(true),
  weatherDataSource: text("weather_data_source"),
  weatherLocaleDetection: boolean("weather_locale_detection").default(true),
  i18nEnabled: boolean("i18n_enabled").default(true),
  i18nDefaultLocale: varchar("i18n_default_locale", { length: 10 }).default("en-US"),
  i18nBrowserDetection: boolean("i18n_browser_detection").default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type IntegrationSettings = typeof integrationSettings.$inferSelect;
export type NewIntegrationSettings = typeof integrationSettings.$inferInsert;
