import { router, procedure } from '../trpc';
import { z } from 'zod';
import { eventSuggestionsService } from '../../services/eventSuggestions.service';
import { calendarSyncService } from '../../services/calendarSync.service';
import { families, familyMembers } from '~/db/schema';
import { eq, and } from 'drizzle-orm';

export const eventSuggestionsRouter = router({
  suggestEvents: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      // Verify user is a family member
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

      // Get family context
      const familyData = await ctx.db.select().from(families).where(eq(families.id, input.familyId));

      if (familyData.length === 0) {
        throw new Error('Family not found');
      }

      const members = await ctx.db
        .select()
        .from(familyMembers)
        .where(eq(familyMembers.familyId, input.familyId));

      // Build context for AI
      const context = {
        familySize: members.length,
        ageRanges: ['adults', 'teens', 'children'], // Would extract from actual user data
        recentActivities: [], // Would fetch from recent events
        preferences: [], // Would fetch from family settings
      };

      try {
        const suggestions = await eventSuggestionsService.generateEventSuggestions(input.familyId, context);

        return {
          success: true,
          suggestions,
          count: suggestions.length,
          message: suggestions.length > 0 ? 'Suggestions generated successfully' : 'No suggestions available with current family data',
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to generate suggestions';
        return {
          success: false,
          suggestions: [],
          count: 0,
          message,
        };
      }
    }),

  confirmSuggestion: procedure
    .input(
      z.object({
        suggestionId: z.string().uuid(),
        familyId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
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
        const confirmed = await eventSuggestionsService.confirmSuggestion(input.suggestionId);

        if (!confirmed) {
          return {
            success: false,
            message: 'Suggestion not found',
          };
        }

        // Trigger calendar sync if integrations are connected
        try {
          await calendarSyncService.syncConfirmedEvent(input.suggestionId, input.familyId);
        } catch (syncError) {
          console.error('Calendar sync failed:', syncError);
          // Don't fail the confirmation, just log the sync error
        }

        // Clear cache
        eventSuggestionsService.clearCache(input.familyId);

        return {
          success: true,
          suggestion: confirmed,
          message: 'Event confirmed and scheduled',
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to confirm suggestion';
        return {
          success: false,
          message,
        };
      }
    }),

  rejectSuggestion: procedure
    .input(
      z.object({
        suggestionId: z.string().uuid(),
        familyId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
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
        const rejected = await eventSuggestionsService.rejectSuggestion(input.suggestionId);

        if (!rejected) {
          return {
            success: false,
            message: 'Suggestion not found',
          };
        }

        eventSuggestionsService.clearCache(input.familyId);

        return {
          success: true,
          suggestion: rejected,
          message: 'Suggestion rejected',
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to reject suggestion';
        return {
          success: false,
          message,
        };
      }
    }),

  viewSuggestions: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
        status: z.enum(['pending', 'confirmed', 'rejected']).optional(),
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
        const suggestions = await eventSuggestionsService.getSuggestionsByFamily(
          input.familyId,
          input.status
        );

        // Sort by suggested time, newest first
        suggestions.sort((a, b) => new Date(b.suggestedTime).getTime() - new Date(a.suggestedTime).getTime());

        return {
          success: true,
          suggestions,
          count: suggestions.length,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch suggestions';
        return {
          success: false,
          suggestions: [],
          count: 0,
          message,
        };
      }
    }),

  getSuggestion: procedure
    .input(
      z.object({
        suggestionId: z.string().uuid(),
        familyId: z.string().uuid(),
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
        const suggestion = await eventSuggestionsService.getSuggestionById(input.suggestionId);

        if (!suggestion) {
          return {
            success: false,
            suggestion: null,
            message: 'Suggestion not found',
          };
        }

        return {
          success: true,
          suggestion,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch suggestion';
        return {
          success: false,
          suggestion: null,
          message,
        };
      }
    }),
});
