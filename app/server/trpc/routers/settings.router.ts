import { z } from 'zod';
import { router, procedure } from '../trpc';
import { settings, userPreferences, apiKeys, agentPermissions } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

const updateSettingsSchema = z.unknown();

const updatePreferencesSchema = z.object({
  channelId: z.number().optional(),
  themeMode: z.enum(["light", "dark"]).optional(),
  notificationsEnabled: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  privateMessagesAllowed: z.boolean().optional(),
  metadata: z.unknown().optional(),
});

const createApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  scopes: z.array(z.string()).default([]),
});

const revokeApiKeySchema = z.object({ keyId: z.number() });

const rotateApiKeySchema = z.object({ keyId: z.number() });

const getPermissionsByAgentSchema = z.object({ agentId: z.string() });

const setPermissionSchema = z.object({
  agentId: z.string(),
  permissionKey: z.string().min(1),
  allowed: z.boolean(),
  metadata: z.unknown().optional(),
});

const deletePermissionsForAgentSchema = z.object({ agentId: z.string() });

export const settingsRouter = router({
  // Get user settings
  getSettings: procedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new Error("User must be authenticated");
    }

    const userSettings = await ctx.db.query.settings.findFirst({
      where: eq(settings.userId, ctx.user.id),
    });

    if (!userSettings) {
      // Create default settings if they don't exist
      const [newSettings] = await ctx.db
        .insert(settings)
        .values({
          userId: ctx.user.id,
          language: "en",
          videoEnabled: true,
          audioEnabled: true,
        })
        .returning();
      
      return newSettings;
    }

    return userSettings;
  }),

  // Update user settings
  updateSettings: procedure
    .input(updateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      const existingSettings = await ctx.db.query.settings.findFirst({
        where: eq(settings.userId, ctx.user.id),
      });

      if (!existingSettings) {
        throw new Error("Settings not found");
      }

      const [updated] = await ctx.db
        .update(settings)
        .set({
          ...(input as any),
          updatedAt: new Date(),
        })
        .where(eq(settings.id, existingSettings.id))
        .returning();

      return updated;
    }),

  // Get user preferences
  getUserPreferences: procedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new Error("User must be authenticated");
    }

    const prefs = await ctx.db.query.userPreferences.findMany({
      where: eq(userPreferences.userId, ctx.user.id),
    });

    return prefs;
  }),

  // Update user preferences
  updatePreferences: procedure
    .input(updatePreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      const existing = await ctx.db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, ctx.user.id),
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(userPreferences)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(userPreferences.id, existing.id))
          .returning();
        return updated;
      } else {
        const [created] = await ctx.db
          .insert(userPreferences)
          .values({
            userId: ctx.user.id,
            ...input,
          })
          .returning();
        return created;
      }
    }),

  // API Keys management
  listApiKeys: procedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new Error("User must be authenticated");
    }

    const keys = await ctx.db.query.apiKeys.findMany({
      where: eq(apiKeys.userId, ctx.user.id),
    });

    // Mask the key hashes for display
    return keys.map((key: any) => ({
      ...key,
      keyHash: key.keyHash.substring(0, 8) + "..." + key.keyHash.slice(-4),
    }));
  }),

  createApiKey: procedure
    .input(createApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      const keyHash = crypto.getRandomValues(new Uint8Array(32)).toString();

      const [created] = await ctx.db
        .insert(apiKeys)
        .values({
          userId: ctx.user.id,
          name: input.name,
          keyHash,
          scopes: input.scopes,
        })
        .returning();

      return created;
    }),

  revokeApiKey: procedure
    .input(revokeApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      const key = await ctx.db.query.apiKeys.findFirst({
        where: eq(apiKeys.id, input.keyId),
      });

      if (!key || key.userId !== ctx.user.id) {
        throw new Error("Cannot revoke this API key");
      }

      const [updated] = await ctx.db
        .update(apiKeys)
        .set({
          revokedAt: new Date(),
        })
        .where(eq(apiKeys.id, input.keyId))
        .returning();

      return updated;
    }),

  rotateApiKey: procedure
    .input(rotateApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      const key = await ctx.db.query.apiKeys.findFirst({
        where: eq(apiKeys.id, input.keyId),
      });

      if (!key || key.userId !== ctx.user.id) {
        throw new Error("Cannot rotate this API key");
      }

      const newKeyHash = crypto.getRandomValues(new Uint8Array(32)).toString();

      const [updated] = await ctx.db
        .update(apiKeys)
        .set({
          keyHash: newKeyHash,
          lastRotatedAt: new Date(),
        })
        .where(eq(apiKeys.id, input.keyId))
        .returning();

      return updated;
    }),

  // Agent permissions management
  getPermissionsByAgent: procedure
    .input(getPermissionsByAgentSchema)
    .query(async ({ ctx, input }) => {
      const perms = await ctx.db.query.agentPermissions.findMany({
        where: eq(agentPermissions.agentId, input.agentId as any),
      });

      return perms;
    }),

  setPermission: procedure
    .input(setPermissionSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.agentPermissions.findFirst({
        where: and(
          eq(agentPermissions.agentId, input.agentId as any),
          eq(agentPermissions.permissionKey, input.permissionKey)
        ),
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(agentPermissions)
          .set({
            allowed: input.allowed,
            metadata: input.metadata,
            updatedAt: new Date(),
          })
          .where(eq(agentPermissions.id, existing.id))
          .returning();
        return updated;
      } else {
        const [created] = await ctx.db
          .insert(agentPermissions)
          .values({
            agentId: input.agentId as any,
            permissionKey: input.permissionKey,
            allowed: input.allowed,
            metadata: input.metadata,
          })
          .returning();
        return created;
      }
    }),

  deletePermissionsForAgent: procedure
    .input(deletePermissionsForAgentSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(agentPermissions)
        .where(eq(agentPermissions.agentId, input.agentId as any));

      return { success: true };
    }),
});
