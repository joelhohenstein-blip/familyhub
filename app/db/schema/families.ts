import { pgTable, uuid, varchar, timestamp, text, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './auth';

// Define Families table
export const families = pgTable('families', {
  id: uuid('id').primaryKey().defaultRandom(),
  surname: varchar('surname', { length: 255 }).notNull().unique(),
  ownerId: uuid('owner_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  avatarUrl: text('avatar_url'),
  description: text('description'),
  settings: json('settings'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const familiesRelations = relations(families, ({ one }) => ({
  owner: one(users, {
    fields: [families.ownerId],
    references: [users.id],
  }),
}));

// Types for TypeScript
export type Family = typeof families.$inferSelect;
export type NewFamily = typeof families.$inferInsert;
