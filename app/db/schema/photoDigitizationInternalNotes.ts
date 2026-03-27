import { pgTable, text, timestamp, uuid, index, boolean } from "drizzle-orm/pg-core";
import { photoDigitizationOrders } from "./photoDigitizationOrders";

export const photoDigitizationInternalNotes = pgTable(
  "photo_digitization_internal_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => photoDigitizationOrders.id, { onDelete: "cascade" }),
    createdBy: text("created_by").notNull(),
    content: text("content").notNull(),
    attachmentUrls: text("attachment_urls").array().default([]),
    isLinkedToEmail: boolean("is_linked_to_email").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orderIdIdx: index("photo_digitization_internal_notes_order_id_idx").on(
      table.orderId
    ),
    createdByIdx: index("photo_digitization_internal_notes_created_by_idx").on(
      table.createdBy
    ),
  })
);

export type PhotoDigitizationInternalNote = typeof photoDigitizationInternalNotes.$inferSelect;
export type NewPhotoDigitizationInternalNote = typeof photoDigitizationInternalNotes.$inferInsert;
