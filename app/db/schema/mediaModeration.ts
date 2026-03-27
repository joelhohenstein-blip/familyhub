import { pgTable, text, timestamp, uuid, varchar, jsonb, real } from "drizzle-orm/pg-core";

export const mediaModeration = pgTable("media_moderation", {
  id: uuid("id")
    .primaryKey()
    .defaultRandom(),
  mediaId: text("media_id").notNull(),
  userId: text("user_id"), // User who uploaded the media
  status: text("status", {
    enum: ["pending", "blocked", "approved", "rejected"],
  }).notNull().default("pending"),
  
  // AI Analysis results
  aiAnalysisResults: text("ai_analysis_results"), // Vision API analysis summary
  violationScore: real("violation_score").default(0), // Confidence score 0-1
  mediaHash: text("media_hash"), // Hash of media for audit trail
  mediaFormat: text("media_format"), // Image format (jpeg, png, etc)
  
  // Moderation info
  moderationNotes: text("moderation_notes"),
  moderatorId: varchar("moderator_id", { length: 128 }),
  contentFlags: jsonb("content_flags"),
  moderationTimestamp: timestamp("moderation_timestamp"),
  
  // Manual review
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: text("reviewed_by"),
  reviewReason: text("review_reason"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MediaModeration = typeof mediaModeration.$inferSelect;
export type NewMediaModeration = typeof mediaModeration.$inferInsert;
