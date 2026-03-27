import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { router, procedure } from '../trpc';
import { emitter } from '~/utils/emitter.server';
import { pusherEvents } from '~/utils/pusher.server';
import {
  timelineHighlights,
  timelineHighlightMedia,
  timelineShares,
  familyMembers,
} from '../../../db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { generateToken } from '~/utils/tokenGenerator';

// Validation schemas
const addHighlightSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters'),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  date: z.date().or(z.string().transform((str) => new Date(str))),
  media: z.array(z.object({
    url: z.string().url(),
    type: z.enum(['image', 'video']),
    fileName: z.string(),
    fileSize: z.number(),
  })).optional(),
});

const viewTimelineSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

const shareHighlightSchema = z.object({
  highlightId: z.string().uuid('Invalid highlight ID'),
  expiresIn: z.number().optional().describe('Expiration time in minutes'),
  guestEmail: z.string().email().optional(),
});

const shareTimelineSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  expiresIn: z.number().optional().describe('Expiration time in minutes'),
  guestEmail: z.string().email().optional(),
});

const validateTimelineShareAccessSchema = z.object({
  shareToken: z.string().min(1),
});

const getTimelineHighlightsSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const getHighlightDetailsSchema = z.object({
  highlightId: z.string().uuid('Invalid highlight ID'),
});

const updateHighlightSchema = z.object({
  highlightId: z.string().uuid('Invalid highlight ID'),
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .optional(),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  date: z.date().or(z.string().transform((str) => new Date(str))).optional(),
});

const deleteHighlightSchema = z.object({
  highlightId: z.string().uuid('Invalid highlight ID'),
});

const onTimelineUpdateSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
});

const getSharedTimelineSchema = z.object({
  shareToken: z.string().min(1, 'Share token is required'),
});

export const timelineRouter = router({
  /**
   * Add a new highlight to the timeline
   */
  addHighlight: procedure
    .input(addHighlightSchema)
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

      // Create the highlight
      const [newHighlight] = await ctx.db.insert(timelineHighlights)
        .values({
          familyId: input.familyId,
          createdBy: ctx.user.id,
          title: input.title,
          description: input.description || null,
          date: new Date(input.date),
        })
        .returning();

      // Add media if provided
      if (input.media && input.media.length > 0) {
        await Promise.all(
          input.media.map((mediaItem, index) =>
            ctx.db.insert(timelineHighlightMedia).values({
              highlightId: newHighlight.id,
              url: mediaItem.url,
              type: mediaItem.type,
              fileName: mediaItem.fileName,
              fileSize: mediaItem.fileSize,
              order: index,
            })
          )
        );
      }

      // Fetch the complete highlight with media
      const mediaRecords = await ctx.db.select()
        .from(timelineHighlightMedia)
        .where(eq(timelineHighlightMedia.highlightId, newHighlight.id));

      const highlight = { ...newHighlight, media: mediaRecords };

      // Emit event for real-time updates
      emitter.emit('timeline-update', {
        familyId: input.familyId,
        type: 'highlight-created',
        highlight,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.timelineHighlightCreated(input.familyId, highlight);
      } catch (error) {
        console.error('Failed to broadcast highlight creation via Pusher:', error);
      }

      return highlight;
    }),

  /**
   * View timeline with highlights
   */
  viewTimeline: procedure
    .input(viewTimelineSchema)
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

      // Build date filter
      const dateFilters = [eq(timelineHighlights.familyId, input.familyId)];
      if (input.startDate) {
        dateFilters.push(gte(timelineHighlights.date, input.startDate));
      }
      if (input.endDate) {
        dateFilters.push(lte(timelineHighlights.date, input.endDate));
      }

      // Get highlights sorted by date (descending)
      const highlights = await ctx.db.select()
        .from(timelineHighlights)
        .where(and(...dateFilters))
        .orderBy(desc(timelineHighlights.date))
        .limit(input.limit)
        .offset(input.offset);

      // Get media for each highlight
      const highlightsWithMedia = await Promise.all(
        highlights.map(async (highlight) => {
          const media = await ctx.db.select()
            .from(timelineHighlightMedia)
            .where(eq(timelineHighlightMedia.highlightId, highlight.id));
          return { ...highlight, media };
        })
      );

      return { highlights: highlightsWithMedia };
    }),

  /**
   * Share a single highlight
   */
  shareHighlight: procedure
    .input(shareHighlightSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the highlight
      const [highlight] = await ctx.db.select()
        .from(timelineHighlights)
        .where(eq(timelineHighlights.id, input.highlightId))
        .limit(1);

      if (!highlight) {
        throw new Error('Highlight not found');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db.select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, highlight.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('You are not a member of this family');
      }

      // Generate share token
      const shareToken = generateToken();
      const expiresAt = input.expiresIn
        ? new Date(Date.now() + input.expiresIn * 60 * 1000)
        : null;

      // Create share record
      const [share] = await ctx.db.insert(timelineShares)
        .values({
          familyId: highlight.familyId,
          highlightId: input.highlightId,
          shareToken,
          shareType: 'highlight',
          guestEmail: input.guestEmail || null,
          expiresAt,
          createdBy: ctx.user.id,
        })
        .returning();

      // Emit event for audit logging
      emitter.emit('timeline-update', {
        familyId: highlight.familyId,
        type: 'highlight-shared',
        shareId: share.id,
      });

      return {
        shareUrl: `/share/timeline/${shareToken}`,
        token: shareToken,
        expiresAt,
      };
    }),

  /**
   * Share entire timeline
   */
  shareTimeline: procedure
    .input(shareTimelineSchema)
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

      // Generate share token
      const shareToken = generateToken();
      const expiresAt = input.expiresIn
        ? new Date(Date.now() + input.expiresIn * 60 * 1000)
        : null;

      // Create share record for entire timeline
      const [share] = await ctx.db.insert(timelineShares)
        .values({
          familyId: input.familyId,
          highlightId: null,
          shareToken,
          shareType: 'timeline',
          guestEmail: input.guestEmail || null,
          expiresAt,
          createdBy: ctx.user.id,
        })
        .returning();

      // Emit event for audit logging
      emitter.emit('timeline-update', {
        familyId: input.familyId,
        type: 'timeline-shared',
        shareId: share.id,
      });

      return {
        shareUrl: `/share/timeline/${shareToken}`,
        token: shareToken,
        expiresAt,
      };
    }),

  /**
   * Validate access to a shared timeline/highlight
   */
  validateTimelineShareAccess: procedure
    .input(validateTimelineShareAccessSchema)
    .query(async ({ ctx, input }) => {
      // Find the share record
      const [share] = await ctx.db.select()
        .from(timelineShares)
        .where(eq(timelineShares.shareToken, input.shareToken))
        .limit(1);

      if (!share) {
        return { valid: false, reason: 'Invalid share token' };
      }

      // Check expiration
      if (share.expiresAt && new Date() > share.expiresAt) {
        return { valid: false, reason: 'Share has expired' };
      }

      return {
        valid: true,
        shareType: share.shareType,
        familyId: share.familyId,
        highlightId: share.highlightId,
      };
    }),

  /**
   * Get timeline highlights with pagination
   */
  getTimelineHighlights: procedure
    .input(getTimelineHighlightsSchema)
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

      // Get highlights
      const highlights = await ctx.db.select()
        .from(timelineHighlights)
        .where(eq(timelineHighlights.familyId, input.familyId))
        .orderBy(desc(timelineHighlights.date))
        .limit(input.limit)
        .offset(input.offset);

      // Get media for each highlight
      const highlightsWithMedia = await Promise.all(
        highlights.map(async (highlight) => {
          const media = await ctx.db.select()
            .from(timelineHighlightMedia)
            .where(eq(timelineHighlightMedia.highlightId, highlight.id));
          return { ...highlight, media };
        })
      );

      return { highlights: highlightsWithMedia };
    }),

  /**
   * Get highlight details
   */
  getHighlightDetails: procedure
    .input(getHighlightDetailsSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get highlight
      const [highlight] = await ctx.db.select()
        .from(timelineHighlights)
        .where(eq(timelineHighlights.id, input.highlightId))
        .limit(1);

      if (!highlight) {
        throw new Error('Highlight not found');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db.select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, highlight.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('You are not a member of this family');
      }

      // Get media
      const media = await ctx.db.select()
        .from(timelineHighlightMedia)
        .where(eq(timelineHighlightMedia.highlightId, highlight.id));

      return { ...highlight, media };
    }),

  /**
   * Update a highlight
   */
  updateHighlight: procedure
    .input(updateHighlightSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the highlight
      const [highlight] = await ctx.db.select()
        .from(timelineHighlights)
        .where(eq(timelineHighlights.id, input.highlightId))
        .limit(1);

      if (!highlight) {
        throw new Error('Highlight not found');
      }

      // Verify user is the creator
      if (highlight.createdBy !== ctx.user.id) {
        throw new Error('You can only edit your own highlights');
      }

      // Update highlight
      const updateData: any = {};
      if (input.title) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.date) updateData.date = new Date(input.date);
      updateData.updatedAt = new Date();

      const [updatedHighlight] = await ctx.db.update(timelineHighlights)
        .set(updateData)
        .where(eq(timelineHighlights.id, input.highlightId))
        .returning();

      // Get media
      const media = await ctx.db.select()
        .from(timelineHighlightMedia)
        .where(eq(timelineHighlightMedia.highlightId, updatedHighlight.id));

      const result = { ...updatedHighlight, media };

      // Emit event for real-time updates
      emitter.emit('timeline-update', {
        familyId: highlight.familyId,
        type: 'highlight-updated',
        highlight: result,
      });

      return result;
    }),

  /**
   * Delete a highlight
   */
  deleteHighlight: procedure
    .input(deleteHighlightSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the highlight
      const [highlight] = await ctx.db.select()
        .from(timelineHighlights)
        .where(eq(timelineHighlights.id, input.highlightId))
        .limit(1);

      if (!highlight) {
        throw new Error('Highlight not found');
      }

      // Verify user is the creator
      if (highlight.createdBy !== ctx.user.id) {
        throw new Error('You can only delete your own highlights');
      }

      // Delete highlight (cascade will delete media and shares)
      await ctx.db.delete(timelineHighlights)
        .where(eq(timelineHighlights.id, input.highlightId));

      // Emit event for real-time updates
      emitter.emit('timeline-update', {
        familyId: highlight.familyId,
        type: 'highlight-deleted',
        highlightId: input.highlightId,
      });

      return { success: true };
    }),

  /**
   * Subscribe to timeline updates
   */
  onTimelineUpdate: procedure
    .input(onTimelineUpdateSchema)
    .subscription(({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      return observable<any>((emit) => {
        const onUpdate = async (data: any) => {
          // Only emit updates for the subscribed family
          if (data.familyId !== input.familyId) return;

          // Verify user still has access to the family
          const [membership] = await ctx.db.select()
            .from(familyMembers)
            .where(
              and(
                eq(familyMembers.familyId, input.familyId),
                eq(familyMembers.userId, ctx.user!.id)
              )
            )
            .limit(1);

          if (!membership) return; // User no longer has access

          emit.next(data);
        };

        emitter.on('timeline-update', onUpdate);

        return () => {
          emitter.off('timeline-update', onUpdate);
        };
      });
    }),

  /**
   * Get shared timeline/highlight content via share token
   * This procedure does NOT require authentication
   */
  getSharedTimeline: procedure
    .input(getSharedTimelineSchema)
    .query(async ({ ctx, input }) => {
      // Find the share record
      const [share] = await ctx.db.select()
        .from(timelineShares)
        .where(eq(timelineShares.shareToken, input.shareToken))
        .limit(1);

      if (!share) {
        throw new Error('Invalid share token');
      }

      // Check expiration
      if (share.expiresAt && new Date() > share.expiresAt) {
        throw new Error('Share has expired');
      }

      // Fetch highlights based on share type
      let highlightsToReturn;

      if (share.shareType === 'highlight' && share.highlightId) {
        // Single highlight share
        const [highlight] = await ctx.db.select()
          .from(timelineHighlights)
          .where(eq(timelineHighlights.id, share.highlightId))
          .limit(1);

        if (!highlight) {
          throw new Error('Highlight not found');
        }

        // Get media for this highlight
        const media = await ctx.db.select()
          .from(timelineHighlightMedia)
          .where(eq(timelineHighlightMedia.highlightId, highlight.id));

        highlightsToReturn = [{ ...highlight, media }];
      } else {
        // Timeline share - get all highlights for the family
        const highlights = await ctx.db.select()
          .from(timelineHighlights)
          .where(eq(timelineHighlights.familyId, share.familyId))
          .orderBy(desc(timelineHighlights.date));

        // Get media for each highlight
        highlightsToReturn = await Promise.all(
          highlights.map(async (highlight) => {
            const media = await ctx.db.select()
              .from(timelineHighlightMedia)
              .where(eq(timelineHighlightMedia.highlightId, highlight.id));
            return { ...highlight, media };
          })
        );
      }

      return {
        shareType: share.shareType,
        expiresAt: share.expiresAt,
        highlights: highlightsToReturn,
      };
    }),
});
