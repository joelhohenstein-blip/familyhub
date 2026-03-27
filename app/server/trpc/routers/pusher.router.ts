import { z } from 'zod';
import { router, procedure } from '../trpc';
import { pusher } from '~/utils/pusher.server';
import { familyMembers } from '~/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Pusher authentication and management router
 * Handles private channel authentication for real-time family messaging
 */
export const pusherRouter = router({
  /**
   * Authenticate a user for a private Pusher channel
   * Verifies the user is a member of the family before granting access
   */
  authenticateChannel: procedure
    .input(
      z.object({
        socketId: z.string(),
        channelName: z.string(),
        familyId: z.string().uuid('Invalid family ID'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('You are not a member of this family');
      }

      // Verify channel name matches expected format
      const expectedChannelName = `private-family-${input.familyId}`;
      if (input.channelName !== expectedChannelName) {
        throw new Error('Invalid channel name');
      }

      try {
        // Authorize the Pusher channel
        const auth = pusher.authorizeChannel(input.socketId, input.channelName);
        return auth;
      } catch (error) {
        console.error('Pusher authorization error:', error);
        throw new Error('Failed to authorize Pusher channel');
      }
    }),

  /**
   * Get presence info for a family channel
   * Returns list of connected users in the channel
   */
  getChannelPresence: procedure
    .input(
      z.object({
        familyId: z.string().uuid('Invalid family ID'),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('You are not a member of this family');
      }

      try {
        // Get channel info from Pusher
        const channelName = `private-family-${input.familyId}`;
        const response: any = await pusher.get({
          path: `/channels/${channelName}`,
        });

        return {
          channelName,
          occupied: response?.occupied || false,
          subscription_count: response?.subscription_count || 0,
        };
      } catch (error) {
        console.error('Failed to get channel presence:', error);
        // Return empty presence info on error
        return {
          channelName: `private-family-${input.familyId}`,
          occupied: false,
          subscription_count: 0,
        };
      }
    }),
});
