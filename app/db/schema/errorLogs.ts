import { pgTable, text, timestamp, integer, jsonb, index, serial } from "drizzle-orm/pg-core";

export const errorLogs = pgTable(
  "error_logs",
  {
    id: serial("id").primaryKey(),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    level: text("level").notNull(), // 'error', 'warn', 'info'
    message: text("message").notNull(),
    stack: text("stack"),
    json_payload: jsonb("json_payload"),
    service: text("service"),
    env: text("env"),
    metadata: jsonb("metadata"),
  },
  (table) => ({
    timestampIdx: index("error_logs_timestamp_idx").on(table.timestamp),
    levelIdx: index("error_logs_level_idx").on(table.level),
  })
);

export type ErrorLog = typeof errorLogs.$inferSelect;
export type NewErrorLog = typeof errorLogs.$inferInsert;
