import { pgTable, text, timestamp, uuid, varchar, jsonb } from "drizzle-orm/pg-core";

export const auditLog = pgTable("audit_log", {
  id: uuid("id")
    .primaryKey()
    .defaultRandom(),
  familyId: uuid("family_id"),
  actionType: text("action_type").notNull(),
  actorId: varchar("actor_id", { length: 128 }).notNull(),
  targetId: varchar("target_id", { length: 128 }),
  targetType: text("target_type"),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
