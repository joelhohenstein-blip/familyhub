import { pgTable, text, boolean, real, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';

export const messageModerationLogs = pgTable('message_moderation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Message context
  messageId: text('message_id').notNull(),
  userId: text('user_id').notNull(), // User who sent the message
  content: text('content').notNull(), // Original message content
  
  // Moderation results
  flagged: boolean('flagged').notNull().default(false),
  score: real('score').notNull().default(0), // Violation score 0-1
  reasons: jsonb('reasons').notNull().$type<string[]>().default([]), // Array of violation reasons
  obfuscationDetected: boolean('obfuscation_detected').notNull().default(false),
  normalizedText: text('normalized_text'), // Text with obfuscations clarified
  
  // Moderation decision
  status: text('status').notNull().default('pending_review'), // pending_review, flagged_auto, approved, rejected
  
  // Manual review info
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: text('reviewed_by'), // Admin user ID
  reviewReason: text('review_reason'), // Why the decision was made
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at').notNull().$defaultFn(() => new Date()),
});

export type MessageModerationLog = typeof messageModerationLogs.$inferSelect;
export type NewMessageModerationLog = typeof messageModerationLogs.$inferInsert;
