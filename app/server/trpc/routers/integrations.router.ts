import { z } from "zod";
import { router, procedure } from "../trpc";
import { integrationSettings, auditLog, familyMembers } from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import { logAction } from "../../../utils/auditLog.server";

// Helper to check admin access
async function requireAdminAccess(ctx: any) {
  if (!ctx.user?.id) {
    throw new Error("User must be authenticated");
  }

  const [userMembership] = await ctx.db
    .select()
    .from(familyMembers)
    .where(
      and(
        eq(familyMembers.userId, ctx.user.id),
        eq(familyMembers.role, "admin")
      )
    )
    .limit(1);

  if (!userMembership) {
    throw new Error("Only admins can update integration settings");
  }
}

// Zod schemas for validation
const updateWebSocketSettingsSchema = z.object({
  enabled: z.boolean(),
});

const updateJitsiSettingsSchema = z.object({
  enabled: z.boolean(),
  serverUrl: z.string().url().optional(),
});

const updateWeatherSettingsSchema = z.object({
  enabled: z.boolean(),
  dataSource: z.string().optional(),
  localeDetection: z.boolean().optional(),
});

const updateI18nSettingsSchema = z.object({
  enabled: z.boolean(),
  defaultLocale: z.string().optional(),
  browserDetection: z.boolean().optional(),
});

export const integrationsRouter = router({
  // Get all integration settings
  getIntegrationSettings: procedure.query(async ({ ctx }) => {
    await requireAdminAccess(ctx);

    // Get or create default settings
    let [settings] = await ctx.db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.settingKey, "global"))
      .limit(1);

    if (!settings) {
      // Create default settings
      const [newSettings] = await ctx.db
        .insert(integrationSettings)
        .values({
          settingKey: "global",
          webSocketEnabled: true,
          webSocketHealthStatus: "healthy",
          jitsiEnabled: true,
          weatherEnabled: true,
          i18nEnabled: true,
          i18nDefaultLocale: "en-US",
          i18nBrowserDetection: true,
          weatherLocaleDetection: true,
        })
        .returning();
      settings = newSettings;
    }

    return settings;
  }),

  // Update WebSocket settings
  updateWebSocketSettings: procedure
    .input(updateWebSocketSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      await requireAdminAccess(ctx);

      // Get or create settings
      let [settings] = await ctx.db
        .select()
        .from(integrationSettings)
        .where(eq(integrationSettings.settingKey, "global"))
        .limit(1);

      if (!settings) {
        const [newSettings] = await ctx.db
          .insert(integrationSettings)
          .values({
            settingKey: "global",
            webSocketEnabled: input.enabled,
            webSocketHealthStatus: input.enabled ? "healthy" : "offline",
          })
          .returning();
        settings = newSettings;
      } else {
        const [updated] = await ctx.db
          .update(integrationSettings)
          .set({
            webSocketEnabled: input.enabled,
            webSocketHealthStatus: input.enabled ? "healthy" : "offline",
            updatedAt: new Date(),
          })
          .where(eq(integrationSettings.id, settings.id))
          .returning();
        settings = updated;
      }

      // Log the action
      if (ctx.user?.id) {
        await logAction({
          actionType: "UPDATE_WEBSOCKET_SETTINGS",
          actorId: ctx.user.id,
          targetType: "integration",
          description: `Admin ${ctx.user.id} updated WebSocket settings: enabled=${input.enabled}`,
          metadata: {
            webSocketEnabled: input.enabled,
          },
        });
      }

      return settings;
    }),

  // Check WebSocket health
  checkWebSocketHealth: procedure.query(async ({ ctx }) => {
    await requireAdminAccess(ctx);

    // Get settings
    const [settings] = await ctx.db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.settingKey, "global"))
      .limit(1);

    if (!settings) {
      return {
        status: "offline",
        message: "WebSocket integration not configured",
      };
    }

    // Simple health check - in production would connect to actual WebSocket
    const isHealthy =
      settings.webSocketEnabled && settings.webSocketHealthStatus === "healthy";

    return {
      enabled: settings.webSocketEnabled,
      status: settings.webSocketHealthStatus,
      isHealthy,
      message: isHealthy ? "WebSocket connection healthy" : "WebSocket unavailable",
      lastUpdated: settings.updatedAt,
    };
  }),

  // Update Jitsi settings
  updateJitsiSettings: procedure
    .input(updateJitsiSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      await requireAdminAccess(ctx);

      // Get or create settings
      let [settings] = await ctx.db
        .select()
        .from(integrationSettings)
        .where(eq(integrationSettings.settingKey, "global"))
        .limit(1);

      if (!settings) {
        const [newSettings] = await ctx.db
          .insert(integrationSettings)
          .values({
            settingKey: "global",
            jitsiEnabled: input.enabled,
            jitsiServerUrl: input.serverUrl,
          })
          .returning();
        settings = newSettings;
      } else {
        const [updated] = await ctx.db
          .update(integrationSettings)
          .set({
            jitsiEnabled: input.enabled,
            jitsiServerUrl: input.serverUrl,
            updatedAt: new Date(),
          })
          .where(eq(integrationSettings.id, settings.id))
          .returning();
        settings = updated;
      }

      // Log the action
      if (ctx.user?.id) {
        await logAction({
          actionType: "UPDATE_JITSI_SETTINGS",
          actorId: ctx.user.id,
          targetType: "integration",
          description: `Admin ${ctx.user.id} updated Jitsi settings: enabled=${input.enabled}`,
          metadata: {
            jitsiEnabled: input.enabled,
            serverUrl: input.serverUrl,
          },
        });
      }

      return settings;
    }),

  // Update weather settings
  updateWeatherSettings: procedure
    .input(updateWeatherSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      await requireAdminAccess(ctx);

      // Get or create settings
      let [settings] = await ctx.db
        .select()
        .from(integrationSettings)
        .where(eq(integrationSettings.settingKey, "global"))
        .limit(1);

      if (!settings) {
        const [newSettings] = await ctx.db
          .insert(integrationSettings)
          .values({
            settingKey: "global",
            weatherEnabled: input.enabled,
            weatherDataSource: input.dataSource,
            weatherLocaleDetection: input.localeDetection,
          })
          .returning();
        settings = newSettings;
      } else {
        const [updated] = await ctx.db
          .update(integrationSettings)
          .set({
            weatherEnabled: input.enabled,
            weatherDataSource: input.dataSource ?? settings.weatherDataSource,
            weatherLocaleDetection:
              input.localeDetection ?? settings.weatherLocaleDetection,
            updatedAt: new Date(),
          })
          .where(eq(integrationSettings.id, settings.id))
          .returning();
        settings = updated;
      }
      // Log the action
      if (ctx.user?.id) {
        await logAction({
          actionType: "UPDATE_WEATHER_SETTINGS",
          actorId: ctx.user.id,
          targetType: "integration",
          description: `Admin ${ctx.user.id} updated weather settings: enabled=${input.enabled}`,
          metadata: {
            weatherEnabled: input.enabled,
            dataSource: input.dataSource,
            localeDetection: input.localeDetection,
          },
        });
      }

      return settings;
    }),

  // Update i18n settings
  updateI18nSettings: procedure
    .input(updateI18nSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      await requireAdminAccess(ctx);

      // Get or create settings
      let [settings] = await ctx.db
        .select()
        .from(integrationSettings)
        .where(eq(integrationSettings.settingKey, "global"))
        .limit(1);

      if (!settings) {
        const [newSettings] = await ctx.db
          .insert(integrationSettings)
          .values({
            settingKey: "global",
            i18nEnabled: input.enabled,
            i18nDefaultLocale: input.defaultLocale,
            i18nBrowserDetection: input.browserDetection,
          })
          .returning();
        settings = newSettings;
      } else {
        const [updated] = await ctx.db
          .update(integrationSettings)
          .set({
            i18nEnabled: input.enabled,
            i18nDefaultLocale: input.defaultLocale ?? settings.i18nDefaultLocale,
            i18nBrowserDetection:
              input.browserDetection ?? settings.i18nBrowserDetection,
            updatedAt: new Date(),
          })
          .where(eq(integrationSettings.id, settings.id))
          .returning();
        settings = updated;
      }


      // Log the action
      if (ctx.user?.id) {
        await logAction({
          actionType: "UPDATE_I18N_SETTINGS",
          actorId: ctx.user.id,
          targetType: "integration",
          description: `Admin ${ctx.user.id} updated i18n settings: enabled=${input.enabled}`,
          metadata: {
            i18nEnabled: input.enabled,
            defaultLocale: input.defaultLocale,
            browserDetection: input.browserDetection,
          },
        });
      }

      return settings;
    }),
});
