import { pgTable, varchar, uuid, integer, timestamp, json, text, boolean } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const invoices = pgTable("invoices", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }).unique(),
  
  // Invoice details
  amount: integer("amount").notNull(), // in cents
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  status: varchar("status", { length: 50 }).notNull().default("paid"), // draft, open, paid, uncollectible, void
  
  // Dates
  issuedAt: timestamp("issued_at").notNull(),
  dueAt: timestamp("due_at"),
  paidAt: timestamp("paid_at"),
  
  // Description and metadata
  description: text("description"),
  itemsMetadata: json("items_metadata").$type<Array<{
    description: string;
    amount: number;
    quantity?: number;
  }>>().default([]),
  
  // Invoice document
  pdfUrl: text("pdf_url"),
  
  // Audit
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
