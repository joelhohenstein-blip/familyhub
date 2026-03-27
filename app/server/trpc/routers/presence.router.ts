import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { router, procedure } from '../trpc';
import { emitter } from '~/utils/emitter.server';
import { pusherEvents } from '~/utils/pusher.server';
import { userPresenceTable, familyMembers, users } from '../../../db/schema';
import { eq, and, desc, isNull, gte } from 'drizzle-orm';

// Validation schemas
const updatePresenceSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  status: z.enum(['online', 'offline']),
  sessionId: z.string().optional(),
});

const getFamilyPresenceSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
});

const subscribePresenceSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
});

/**
 * Presence Router
 * Handles real-time online/offline status for family members
 * - Users are marked online when they connect
 * - Users are marked offline when they disconnect or timeout
 * - Last-seen timestamp tracks inactivity for context
 */
export const presenceRouter = router({
  /**
   * Update user presence status (online/offline)
   * Called when user connects, disconnects, or navigates
   */
  updatePresence: procedure
    .input(updatePresenceSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db.select()
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

      const now = new Date();
      const sessionId = input.sessionId || `session-${ctx.user.id}-${Date.now()}`;

      // Check if presence record exists
      const [existingPresence] = await ctx.db.select()
        .from(userPresenceTable)
        .where(
          and(
            eq(userPresenceTable.userId, ctx.user.id),
            eq(userPresenceTable.familyId, input.familyId)
          )
        )
        .limit(1);

      let presenceRecord;

      if (existingPresence) {
        // Update existing presence
        [presenceRecord] = await ctx.db.update(userPresenceTable)
          .set({
            status: input.status,
            lastSeenAt: now,
            sessionId,
            updatedAt: now,
          })
          .where(eq(userPresenceTable.id, existingPresence.id))
          .returning();
      } else {
        // Create new presence record
        [presenceRecord] = await ctx.db.insert(userPresenceTable)
          .values({
            userId: ctx.user.id,
            familyId: input.familyId,
            status: input.status,
            lastSeenAt: now,
            sessionId,
          })
          .returning();
      }

      // Get user details for the event
      const [userRecord] = await ctx.db.select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      const username = userRecord
        ? `${userRecord.firstName || ''} ${userRecord.lastName || ''}`.trim() || 'Unknown'
        : 'Unknown';

      // Emit event for real-time updates
      emitter.emit('presence-update', {
        familyId: input.familyId,
        userId: ctx.user.id,
        username,
        status: input.status,
        lastSeenAt: now,
      });

      // Broadcast via Pusher for real-time sync
      try {
        await pusherEvents.presenceUpdate(input.familyId, {
          userId: ctx.user.id,
          username,
          status: input.status,
          lastSeenAt: now,
        });
      } catch (error) {
        console.error('Failed to broadcast presence update via Pusher:', error);
        // Don't throw - Pusher is optional
      }

      return presenceRecord;
    }),

  /**
   * Get current presence for all family members
   * Returns online/offline status and last-seen timestamp
   */
  getFamilyPresence: procedure
    .input(getFamilyPresenceSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db.select()
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

      // Get all presence records for the family, joined with user info
      const presenceRecords = await ctx.db.select({
        id: userPresenceTable.id,
        userId: userPresenceTable.userId,
        status: userPresenceTable.status,
        lastSeenAt: userPresenceTable.lastSeenAt,
        firstName: users.firstName,
        lastName: users.lastName,
        userEmail: users.email,
      })
        .from(userPresenceTable)
        .innerJoin(users, eq(userPresenceTable.userId, users.id))
        .where(eq(userPresenceTable.familyId, input.familyId))
        .orderBy(desc(userPresenceTable.updatedAt));

      return presenceRecords;
    }),

  /**
   * Subscribe to presence updates for a family
   * Real-time notifications when users come online/offline
   */
  onPresenceUpdate: procedure
    .input(subscribePresenceSchema)
    .subscription(({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      const userId = ctx.user.id;

      return observable<any>((emit) => {
        const onPresenceChange = async (data: any) => {
          // Only emit updates for the subscribed family
          if (data.familyId !== input.familyId) return;

          // Verify user still has access to the family
          const [membership] = await ctx.db.select()
            .from(familyMembers)
            .where(
              and(
                eq(familyMembers.familyId, input.familyId),
                eq(familyMembers.userId, userId)
              )
            )
            .limit(1);

          if (!membership) return; // User no longer has access

          emit.next(data);
        };

        emitter.on('presence-update', onPresenceChange);

        return () => {
          emitter.off('presence-update', onPresenceChange);
        };
      });
    }),

  /**
   * Batch update presence status for heartbeat/ping
   * Keeps user marked as online by updating lastSeenAt
   */
  heartbeat: procedure
    .input(z.object({
      familyId: z.string().uuid('Invalid family ID'),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      const now = new Date();

      // Update presence record with new timestamp (marks as still active)
      const [presenceRecord] = await ctx.db.update(userPresenceTable)
        .set({
          lastSeenAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(userPresenceTable.userId, ctx.user.id),
            eq(userPresenceTable.familyId, input.familyId)
          )
        )
        .returning();

      return presenceRecord;
    }),

  /**
   * Mark user as offline
   * Called on logout or window close
   */
  setOffline: procedure
    .input(z.object({
      familyId: z.string().uuid('Invalid family ID'),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      const now = new Date();

      // Mark user as offline
      const [presenceRecord] = await ctx.db.update(userPresenceTable)
        .set({
          status: 'offline',
          lastSeenAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(userPresenceTable.userId, ctx.user.id),
            eq(userPresenceTable.familyId, input.familyId)
          )
        )
        .returning();

      // Get user details for the event
      const [userRecord] = await ctx.db.select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      const username = userRecord
        ? `${userRecord.firstName || ''} ${userRecord.lastName || ''}`.trim() || 'Unknown'
        : 'Unknown';

      // Emit event for real-time updates
      emitter.emit('presence-update', {
        familyId: input.familyId,
        userId: ctx.user.id,
        username,
        status: 'offline',
        lastSeenAt: now,
      });

      // Broadcast via Pusher for real-time sync
      try {
        await pusherEvents.presenceUpdate(input.familyId, {
          userId: ctx.user.id,
          username,
          status: 'offline',
          lastSeenAt: now,
        });
      } catch (error) {
        console.error('Failed to broadcast offline status via Pusher:', error);
        // Don't throw - Pusher is optional
      }

      return presenceRecord;
    }),
});
