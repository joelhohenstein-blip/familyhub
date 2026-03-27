import { z } from 'zod';
import { router, procedure } from '../trpc';
import { pusherEvents } from '~/utils/pusher.server';
import { logAction } from '~/utils/auditLog.server';
import { 
  mediaGalleries, 
  mediaItems, 
  mediaAlbums, 
  mediaWatchHistory,
  familyMembers,
  userFaceBlurPreferences,
  mediaFaceBlurSettings,
  userClearanceLevels
} from '../../../db/schema';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { shouldBlurForViewer } from '~/server/services/blurDisplay.service';

// Validation schemas
const createGallerySchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  name: z.string().min(1, 'Gallery name is required').max(255, 'Gallery name is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
});

const uploadMediaSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  galleryId: z.string().uuid('Invalid gallery ID'),
  url: z.string().url('Invalid URL'),
  type: z.enum(['image', 'video'] as const),
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().min(1, 'File size must be greater than 0').max(10 * 1024 * 1024, 'File size exceeds 10MB limit'),
  duration: z.number().optional(), // For videos
  thumbnailUrl: z.string().url().optional(),
});

const getMediaItemsSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  galleryId: z.string().uuid('Invalid gallery ID'),
  type: z.enum(['image', 'video', 'all'] as const).default('all'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const deleteMediaSchema = z.object({
  mediaId: z.string().uuid('Invalid media ID'),
});

const createAlbumSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  galleryId: z.string().uuid('Invalid gallery ID'),
  name: z.string().min(1, 'Album name is required').max(255, 'Album name is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
});

const updateAlbumNameSchema = z.object({
  albumId: z.string().uuid('Invalid album ID'),
  name: z.string().min(1, 'Album name is required').max(255, 'Album name is too long'),
});

const moveMediaToAlbumSchema = z.object({
  mediaId: z.string().uuid('Invalid media ID'),
  albumId: z.string().uuid('Invalid album ID').nullable(),
});

const getAlbumsSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  galleryId: z.string().uuid('Invalid gallery ID'),
});

const updateWatchPositionSchema = z.object({
  mediaId: z.string().uuid('Invalid media ID'),
  position: z.number().min(0, 'Position must be >= 0'),
});

const getWatchHistorySchema = z.object({
  mediaId: z.string().uuid('Invalid media ID'),
});

const getOrCreateGallerySchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
});

const getMediaForViewerSchema = z.object({
  mediaId: z.string().uuid('Invalid media ID'),
  familyId: z.string().uuid('Invalid family ID'),
});

export const mediaRouter = router({
  /**
   * Get or create a default gallery for a family
   */
  getOrCreateGallery: procedure
    .input(getOrCreateGallerySchema)
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

      // Check if a default gallery already exists
      const [existingGallery] = await ctx.db.select()
        .from(mediaGalleries)
        .where(eq(mediaGalleries.familyId, input.familyId))
        .limit(1);

      if (existingGallery) {
        return existingGallery;
      }

      // Create a default gallery for the family
      const [newGallery] = await ctx.db.insert(mediaGalleries)
        .values({
          familyId: input.familyId,
          ownerId: ctx.user.id,
          name: 'Family Gallery',
          description: 'Main gallery for family photos and videos',
        })
        .returning();

      return newGallery;
    }),
  /**
   * Create a new media gallery for a family
   */
  createGallery: procedure
    .input(createGallerySchema)
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

      // Create the gallery
      const [gallery] = await ctx.db.insert(mediaGalleries)
        .values({
          familyId: input.familyId,
          ownerId: ctx.user.id,
          name: input.name,
          description: input.description || null,
        })
        .returning();

      // Broadcast via Pusher for real-time sync
      try {
        await pusherEvents.trigger(input.familyId, 'gallery-created', {
          type: 'gallery-created',
          gallery,
        });
      } catch (error) {
        console.error('Failed to broadcast gallery creation via Pusher:', error);
      }

      return gallery;
    }),

  /**
   * Upload media to a gallery
   */
  uploadMedia: procedure
    .input(uploadMediaSchema)
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

      // Verify gallery exists and belongs to the family
      const [gallery] = await ctx.db.select()
        .from(mediaGalleries)
        .where(
          and(
            eq(mediaGalleries.id, input.galleryId),
            eq(mediaGalleries.familyId, input.familyId)
          )
        )
        .limit(1);

      if (!gallery) {
        throw new Error('Gallery not found');
      }

      // Create media item
      const [mediaItem] = await ctx.db.insert(mediaItems)
        .values({
          galleryId: input.galleryId,
          url: input.url,
          type: input.type,
          fileName: input.fileName,
          fileSize: input.fileSize,
          duration: input.duration || null,
          thumbnailUrl: input.thumbnailUrl || null,
          uploadedBy: ctx.user.id,
        })
        .returning();

      // Log media upload
      await logAction({
        actionType: 'MEDIA_UPLOADED',
        actorId: ctx.user.id,
        targetId: mediaItem.id,
        targetType: 'media',
        description: `User uploaded ${input.type} to gallery`,
        metadata: {
          familyId: input.familyId,
          galleryId: input.galleryId,
          fileName: input.fileName,
          fileSize: input.fileSize,
          type: input.type,
        },
      });

      // Log blur processing if image type
      if (input.type === 'image') {
        await logAction({
          actionType: 'BLUR_PROCESSING_INITIATED',
          actorId: ctx.user.id,
          targetId: mediaItem.id,
          targetType: 'media',
          description: `Face detection and blur processing initiated for uploaded image`,
          metadata: {
            familyId: input.familyId,
            galleryId: input.galleryId,
            mediaId: mediaItem.id,
            fileName: input.fileName,
          },
        });
      }

      // Broadcast via Pusher for real-time sync
      try {
        await pusherEvents.trigger(input.familyId, 'media-uploaded', {
          type: 'media-uploaded',
          media: mediaItem,
        });
      } catch (error) {
        console.error('Failed to broadcast media upload via Pusher:', error);
      }

      return mediaItem;
    }),

  /**
   * Get media items from a gallery with filters
   */
  getMediaItems: procedure
    .input(getMediaItemsSchema)
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

      // Build where clause with type filter
      let whereConditions = and(
        eq(mediaItems.galleryId, input.galleryId)
      );

      if (input.type !== 'all') {
        whereConditions = and(
          eq(mediaItems.galleryId, input.galleryId),
          eq(mediaItems.type, input.type)
        );
      }

      // Get media items with pagination
      const items = await ctx.db.select()
        .from(mediaItems)
        .where(whereConditions)
        .orderBy(desc(mediaItems.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        items,
        total: items.length,
        hasMore: items.length === input.limit,
      };
    }),

  /**
   * Delete a media item
   */
  deleteMedia: procedure
    .input(deleteMediaSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the media item
      const [mediaItem] = await ctx.db.select()
        .from(mediaItems)
        .where(eq(mediaItems.id, input.mediaId))
        .limit(1);

      if (!mediaItem) {
        throw new Error('Media not found');
      }

      // Get the gallery to verify access
      const [gallery] = await ctx.db.select()
        .from(mediaGalleries)
        .where(eq(mediaGalleries.id, mediaItem.galleryId))
        .limit(1);

      if (!gallery) {
        throw new Error('Gallery not found');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db.select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, gallery.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('You are not a member of this family');
      }

      // Delete the media item
      await ctx.db.delete(mediaItems)
        .where(eq(mediaItems.id, input.mediaId));

      // Delete associated watch history
      await ctx.db.delete(mediaWatchHistory)
        .where(eq(mediaWatchHistory.mediaItemId, input.mediaId));

      // Broadcast via Pusher for real-time sync
      try {
        await pusherEvents.trigger(gallery.familyId, 'media-deleted', {
          type: 'media-deleted',
          mediaId: input.mediaId,
        });
      } catch (error) {
        console.error('Failed to broadcast media deletion via Pusher:', error);
      }

      return { success: true };
    }),

  /**
   * Create a new album in a gallery
   */
  createAlbum: procedure
    .input(createAlbumSchema)
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

      // Verify gallery exists
      const [gallery] = await ctx.db.select()
        .from(mediaGalleries)
        .where(
          and(
            eq(mediaGalleries.id, input.galleryId),
            eq(mediaGalleries.familyId, input.familyId)
          )
        )
        .limit(1);

      if (!gallery) {
        throw new Error('Gallery not found');
      }

      // Create the album
      const [album] = await ctx.db.insert(mediaAlbums)
        .values({
          galleryId: input.galleryId,
          familyId: input.familyId,
          name: input.name,
          description: input.description || null,
        })
        .returning();

      // Broadcast via Pusher for real-time sync
      try {
        await pusherEvents.trigger(input.familyId, 'album-created', {
          type: 'album-created',
          album,
        });
      } catch (error) {
        console.error('Failed to broadcast album creation via Pusher:', error);
      }

      return album;
    }),

  /**
   * Update album name
   */
  updateAlbumName: procedure
    .input(updateAlbumNameSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the album
      const [album] = await ctx.db.select()
        .from(mediaAlbums)
        .where(eq(mediaAlbums.id, input.albumId))
        .limit(1);

      if (!album) {
        throw new Error('Album not found');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db.select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, album.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('You are not a member of this family');
      }

      // Update the album
      const [updatedAlbum] = await ctx.db.update(mediaAlbums)
        .set({
          name: input.name,
          updatedAt: new Date(),
        })
        .where(eq(mediaAlbums.id, input.albumId))
        .returning();

      // Broadcast via Pusher for real-time sync
      try {
        await pusherEvents.trigger(album.familyId, 'album-updated', {
          type: 'album-updated',
          album: updatedAlbum,
        });
      } catch (error) {
        console.error('Failed to broadcast album update via Pusher:', error);
      }

      return updatedAlbum;
    }),

  /**
   * Move media to an album
   */
  moveMediaToAlbum: procedure
    .input(moveMediaToAlbumSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the media item
      const [mediaItem] = await ctx.db.select()
        .from(mediaItems)
        .where(eq(mediaItems.id, input.mediaId))
        .limit(1);

      if (!mediaItem) {
        throw new Error('Media not found');
      }

      // Get the gallery
      const [gallery] = await ctx.db.select()
        .from(mediaGalleries)
        .where(eq(mediaGalleries.id, mediaItem.galleryId))
        .limit(1);

      if (!gallery) {
        throw new Error('Gallery not found');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db.select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, gallery.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('You are not a member of this family');
      }

      // If moving to an album, verify it belongs to the same gallery
      if (input.albumId) {
        const [album] = await ctx.db.select()
          .from(mediaAlbums)
          .where(
            and(
              eq(mediaAlbums.id, input.albumId),
              eq(mediaAlbums.galleryId, mediaItem.galleryId)
            )
          )
          .limit(1);

        if (!album) {
          throw new Error('Album not found or does not belong to this gallery');
        }
      }

      // Update the media item
      const [updatedMedia] = await ctx.db.update(mediaItems)
        .set({
          albumId: input.albumId,
          updatedAt: new Date(),
        })
        .where(eq(mediaItems.id, input.mediaId))
        .returning();

      // Broadcast via Pusher for real-time sync
      try {
        await pusherEvents.trigger(gallery.familyId, 'media-moved', {
          type: 'media-moved',
          media: updatedMedia,
          albumId: input.albumId,
        });
      } catch (error) {
        console.error('Failed to broadcast media move via Pusher:', error);
      }

      return updatedMedia;
    }),

  /**
   * Get all albums for a gallery
   */
  getAlbums: procedure
    .input(getAlbumsSchema)
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

      // Get albums for the gallery
      const albums = await ctx.db.select()
        .from(mediaAlbums)
        .where(eq(mediaAlbums.galleryId, input.galleryId))
        .orderBy(desc(mediaAlbums.createdAt));

      return albums;
    }),

  /**
   * Update video watch position
   */
  updateWatchPosition: procedure
    .input(updateWatchPositionSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the media item
      const [mediaItem] = await ctx.db.select()
        .from(mediaItems)
        .where(eq(mediaItems.id, input.mediaId))
        .limit(1);

      if (!mediaItem) {
        throw new Error('Media not found');
      }

      // Get the gallery
      const [gallery] = await ctx.db.select()
        .from(mediaGalleries)
        .where(eq(mediaGalleries.id, mediaItem.galleryId))
        .limit(1);

      if (!gallery) {
        throw new Error('Gallery not found');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db.select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, gallery.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('You are not a member of this family');
      }

      // Check if history exists
      const [existing] = await ctx.db.select()
        .from(mediaWatchHistory)
        .where(
          and(
            eq(mediaWatchHistory.mediaItemId, input.mediaId),
            eq(mediaWatchHistory.userId, ctx.user.id)
          )
        )
        .limit(1);

      let watchHistory;
      if (existing) {
        // Update existing
        const [updated] = await ctx.db.update(mediaWatchHistory)
          .set({
            lastPosition: input.position,
            lastWatchedAt: new Date(),
          })
          .where(
            and(
              eq(mediaWatchHistory.mediaItemId, input.mediaId),
              eq(mediaWatchHistory.userId, ctx.user.id)
            )
          )
          .returning();
        watchHistory = updated;
      } else {
        // Create new
        const [created] = await ctx.db.insert(mediaWatchHistory)
          .values({
            mediaItemId: input.mediaId,
            userId: ctx.user.id,
            lastPosition: input.position,
          })
          .returning();
        watchHistory = created;
      }

      // Broadcast via Pusher for real-time sync
      try {
        await pusherEvents.trigger(gallery.familyId, 'watch-position-updated', {
          type: 'watch-position-updated',
          mediaId: input.mediaId,
          position: input.position,
        });
      } catch (error) {
        console.error('Failed to broadcast watch position update via Pusher:', error);
      }

      return watchHistory;
    }),

  /**
   * Get watch history for a media item
   */
  getWatchHistory: procedure
    .input(getWatchHistorySchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the media item
      const [mediaItem] = await ctx.db.select()
        .from(mediaItems)
        .where(eq(mediaItems.id, input.mediaId))
        .limit(1);

      if (!mediaItem) {
        throw new Error('Media not found');
      }

      // Get watch history for current user
      const [watchHistory] = await ctx.db.select()
        .from(mediaWatchHistory)
        .where(
          and(
            eq(mediaWatchHistory.mediaItemId, input.mediaId),
            eq(mediaWatchHistory.userId, ctx.user.id)
          )
        )
        .limit(1);

      return watchHistory || null;
    }),

  /**
   * Get media for viewer with blur display logic applied
   * Returns media with blur status based on viewer's clearance and preferences
   */
  getMediaForViewer: procedure
    .input(getMediaForViewerSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the media item
      const [mediaItem] = await ctx.db.select()
        .from(mediaItems)
        .where(eq(mediaItems.id, input.mediaId))
        .limit(1);

      if (!mediaItem) {
        throw new Error('Media not found');
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

      // Determine if blur should be applied for this viewer
      const shouldBlur = await shouldBlurForViewer(
        ctx.db,
        ctx.user.id,
        input.mediaId,
        input.familyId
      );

      // Get blur settings for the media
      const [blurSettings] = await ctx.db.select()
        .from(mediaFaceBlurSettings)
        .where(eq(mediaFaceBlurSettings.mediaItemId, input.mediaId))
        .limit(1);

      // Get user's blur preferences
      const [userPrefs] = await ctx.db.select()
        .from(userFaceBlurPreferences)
        .where(
          and(
            eq(userFaceBlurPreferences.userId, ctx.user.id),
            eq(userFaceBlurPreferences.familyId, input.familyId)
          )
        )
        .limit(1);

      return {
        media: mediaItem,
        shouldBlur,
        blurSettings: blurSettings || null,
        userPreferences: userPrefs || null,
      };
    }),
});
