import { pgTable, uuid, varchar, decimal, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

// Define Products table
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  thumbnailUrl: text('thumbnail_url').notNull(),
  dimensions: jsonb('dimensions').$type<{
    width: number;
    height: number;
    depth: number;
  }>().notNull(),
  model3DUrl: text('model_3d_url').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Types for TypeScript
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert; 