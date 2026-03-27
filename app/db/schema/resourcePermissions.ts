import {
  pgTable,
  text,
  uuid,
  timestamp,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./auth";
import { families } from "./families";

export const resourcePermissionsTable = pgTable(
  "resource_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resourceType: varchar("resource_type", { length: 50 }).notNull(), // 'calendar', 'albums', 'posts', 'messages', 'messages_board', etc.
    resourceId: uuid("resource_id").notNull(), // ID of the specific resource
    permission: varchar("permission", { length: 50 }).notNull(), // 'read', 'write', 'delete', 'admin', etc.
    grantedBy: uuid("granted_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }), // Who granted this permission
    grantedAt: timestamp("granted_at").notNull().defaultNow(),
    revokedAt: timestamp("revoked_at"), // NULL if still active
    revokedBy: uuid("revoked_by").references(() => users.id, {
      onDelete: "set null",
    }), // Who revoked this permission
  },
  (table) => [
    index("resource_permissions_family_id_idx").on(table.familyId),
    index("resource_permissions_user_id_idx").on(table.userId),
    index("resource_permissions_resource_idx").on(
      table.resourceType,
      table.resourceId
    ),
    index("resource_permissions_active_idx").on(table.revokedAt), // For filtering active permissions
  ]
);

export const resourcePermissionsRelations = relations(
  resourcePermissionsTable,
  ({ one }) => ({
    family: one(families, {
      fields: [resourcePermissionsTable.familyId],
      references: [families.id],
    }),
    user: one(users, {
      fields: [resourcePermissionsTable.userId],
      references: [users.id],
    }),
    grantedByUser: one(users, {
      fields: [resourcePermissionsTable.grantedBy],
      references: [users.id],
    }),
    revokedByUser: one(users, {
      fields: [resourcePermissionsTable.revokedBy],
      references: [users.id],
    }),
  })
);

export type ResourcePermission = typeof resourcePermissionsTable.$inferSelect;
export type NewResourcePermission = typeof resourcePermissionsTable.$inferInsert;
