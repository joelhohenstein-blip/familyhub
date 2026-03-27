import {
  pgTable,
  text,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
  time,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { families } from "./families";

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    reminderTime: time("reminder_time").notNull(),
    channels: jsonb("channels").notNull().default('["in-app"]'), // ["in-app", "email", "push"]
    enabled: boolean("enabled").notNull().default(true),
    timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("reminders_user_id_idx").on(table.userId),
    reminderTimeIdx: index("reminders_reminder_time_idx").on(table.reminderTime),
    familyIdIdx: index("reminders_family_id_idx").on(table.familyId),
  })
);
