import { pgTable, text, uuid, timestamp, index, boolean } from "drizzle-orm/pg-core";
import { photoDigitizationProjectThreads } from "./photoDigitizationProjectThreads";
import { users } from "./auth";

/**
 * Project Thread Messages Table
 * Individual messages within a project thread
 * Supports message content, status tracking, and audit trails
 */
export const photoDigitizationProjectThreadMessages = pgTable(
  "photo_digitization_project_thread_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => photoDigitizationProjectThreads.id, {
        onDelete: "cascade",
      }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    content: text("content").notNull(),
    status: text("status").notNull().default("sent"), // sent, delivered, read
    readAt: timestamp("read_at"),
    isEdited: boolean("is_edited").default(false),
    editedAt: timestamp("edited_at"),
    editedBy: uuid("edited_by").references(() => users.id, {
      onDelete: "set null",
    }),
    attachmentUrls: text("attachment_urls").array().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    threadIdIdx: index(
      "photo_digitization_project_thread_messages_thread_id_idx"
    ).on(table.threadId),
    senderIdIdx: index(
      "photo_digitization_project_thread_messages_sender_id_idx"
    ).on(table.senderId),
    createdAtIdx: index(
      "photo_digitization_project_thread_messages_created_at_idx"
    ).on(table.createdAt),
    statusIdx: index("photo_digitization_project_thread_messages_status_idx").on(
      table.status
    ),
  })
);

export type PhotoDigitizationProjectThreadMessage =
  typeof photoDigitizationProjectThreadMessages.$inferSelect;
export type NewPhotoDigitizationProjectThreadMessage =
  typeof photoDigitizationProjectThreadMessages.$inferInsert;
