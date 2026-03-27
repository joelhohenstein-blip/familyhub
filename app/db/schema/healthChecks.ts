import { pgTable, text, timestamp, integer, jsonb, index, serial } from "drizzle-orm/pg-core";

export const healthChecks = pgTable(
  "health_checks",
  {
    id: serial("id").primaryKey(),
    component_name: text("component_name").notNull(),
    status: text("status").notNull(), // 'healthy', 'degraded', 'unhealthy'
    last_checked: timestamp("last_checked").notNull().defaultNow(),
    error_message: text("error_message"),
    response_time_ms: integer("response_time_ms"),
    metadata: jsonb("metadata"),
  },
  (table) => ({
    componentIdx: index("health_checks_component_idx").on(table.component_name),
    lastCheckedIdx: index("health_checks_last_checked_idx").on(table.last_checked),
    statusIdx: index("health_checks_status_idx").on(table.status),
  })
);

export type HealthCheck = typeof healthChecks.$inferSelect;
export type NewHealthCheck = typeof healthChecks.$inferInsert;
