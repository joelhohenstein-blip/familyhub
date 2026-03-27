import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { adminSecureFolders, adminSecureFolderAccessLogs } from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

// Encryption utilities
const ENCRYPTION_ALGORITHM = "aes-256-cbc";

function encryptData(data: string, encryptionKey: string): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(encryptionKey, "hex");
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return { encrypted, iv: iv.toString("hex") };
}

function decryptData(encrypted: string, encryptionKey: string, iv: string): string {
  const key = Buffer.from(encryptionKey, "hex");
  const ivBuffer = Buffer.from(iv, "hex");
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, ivBuffer);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function hashEncryptionKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// Log access to secure folder
async function logAccess(
  ctx: any,
  folderId: string,
  adminId: string,
  action: string,
  success: boolean = true,
  errorMessage?: string
) {
  try {
    await ctx.db.insert(adminSecureFolderAccessLogs).values({
      folderId,
      adminId,
      action,
      ipAddress: ctx.req?.ip || "unknown",
      userAgent: ctx.req?.headers?.["user-agent"] || "unknown",
      success,
      errorMessage,
    });
  } catch (error) {
    console.error("Failed to log access:", error);
  }
}


export const adminSecureFoldersRouter = router({
  // Create a new secure folder
  createSecureFolder: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        data: z.record(z.string(), z.any()), // Data to store in encrypted folder
        encryptionKey: z.string().min(32), // 256-bit key in hex
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      try {
        // Encrypt the data
        const dataJson = JSON.stringify(input.data);
        const { encrypted, iv } = encryptData(dataJson, input.encryptionKey);
        const encryptedPayload = JSON.stringify({ encrypted, iv });
        const keyHash = hashEncryptionKey(input.encryptionKey);

        // Create folder
        await ctx.db
          .insert(adminSecureFolders)
          .values({
            adminId: ctx.user.id,
            name: input.name,
            description: input.description,
            encryptedData: encryptedPayload,
            encryptionKeyHash: keyHash,
          });

        // Fetch the created folder to get its ID
        const folder = await ctx.db
          .select({ id: adminSecureFolders.id, name: adminSecureFolders.name, createdAt: adminSecureFolders.createdAt })
          .from(adminSecureFolders)
          .where(eq(adminSecureFolders.adminId, ctx.user.id))
          .orderBy((t) => t.createdAt)
          .limit(1);

        // Log access
        if (folder.length > 0) {
          await logAccess(ctx, folder[0].id, ctx.user.id, "CREATE", true);
          return { id: folder[0].id, name: folder[0].name };
        }

        throw new Error("Failed to create secure folder");
      } catch (error) {
        await logAccess(ctx, "unknown", ctx.user.id, "CREATE", false, String(error));
        throw error;
      }
    }),

  // Read secure folder (requires correct encryption key)
  readSecureFolder: adminProcedure
    .input(
      z.object({
        folderId: z.string().uuid(),
        encryptionKey: z.string().min(32),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      try {
        // Fetch folder
        const folder = await ctx.db
          .select()
          .from(adminSecureFolders)
          .where(
            and(
              eq(adminSecureFolders.id, input.folderId),
              eq(adminSecureFolders.adminId, ctx.user.id)
            )
          )
          .limit(1);

        if (!folder.length) {
          throw new Error("Secure folder not found or access denied");
        }

        // Verify encryption key
        const keyHash = hashEncryptionKey(input.encryptionKey);
        if (keyHash !== folder[0].encryptionKeyHash) {
          await logAccess(ctx, input.folderId, ctx.user.id, "READ", false, "Invalid encryption key");
          throw new Error("Invalid encryption key");
        }

        // Decrypt data
        const payload = JSON.parse(folder[0].encryptedData);
        const decrypted = decryptData(payload.encrypted, input.encryptionKey, payload.iv);
        const data = JSON.parse(decrypted);

        // Log access
        await logAccess(ctx, input.folderId, ctx.user.id, "READ", true);

        return {
          id: folder[0].id,
          name: folder[0].name,
          description: folder[0].description,
          data,
          createdAt: folder[0].createdAt,
          updatedAt: folder[0].updatedAt,
        };
      } catch (error) {
        await logAccess(ctx, input.folderId, ctx.user.id, "READ", false, String(error));
        throw error;
      }
    }),

  // Update secure folder
  updateSecureFolder: adminProcedure
    .input(
      z.object({
        folderId: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        data: z.record(z.string(), z.any()).optional(),
        encryptionKey: z.string().min(32),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      try {
        // Fetch folder
        const folder = await ctx.db
          .select()
          .from(adminSecureFolders)
          .where(
            and(
              eq(adminSecureFolders.id, input.folderId),
              eq(adminSecureFolders.adminId, ctx.user.id)
            )
          )
          .limit(1);

        if (!folder.length) {
          throw new Error("Secure folder not found or access denied");
        }

        // Verify encryption key
        const keyHash = hashEncryptionKey(input.encryptionKey);
        if (keyHash !== folder[0].encryptionKeyHash) {
          await logAccess(ctx, input.folderId, ctx.user.id, "UPDATE", false, "Invalid encryption key");
          throw new Error("Invalid encryption key");
        }

        // Prepare update
        const updateData: any = {
          updatedAt: new Date(),
        };

        if (input.name) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;

        if (input.data) {
          const dataJson = JSON.stringify(input.data);
          const { encrypted, iv } = encryptData(dataJson, input.encryptionKey);
          updateData.encryptedData = JSON.stringify({ encrypted, iv });
        }

        // Update folder
        await ctx.db
          .update(adminSecureFolders)
          .set(updateData)
          .where(eq(adminSecureFolders.id, input.folderId));

        // Log access
        await logAccess(ctx, input.folderId, ctx.user.id, "UPDATE", true);

        return { success: true };
      } catch (error) {
        await logAccess(ctx, input.folderId, ctx.user.id, "UPDATE", false, String(error));
        throw error;
      }
    }),

  // Delete secure folder
  deleteSecureFolder: adminProcedure
    .input(
      z.object({
        folderId: z.string().uuid(),
        encryptionKey: z.string().min(32),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      try {
        // Fetch folder
        const folder = await ctx.db
          .select()
          .from(adminSecureFolders)
          .where(
            and(
              eq(adminSecureFolders.id, input.folderId),
              eq(adminSecureFolders.adminId, ctx.user.id)
            )
          )
          .limit(1);

        if (!folder.length) {
          throw new Error("Secure folder not found or access denied");
        }

        // Verify encryption key
        const keyHash = hashEncryptionKey(input.encryptionKey);
        if (keyHash !== folder[0].encryptionKeyHash) {
          await logAccess(ctx, input.folderId, ctx.user.id, "DELETE", false, "Invalid encryption key");
          throw new Error("Invalid encryption key");
        }

        // Delete folder
        await ctx.db.delete(adminSecureFolders).where(eq(adminSecureFolders.id, input.folderId));

        // Log access
        await logAccess(ctx, input.folderId, ctx.user.id, "DELETE", true);

        return { success: true };
      } catch (error) {
        await logAccess(ctx, input.folderId, ctx.user.id, "DELETE", false, String(error));
        throw error;
      }
    }),

  // List admin's secure folders (without decrypting data)
  listSecureFolders: adminProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new Error("User must be authenticated");
    }

    const folders = await ctx.db
      .select({
        id: adminSecureFolders.id,
        name: adminSecureFolders.name,
        description: adminSecureFolders.description,
        createdAt: adminSecureFolders.createdAt,
        updatedAt: adminSecureFolders.updatedAt,
      })
      .from(adminSecureFolders)
      .where(eq(adminSecureFolders.adminId, ctx.user.id));

    return folders;
  }),

  // Get access audit logs for a folder
  getAccessLogs: adminProcedure
    .input(
      z.object({
        folderId: z.string().uuid(),
        limit: z.number().int().positive().max(100).default(50),
        offset: z.number().int().nonnegative().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Verify folder ownership
      const folder = await ctx.db
        .select()
        .from(adminSecureFolders)
        .where(
          and(
            eq(adminSecureFolders.id, input.folderId),
            eq(adminSecureFolders.adminId, ctx.user.id)
          )
        )
        .limit(1);

      if (!folder.length) {
        throw new Error("Secure folder not found or access denied");
      }

      // Get access logs
      const logs = await ctx.db
        .select()
        .from(adminSecureFolderAccessLogs)
        .where(eq(adminSecureFolderAccessLogs.folderId, input.folderId))
        .orderBy((t) => t.createdAt)
        .limit(input.limit)
        .offset(input.offset);

      return logs;
    }),
});
