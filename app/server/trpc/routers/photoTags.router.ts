import { z } from 'zod';
import { router, procedure } from '../trpc';
import { 
  photoTags, 
  mediaItems, 
  mediaGalleries, 
  familyMembers 
} from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { extractPhotoTags } from '../../services/photoTagging.service';
import { pusherEvents } from '~/utils/pusher.server';

// Validation schemas
const autoTagPhotoSchema = z.object({
  mediaId: z.string().uuid('Invalid media ID'),
  photoUrl: z.string().url('Invalid photo URL'),
});

const getTagsSchema = z.object({
  mediaId: z.string().uuid('Invalid media ID'),
});

const updateTagsSchema = z.object({
  mediaId: z.string().uuid('Invalid media ID'),
  tags: z.array(
    z.string()
      .min(1, 'Tag cannot be empty')
      .max(50, 'Tag is too long')
      .transform(tag => tag.toLowerCase().trim())
  )
    .min(0, 'Tags array cannot be empty')
    .max(10, 'Maximum 10 tags allowed'),
});

const deleteTagsSchema = z.object({
  mediaId: z.string().uuid('Invalid media ID'),
  tagTexts: z.array(z.string().toLowerCase()),
});

export const photoTagsRouter = router({
  /**
   * Auto-tag a photo using Vision API
   * Calls Vision API to extract tags and saves them to the database
   */
  autoTagPhoto: procedure
    .input(autoTagPhotoSchema)
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

      // Extract tags from the photo using Vision API
      const extractedTags = await extractPhotoTags(input.photoUrl);

      // Delete existing tags for this media item
      await ctx.db.delete(photoTags)
        .where(eq(photoTags.mediaItemId, input.mediaId));

      // Insert new tags
      if (extractedTags.length > 0) {
        const tagsToInsert = extractedTags.map((tag: string) => ({
          mediaItemId: input.mediaId,
          tag,
        }));

        await ctx.db.insert(photoTags)
          .values(tagsToInsert);
      }

      // Broadcast via Pusher for real-time sync
      try {
        await pusherEvents.trigger(gallery.familyId, 'photo-tagged', {
          type: 'photo-tagged',
          mediaId: input.mediaId,
          tags: extractedTags,
        });
      } catch (error) {
        console.error('Failed to broadcast photo tagging via Pusher:', error);
      }

      return {
        success: true,
        tags: extractedTags,
      };
    }),

  /**
   * Get tags for a media item
   */
  getTags: procedure
    .input(getTagsSchema)
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

      // Fetch all tags for this media item
      const tags = await ctx.db.select()
        .from(photoTags)
        .where(eq(photoTags.mediaItemId, input.mediaId));

      return tags.map(t => t.tag);
    }),

  /**
   * Update tags for a media item
   * Validates tag formats and prevents duplicates
   */
  updateTags: procedure
    .input(updateTagsSchema)
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

      // Remove duplicates from tags
      const uniqueTags = [...new Set(input.tags)];

      // Delete existing tags
      await ctx.db.delete(photoTags)
        .where(eq(photoTags.mediaItemId, input.mediaId));

      // Insert new tags
      if (uniqueTags.length > 0) {
        const tagsToInsert = uniqueTags.map(tag => ({
          mediaItemId: input.mediaId,
          tag,
        }));

        await ctx.db.insert(photoTags)
          .values(tagsToInsert);
      }

      // Broadcast via Pusher for real-time sync
      try {
        await pusherEvents.trigger(gallery.familyId, 'tags-updated', {
          type: 'tags-updated',
          mediaId: input.mediaId,
          tags: uniqueTags,
        });
      } catch (error) {
        console.error('Failed to broadcast tags update via Pusher:', error);
      }

      return {
        success: true,
        tags: uniqueTags,
      };
    }),

  /**
   * Delete specific tags from a media item
   */
  deleteTags: procedure
    .input(deleteTagsSchema)
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

      // Delete specified tags
      for (const tagText of input.tagTexts) {
        await ctx.db.delete(photoTags)
          .where(
            and(
              eq(photoTags.mediaItemId, input.mediaId),
              eq(photoTags.tag, tagText)
            )
          );
      }

      // Get remaining tags
      const remainingTags = await ctx.db.select()
        .from(photoTags)
        .where(eq(photoTags.mediaItemId, input.mediaId));

      const remainingTagTexts = remainingTags.map(t => t.tag);

      // Broadcast via Pusher for real-time sync
      try {
        await pusherEvents.trigger(gallery.familyId, 'tags-deleted', {
          type: 'tags-deleted',
          mediaId: input.mediaId,
          deletedTags: input.tagTexts,
          remainingTags: remainingTagTexts,
        });
      } catch (error) {
        console.error('Failed to broadcast tags deletion via Pusher:', error);
      }

      return {
        success: true,
        remainingTags: remainingTagTexts,
      };
    }),
});
