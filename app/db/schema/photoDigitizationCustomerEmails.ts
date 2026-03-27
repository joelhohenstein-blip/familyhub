import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { photoDigitizationOrders } from "./photoDigitizationOrders";

export const photoDigitizationCustomerEmails = pgTable(
  "photo_digitization_customer_emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => photoDigitizationOrders.id, { onDelete: "cascade" }),
    encryptedEmail: text("encrypted_email").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    accessedAt: timestamp("accessed_at"),
  },
  (table) => ({
    orderIdIdx: index("photo_digitization_customer_emails_order_id_idx").on(
      table.orderId
    ),
    createdByIdx: index("photo_digitization_customer_emails_created_by_idx").on(
      table.createdBy
    ),
  })
);

export type PhotoDigitizationCustomerEmail = typeof photoDigitizationCustomerEmails.$inferSelect;
export type NewPhotoDigitizationCustomerEmail = typeof photoDigitizationCustomerEmails.$inferInsert;
