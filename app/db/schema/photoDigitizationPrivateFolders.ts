import { pgTable, text, uuid, timestamp, index, boolean } from "drizzle-orm/pg-core";
import { photoDigitizationOrders } from "./photoDigitizationOrders";
import { users } from "./auth";

/**
 * Private Folders Table
 * Represents a private, access-controlled folder for each photo digitization project
 * Ensures sensitive data and job artifacts are isolated from general workflows
 */
export const photoDigitizationPrivateFolders = pgTable(
  "photo_digitization_private_folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .unique()
      .references(() => photoDigitizationOrders.id, { onDelete: "cascade" }),
    folderName: text("folder_name").notNull(),
    description: text("description"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    isLocked: boolean("is_locked").default(false),
    lockedUntil: timestamp("locked_until"),
    lockedReason: text("locked_reason"),
    contentCount: text("content_count").notNull().default("0"),
    lastAccessedAt: timestamp("last_accessed_at"),
    lastModifiedBy: uuid("last_modified_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orderIdIdx: index("photo_digitization_private_folders_order_id_idx").on(
      table.orderId
    ),
    createdByIdx: index("photo_digitization_private_folders_created_by_idx").on(
      table.createdBy
    ),
    isLockedIdx: index("photo_digitization_private_folders_is_locked_idx").on(
      table.isLocked
    ),
    lastAccessedAtIdx: index(
      "photo_digitization_private_folders_last_accessed_at_idx"
    ).on(table.lastAccessedAt),
  })
);

export type PhotoDigitizationPrivateFolder =
  typeof photoDigitizationPrivateFolders.$inferSelect;
export type NewPhotoDigitizationPrivateFolder =
  typeof photoDigitizationPrivateFolders.$inferInsert;
