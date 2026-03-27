import { z } from 'zod';
import { eq, and, isNull, or, ilike, desc, asc } from 'drizzle-orm';
import { router, procedure } from '../trpc';
import {
  streamingSources,
  parentalLocks,
  streamingPlaybackState,
  type StreamingSource,
} from '../../../db/schema/streaming';
import { familyMembers } from '../../../db/schema/familyMembers';
import { pusherEvents } from '~/utils/pusher.server';
import { logAction } from '../../../utils/auditLog.server';

export const streamingRouter = router({
  // Get all sources for a family with optional filters
  getSources: procedure
    .input(
      z.object({
        searchTerm: z.string().optional().default(''),
        genre: z.string().optional().default(''),
        availability: z.enum(['all', 'available', 'restricted']).optional().default('all'),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      if (!ctx.user?.id) {
        return [];
      }

      // Get user's family
      const userFamilyMember = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.userId, ctx.user.id),
      });

      if (!userFamilyMember?.familyId) {
        return [];
      }

      const sources = await db
        .select()
        .from(streamingSources)
        .where(eq(streamingSources.familyId, userFamilyMember.familyId));

      // Filter by search term
      let filtered = sources;
      if (input.searchTerm.trim()) {
        const term = input.searchTerm.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.name.toLowerCase().includes(term) ||
            (s.description?.toLowerCase().includes(term) ?? false)
        );
      }

      // Filter by genre
      if (input.genre) {
        filtered = filtered.filter((s) => s.genre?.includes(input.genre!));
      }

      // Sort by position
      filtered = filtered.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

      // Check parental locks for each source
      const sourcesWithLocks = await Promise.all(
        filtered.map(async (source) => {
          const isRestricted = await db.query.parentalLocks.findFirst({
            where: and(
              eq(parentalLocks.familyId, userFamilyMember.familyId),
              or(
                eq(parentalLocks.sourceId, source.id),
                eq(parentalLocks.isGlobalLock, true)
              )
            ),
          });

          return {
            ...source,
            isRestricted: !!isRestricted,
          };
        })
      );

      // Filter by availability if needed
      if (input.availability === 'available') {
        return sourcesWithLocks.filter((s) => !s.isRestricted);
      } else if (input.availability === 'restricted') {
        return sourcesWithLocks.filter((s) => s.isRestricted);
      }

      return sourcesWithLocks;
    }),

  // Add a new streaming source (admin only)
  addSource: procedure
    .input(
      z.object({
        name: z.string().min(1, 'Source name is required'),
        url: z.string().url('Valid URL required').optional(),
        embedCode: z.string().optional(),
        type: z.enum(['pluto', 'tubi', 'roku', 'freeview', 'custom']),
        genre: z.string().optional(),
        ageRating: z.number().int().min(0).max(21).default(0),
        description: z.string().optional(),
        thumbnail: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      if (!ctx.user?.id) {
        throw new Error('Not authenticated');
      }

      // Get user's family member record
      const userFamilyMember = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.userId, ctx.user.id),
      });

      if (!userFamilyMember?.familyId || userFamilyMember.role !== 'admin') {
        throw new Error('Not authorized');
      }

      // Get max position
      const sources = await db
        .select()
        .from(streamingSources)
        .where(eq(streamingSources.familyId, userFamilyMember.familyId));

      const nextPosition = (sources.length > 0 ? Math.max(...sources.map((s) => s.position ?? 0)) : -1) + 1;

      // Check for duplicates
      const existing = sources.find((s) => s.name === input.name);
      if (existing) {
        throw new Error('Source with this name already exists');
      }

      const [source] = await db
        .insert(streamingSources)
        .values({
          ...input,
          familyId: userFamilyMember.familyId,
          position: nextPosition,
        })
        .returning();

      // Broadcast to all family members
      await pusherEvents.trigger(`family-${userFamilyMember.familyId}`, 'streaming-source-added', {
        source,
      });

      return source;
    }),

  // Remove a streaming source (admin only)
  removeSource: procedure
    .input(z.object({ sourceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      if (!ctx.user?.id) {
        throw new Error('Not authenticated');
      }

      // Get user's family
      const userFamilyMember = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.userId, ctx.user.id),
      });

      if (!userFamilyMember?.familyId || userFamilyMember.role !== 'admin') {
        throw new Error('Not authorized');
      }

      // Verify source belongs to family
      const source = await db.query.streamingSources.findFirst({
        where: and(
          eq(streamingSources.id, input.sourceId),
          eq(streamingSources.familyId, userFamilyMember.familyId)
        ),
      });

      if (!source) {
        throw new Error('Source not found');
      }

      await db.delete(streamingSources).where(eq(streamingSources.id, input.sourceId));

      // Broadcast to all family members
      await pusherEvents.trigger(`family-${userFamilyMember.familyId}`, 'streaming-source-removed', {
        sourceId: input.sourceId,
      });

      return { success: true };
    }),

  // Reorder streaming sources (admin only)
  reorderSources: procedure
    .input(
      z.object({
        sourceIds: z.array(z.string().uuid()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      if (!ctx.user?.id) {
        throw new Error('Not authenticated');
      }

      // Get user's family
      const userFamilyMember = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.userId, ctx.user.id),
      });

      if (!userFamilyMember?.familyId || userFamilyMember.role !== 'admin') {
        throw new Error('Not authorized');
      }

      // Update positions
      await Promise.all(
        input.sourceIds.map((sourceId, index) =>
          db
            .update(streamingSources)
            .set({ position: index, updatedAt: new Date() })
            .where(
              and(
                eq(streamingSources.id, sourceId),
                eq(streamingSources.familyId, userFamilyMember.familyId)
              )
            )
        )
      );

      // Broadcast to all family members
      await pusherEvents.trigger(`family-${userFamilyMember.familyId}`, 'streaming-sources-reordered', {
        sourceIds: input.sourceIds,
      });

      return { success: true };
    }),

  // Get parental locks for a user
  getParentalLocks: procedure.query(async ({ ctx }) => {
    const { db } = ctx;

    if (!ctx.user?.id) {
      return [];
    }

    const locks = await db.query.parentalLocks.findMany({
      where: eq(parentalLocks.userId, ctx.user.id),
    });

    return locks;
  }),

  // Set parental lock for a source
  setParentalLock: procedure
    .input(
      z.object({
        sourceId: z.string().uuid().optional(),
        minAgeRating: z.number().int().min(0).max(21),
        isGlobalLock: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      if (!ctx.user?.id) {
        throw new Error('Not authenticated');
      }

      // Get user's family
      const userFamilyMember = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.userId, ctx.user.id),
      });

      if (!userFamilyMember?.familyId) {
        throw new Error('User family not found');
      }

      // Check if lock already exists
      const existingLock = await db.query.parentalLocks.findFirst({
        where: and(
          eq(parentalLocks.userId, ctx.user.id),
          input.sourceId ? eq(parentalLocks.sourceId, input.sourceId) : isNull(parentalLocks.sourceId)
        ),
      });

      if (existingLock) {
        const [updated] = await db
          .update(parentalLocks)
          .set({
            minAgeRating: input.minAgeRating,
            isGlobalLock: input.isGlobalLock,
            updatedAt: new Date(),
          })
          .where(eq(parentalLocks.id, existingLock.id))
          .returning();

        return updated;
      }

      const [lock] = await db
        .insert(parentalLocks)
        .values({
          ...input,
          familyId: userFamilyMember.familyId,
          userId: ctx.user.id,
        })
        .returning();

      return lock;
    }),

  // Update playback state
  updatePlaybackState: procedure
    .input(
      z.object({
        sourceId: z.string().uuid(),
        currentTime: z.number().min(0),
        duration: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      if (!ctx.user?.id) {
        throw new Error('Not authenticated');
      }

      // Check if record exists
      const existing = await db.query.streamingPlaybackState.findFirst({
        where: and(
          eq(streamingPlaybackState.userId, ctx.user.id),
          eq(streamingPlaybackState.sourceId, input.sourceId)
        ),
      });

      if (existing) {
        const [updated] = await db
          .update(streamingPlaybackState)
          .set({
            currentTime: input.currentTime.toString(),
            duration: input.duration.toString(),
            lastPlayedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(streamingPlaybackState.id, existing.id))
          .returning();

        return updated;
      }

      const [state] = await db
        .insert(streamingPlaybackState)
        .values({
          userId: ctx.user.id,
          sourceId: input.sourceId,
          currentTime: input.currentTime.toString(),
          duration: input.duration.toString(),
        })
        .returning();

      return state;
    }),

  // Get playback state for a source
  getPlaybackState: procedure
    .input(z.object({ sourceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      if (!ctx.user?.id) {
        return null;
      }

      const state = await db.query.streamingPlaybackState.findFirst({
        where: and(
          eq(streamingPlaybackState.userId, ctx.user.id),
          eq(streamingPlaybackState.sourceId, input.sourceId)
        ),
      });

      return state || null;
    }),

  // Search sources with debouncing support
  searchSources: procedure
    .input(
      z.object({
        searchTerm: z.string().default(''),
        genre: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      if (!ctx.user?.id) {
        return [];
      }

      // Get user's family
      const userFamilyMember = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.userId, ctx.user.id),
      });

      if (!userFamilyMember?.familyId) {
        return [];
      }

      const sources = await db
        .select()
        .from(streamingSources)
        .where(eq(streamingSources.familyId, userFamilyMember.familyId));

      // Filter locally
      let filtered = sources;
      if (input.searchTerm) {
        const term = input.searchTerm.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.name.toLowerCase().includes(term) ||
            (s.description?.toLowerCase().includes(term) ?? false)
        );
      }

      if (input.genre) {
        filtered = filtered.filter((s) => s.genre?.includes(input.genre!));
      }

      return filtered.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }),

  // Update streaming service status (enable/disable)
  updateStreamingServiceStatus: procedure
    .input(
      z.object({
        serviceType: z.enum(['pluto', 'tubi', 'roku', 'freeview']),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      if (!ctx.user?.id) {
        throw new Error('Not authenticated');
      }

      // Get user's family member record
      const userFamilyMember = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.userId, ctx.user.id),
      });

      if (!userFamilyMember?.familyId || userFamilyMember.role !== 'admin') {
        throw new Error('Only family admins can update streaming service status');
      }

      // Get all streaming sources of this type for the family
      const sources = await db
        .select()
        .from(streamingSources)
        .where(
          and(
            eq(streamingSources.familyId, userFamilyMember.familyId),
            eq(streamingSources.type, input.serviceType)
          )
        );

      // Update enabled status for all sources of this type
      const updatePromises = sources.map((source) =>
        db
          .update(streamingSources)
          .set({
            enabled: input.enabled,
            updatedAt: new Date(),
          })
          .where(eq(streamingSources.id, source.id))
      );

      await Promise.all(updatePromises);

      // Log the action
      await logAction({
        actionType: 'UPDATE_STREAMING_SERVICE_STATUS',
        actorId: ctx.user.id,
        targetType: 'streaming_service',
        description: `Admin ${ctx.user.id} ${input.enabled ? 'enabled' : 'disabled'} ${input.serviceType} streaming service`,
        metadata: {
          serviceType: input.serviceType,
          enabled: input.enabled,
          affectedSourceCount: sources.length,
        },
      });

      // Broadcast to all family members
      await pusherEvents.trigger(
        `family-${userFamilyMember.familyId}`,
        'streaming-service-status-changed',
        {
          serviceType: input.serviceType,
          enabled: input.enabled,
        }
      );

      return {
        success: true,
        message: `${input.serviceType} streaming service ${input.enabled ? 'enabled' : 'disabled'} for family`,
        affectedSourceCount: sources.length,
      };
    }),
});
