import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { photoDigitizationInternalNotes } from "./photoDigitizationInternalNotes";

export type AccessType = "view" | "edit" | "delete" | "create";

export const photoDigitizationAccessAuditLog = pgTable(
  "photo_digitization_access_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    internalNoteId: uuid("internal_note_id")
      .notNull()
      .references(() => photoDigitizationInternalNotes.id, { onDelete: "cascade" }),
    accessedBy: text("accessed_by").notNull(),
    accessType: text("access_type").notNull(), // view, edit, delete, create
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => ({
    internalNoteIdIdx: index(
      "photo_digitization_access_audit_log_internal_note_id_idx"
    ).on(table.internalNoteId),
    accessedByIdx: index("photo_digitization_access_audit_log_accessed_by_idx").on(
      table.accessedBy
    ),
    timestampIdx: index("photo_digitization_access_audit_log_timestamp_idx").on(
      table.timestamp
    ),
  })
);

export type PhotoDigitizationAccessAuditLogEntry = typeof photoDigitizationAccessAuditLog.$inferSelect;
export type NewPhotoDigitizationAccessAuditLogEntry = typeof photoDigitizationAccessAuditLog.$inferInsert;
