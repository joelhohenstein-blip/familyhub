import { pgTable, text, uuid, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const adminSecureFolders = pgTable("admin_secure_folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  encryptedData: text("encrypted_data").notNull(), // AES-256 encrypted JSON
  encryptionKeyHash: text("encryption_key_hash").notNull(), // Hash of encryption key for verification
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  metadata: jsonb("metadata"), // Additional metadata
});

export const adminSecureFolderAccessLogs = pgTable("admin_secure_folder_access_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  folderId: uuid("folder_id").notNull(),
  adminId: uuid("admin_id").notNull(),
  action: text("action").notNull(), // 'CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT'
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdminSecureFolderSchema = createInsertSchema(adminSecureFolders);
export const selectAdminSecureFolderSchema = createSelectSchema(adminSecureFolders);
export const insertAdminSecureFolderAccessLogSchema = createInsertSchema(adminSecureFolderAccessLogs);
export const selectAdminSecureFolderAccessLogSchema = createSelectSchema(adminSecureFolderAccessLogs);
