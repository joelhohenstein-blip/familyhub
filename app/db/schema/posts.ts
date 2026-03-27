import { pgTable, text, timestamp, uuid, integer, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { families } from './families';
import { users } from './auth';

export const postsTable = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  parentPostId: uuid('parent_post_id').references((): any => postsTable.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const postMediaTable = pgTable('post_media', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id')
    .notNull()
    .references(() => postsTable.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileSize: integer('file_size').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Create indexes for common queries
export const postsTableIndexes = {
  byFamilyId: 'idx_posts_family_id',
  byAuthorId: 'idx_posts_author_id',
  byParentId: 'idx_posts_parent_id',
  byCreatedAt: 'idx_posts_created_at',
};

// Relations
export const postsRelations = relations(postsTable, ({ one, many }) => ({
  family: one(families, {
    fields: [postsTable.familyId],
    references: [families.id],
  }),
  author: one(users, {
    fields: [postsTable.authorId],
    references: [users.id],
  }),
  parent: one(postsTable, {
    fields: [postsTable.parentPostId],
    references: [postsTable.id],
  }),
  replies: many(postsTable),
  media: many(postMediaTable),
}));

export const postMediaRelations = relations(postMediaTable, ({ one }) => ({
  post: one(postsTable, {
    fields: [postMediaTable.postId],
    references: [postsTable.id],
  }),
}));

// Types
export type Post = typeof postsTable.$inferSelect;
export type NewPost = typeof postsTable.$inferInsert;
export type PostMedia = typeof postMediaTable.$inferSelect;
export type NewPostMedia = typeof postMediaTable.$inferInsert;
