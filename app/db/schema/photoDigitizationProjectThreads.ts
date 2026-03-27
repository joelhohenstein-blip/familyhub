import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { photoDigitizationOrders } from "./photoDigitizationOrders";
import { users } from "./auth";

/**
 * Project Threads Table
 * Represents a threaded conversation for a specific photo digitization project/order
 * Allows admins and customers to communicate within the context of a project
 */
export const photoDigitizationProjectThreads = pgTable(
  "photo_digitization_project_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => photoDigitizationOrders.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("active"), // active, archived, resolved
    messageCount: text("message_count").notNull().default("0"),
    lastMessageAt: timestamp("last_message_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orderIdIdx: index("photo_digitization_project_threads_order_id_idx").on(
      table.orderId
    ),
    createdByIdx: index("photo_digitization_project_threads_created_by_idx").on(
      table.createdBy
    ),
    statusIdx: index("photo_digitization_project_threads_status_idx").on(
      table.status
    ),
    lastMessageAtIdx: index(
      "photo_digitization_project_threads_last_message_at_idx"
    ).on(table.lastMessageAt),
  })
);

export type PhotoDigitizationProjectThread =
  typeof photoDigitizationProjectThreads.$inferSelect;
export type NewPhotoDigitizationProjectThread =
  typeof photoDigitizationProjectThreads.$inferInsert;
