import { pgTable, text, uuid, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { photoDigitizationOrders, orderStatusEnum } from './photoDigitizationOrders';

export const photoDigitizationStatusHistory = pgTable('photo_digitization_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull(),
  previousStatus: orderStatusEnum('previous_status'),
  newStatus: orderStatusEnum('new_status').notNull(),
  changedBy: text('changed_by').notNull(), // admin user ID
  changedAt: timestamp('changed_at').defaultNow().notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
