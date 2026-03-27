import { pgTable, text, timestamp, uuid, varchar, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './auth';
import { families } from './families';

/**
 * Announcements Schema
 * 
 * For geographically dispersed, multigenerational families:
 * - Family-wide broadcast messages (not threaded like message board)
 * - Admin/owner can create important announcements
 * - Pinned announcements for critical information
 * - Read receipts for tracking acknowledgment across generations
 * - Categories (Family News, Events, Reminders, Important, Milestones)
 */
export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 50 })
    .notNull()
    .default('family_news'), // family_news, events, reminders, important, milestones
  isPinned: boolean('is_pinned').default(false),
  expiresAt: timestamp('expires_at'), // Optional: announcement auto-hides after date
  status: varchar('status', { length: 20 })
    .notNull()
    .default('published'), // draft, published, archived
  priority: integer('priority').default(0), // 0=normal, 1=high, 2=urgent
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Announcement Read Receipts
 * Tracks which family members have seen/acknowledged each announcement
 * Important for multigenerational families to ensure all ages are informed
 */
export const announcementReadReceipts = pgTable('announcement_read_receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  announcementId: uuid('announcement_id')
    .notNull()
    .references(() => announcements.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  readAt: timestamp('read_at').notNull().defaultNow(),
  acknowledged: boolean('acknowledged').default(false), // User explicitly confirmed reading
  acknowledgedAt: timestamp('acknowledged_at'),
});

/**
 * Announcement Attachments
 * Support for media (images, documents) in announcements
 */
export const announcementAttachments = pgTable('announcement_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  announcementId: uuid('announcement_id')
    .notNull()
    .references(() => announcements.id, { onDelete: 'cascade' }),
  mediaUrl: varchar('media_url', { length: 500 }).notNull(),
  mediaType: varchar('media_type', { length: 50 }).notNull(), // image, document, video
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileSize: integer('file_size'), // in bytes
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
});

// Relations
export const announcementsRelations = relations(announcements, ({ one, many }) => ({
  family: one(families, {
    fields: [announcements.familyId],
    references: [families.id],
  }),
  creator: one(users, {
    fields: [announcements.createdBy],
    references: [users.id],
  }),
  readReceipts: many(announcementReadReceipts),
  attachments: many(announcementAttachments),
}));

export const announcementReadReceiptsRelations = relations(announcementReadReceipts, ({ one }) => ({
  announcement: one(announcements, {
    fields: [announcementReadReceipts.announcementId],
    references: [announcements.id],
  }),
  user: one(users, {
    fields: [announcementReadReceipts.userId],
    references: [users.id],
  }),
}));

export const announcementAttachmentsRelations = relations(announcementAttachments, ({ one }) => ({
  announcement: one(announcements, {
    fields: [announcementAttachments.announcementId],
    references: [announcements.id],
  }),
}));

// Types
export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
export type AnnouncementReadReceipt = typeof announcementReadReceipts.$inferSelect;
export type NewAnnouncementReadReceipt = typeof announcementReadReceipts.$inferInsert;
export type AnnouncementAttachment = typeof announcementAttachments.$inferSelect;
export type NewAnnouncementAttachment = typeof announcementAttachments.$inferInsert;
