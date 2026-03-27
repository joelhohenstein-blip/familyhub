import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { photoDigitizationPrivateFolders } from "./photoDigitizationPrivateFolders";
import { users } from "./auth";

export type FolderAccessType = "view" | "create" | "edit" | "delete" | "download";

/**
 * Folder Access Logs Table
 * Audit trail for all access and modifications to private project folders
 * Tracks who accessed what, when, and what action was performed
 */
export const photoDigitizationFolderAccessLogs = pgTable(
  "photo_digitization_folder_access_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    folderId: uuid("folder_id")
      .notNull()
      .references(() => photoDigitizationPrivateFolders.id, {
        onDelete: "cascade",
      }),
    accessedBy: uuid("accessed_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    accessType: text("access_type").notNull(), // view, create, edit, delete, download
    itemId: uuid("item_id"), // ID of the specific item accessed within the folder
    itemName: text("item_name"),
    description: text("description"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => ({
    folderIdIdx: index("photo_digitization_folder_access_logs_folder_id_idx").on(
      table.folderId
    ),
    accessedByIdx: index(
      "photo_digitization_folder_access_logs_accessed_by_idx"
    ).on(table.accessedBy),
    timestampIdx: index("photo_digitization_folder_access_logs_timestamp_idx").on(
      table.timestamp
    ),
    accessTypeIdx: index("photo_digitization_folder_access_logs_access_type_idx").on(
      table.accessType
    ),
  })
);

export type PhotoDigitizationFolderAccessLog =
  typeof photoDigitizationFolderAccessLogs.$inferSelect;
export type NewPhotoDigitizationFolderAccessLog =
  typeof photoDigitizationFolderAccessLogs.$inferInsert;
