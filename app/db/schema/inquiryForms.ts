import { pgTable, text, uuid, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { photoDigitizationOrders } from './photoDigitizationOrders';

// Inquiry form status enum
export const inquiryFormStatusEnum = pgEnum('inquiry_form_status', [
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'completed',
]);

export const inquiryForms = pgTable('inquiry_forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .references(() => photoDigitizationOrders.id, { onDelete: 'cascade' })
    .notNull(),
  mediaType: text('media_type').notNull(),
  quantity: integer('quantity').notNull(),
  customerEmail: text('customer_email').notNull(),
  notes: text('notes'),
  status: inquiryFormStatusEnum('status').default('submitted').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Types for TypeScript
export type InquiryForm = typeof inquiryForms.$inferSelect;
export type NewInquiryForm = typeof inquiryForms.$inferInsert;
