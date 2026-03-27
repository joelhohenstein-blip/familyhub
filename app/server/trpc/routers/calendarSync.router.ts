import { router, procedure } from '../trpc';
import { z } from 'zod';
import { calendarSyncService } from '../../services/calendarSync.service';
import { calendarIntegrations, familyMembers } from '~/db/schema';
import { eq, and } from 'drizzle-orm';

export const calendarSyncRouter = router({
  setupGoogleCalendar: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
        authCode: z.string(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      // Verify user is admin of family
      const memberCheck = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user?.id || ''),
            eq(familyMembers.role, 'admin')
          )
        );

      if (memberCheck.length === 0) {
        throw new Error('Unauthorized: Admin access required');
      }

      try {
        // In production, exchange authCode for access token using Google OAuth
        // For now, simulate the token exchange
        const accessToken = `google_access_token_${Date.now()}`;
        const refreshToken = `google_refresh_token_${Date.now()}`;
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        // Check if integration already exists
        const existing = await ctx.db
          .select()
          .from(calendarIntegrations)
          .where(
            and(
              eq(calendarIntegrations.familyId, input.familyId),
              eq(calendarIntegrations.provider, 'google')
            )
          );

        let result;
        if (existing.length > 0) {
          // Update existing
          result = await ctx.db
            .update(calendarIntegrations)
            .set({
              accessToken: calendarSyncService.encryptToken(accessToken),
              refreshToken: calendarSyncService.encryptToken(refreshToken),
              tokenExpiresAt: expiresAt,
              isActive: true,
            })
            .where(eq(calendarIntegrations.id, existing[0].id))
            .returning();
        } else {
          // Create new
          result = await ctx.db
            .insert(calendarIntegrations)
            .values({
              familyId: input.familyId,
              provider: 'google',
              accessToken: calendarSyncService.encryptToken(accessToken),
              refreshToken: calendarSyncService.encryptToken(refreshToken),
              tokenExpiresAt: expiresAt,
              isActive: true,
            })
            .returning();
        }

        return {
          success: true,
          message: 'Google Calendar connected successfully',
          integration: {
            id: result[0].id,
            provider: result[0].provider,
            isActive: result[0].isActive,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to setup Google Calendar';
        return {
          success: false,
          message,
        };
      }
    }),

  setupOutlookCalendar: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
        authCode: z.string(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      // Verify user is admin of family
      const memberCheck = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user?.id || ''),
            eq(familyMembers.role, 'admin')
          )
        );

      if (memberCheck.length === 0) {
        throw new Error('Unauthorized: Admin access required');
      }

      try {
        // In production, exchange authCode for access token using Microsoft OAuth
        // For now, simulate the token exchange
        const accessToken = `outlook_access_token_${Date.now()}`;
        const refreshToken = `outlook_refresh_token_${Date.now()}`;
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        // Check if integration already exists
        const existing = await ctx.db
          .select()
          .from(calendarIntegrations)
          .where(
            and(
              eq(calendarIntegrations.familyId, input.familyId),
              eq(calendarIntegrations.provider, 'outlook')
            )
          );

        let result;
        if (existing.length > 0) {
          // Update existing
          result = await ctx.db
            .update(calendarIntegrations)
            .set({
              accessToken: calendarSyncService.encryptToken(accessToken),
              refreshToken: calendarSyncService.encryptToken(refreshToken),
              tokenExpiresAt: expiresAt,
              isActive: true,
            })
            .where(eq(calendarIntegrations.id, existing[0].id))
            .returning();
        } else {
          // Create new
          result = await ctx.db
            .insert(calendarIntegrations)
            .values({
              familyId: input.familyId,
              provider: 'outlook',
              accessToken: calendarSyncService.encryptToken(accessToken),
              refreshToken: calendarSyncService.encryptToken(refreshToken),
              tokenExpiresAt: expiresAt,
              isActive: true,
            })
            .returning();
        }

        return {
          success: true,
          message: 'Outlook Calendar connected successfully',
          integration: {
            id: result[0].id,
            provider: result[0].provider,
            isActive: result[0].isActive,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to setup Outlook Calendar';
        return {
          success: false,
          message,
        };
      }
    }),

  disconnectCalendar: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
        provider: z.enum(['google', 'outlook']),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      // Verify user is admin of family
      const memberCheck = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user?.id || ''),
            eq(familyMembers.role, 'admin')
          )
        );

      if (memberCheck.length === 0) {
        throw new Error('Unauthorized: Admin access required');
      }

      try {
        const result = await ctx.db
          .update(calendarIntegrations)
          .set({
            isActive: false,
          })
          .where(
            and(
              eq(calendarIntegrations.familyId, input.familyId),
              eq(calendarIntegrations.provider, input.provider)
            )
          )
          .returning();

        if (result.length === 0) {
          return {
            success: false,
            message: 'Calendar integration not found',
          };
        }

        return {
          success: true,
          message: `${input.provider} Calendar disconnected`,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to disconnect calendar';
        return {
          success: false,
          message,
        };
      }
    }),

  getSyncStatus: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
        provider: z.enum(['google', 'outlook']),
      })
    )
    .query(async ({ input, ctx }: any) => {
      // Verify family membership
      const memberCheck = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user?.id || '')
          )
        );

      if (memberCheck.length === 0) {
        throw new Error('Unauthorized: Not a family member');
      }

      try {
        const status = await calendarSyncService.getSyncStatus(input.familyId, input.provider);
        return {
          success: true,
          status,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get sync status';
        return {
          success: false,
          message,
        };
      }
    }),

  forceSyncNow: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
        provider: z.enum(['google', 'outlook']),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      // Verify user is admin of family
      const memberCheck = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user?.id || ''),
            eq(familyMembers.role, 'admin')
          )
        );

      if (memberCheck.length === 0) {
        throw new Error('Unauthorized: Admin access required');
      }

      try {
        // In production, this would sync all pending events for this provider
        // For now, just update the lastSyncAt timestamp
        const integration = await ctx.db
          .select()
          .from(calendarIntegrations)
          .where(
            and(
              eq(calendarIntegrations.familyId, input.familyId),
              eq(calendarIntegrations.provider, input.provider)
            )
          );

        if (integration.length === 0) {
          return {
            success: false,
            message: 'Calendar integration not found',
          };
        }

        await ctx.db
          .update(calendarIntegrations)
          .set({
            lastSyncAt: new Date(),
          })
          .where(eq(calendarIntegrations.id, integration[0].id));

        return {
          success: true,
          message: `${input.provider} Calendar synced successfully`,
          lastSyncAt: new Date(),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to sync calendar';
        return {
          success: false,
          message,
        };
      }
    }),

  getSyncHistory: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input, ctx }: any) => {
      // Verify family membership
      const memberCheck = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user?.id || '')
          )
        );

      if (memberCheck.length === 0) {
        throw new Error('Unauthorized: Not a family member');
      }

      try {
        const history = await calendarSyncService.getSyncHistory(input.familyId, input.limit);
        return {
          success: true,
          history,
          count: history.length,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch sync history';
        return {
          success: false,
          history: [],
          count: 0,
          message,
        };
      }
    }),
});
