import { pgTable, text, uuid, timestamp, integer, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './auth';

// Order status enum
export const orderStatusEnum = pgEnum('photo_digitization_order_status', [
  'inquiry_submitted',
  'quantity_verified',
  'payment_pending',
  'payment_confirmed',
  'in_processing',
  'completed',
  'cancelled',
]);

// Item type enum (loose slides or carousel)
export const itemTypeEnum = pgEnum('photo_digitization_item_type', ['loose_slides', 'carousel']);

export const photoDigitizationOrders = pgTable('photo_digitization_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: text('customer_id').notNull(),
  status: orderStatusEnum('status').default('inquiry_submitted').notNull(),
  itemType: itemTypeEnum('item_type').notNull(),
  quantity: integer('quantity').notNull(),
  estimatedPrice: decimal('estimated_price', { precision: 10, scale: 2 }),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  dueDate: timestamp('due_date'),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
