import { router, protectedProcedure, adminProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '~/db/index.server';
import {
  userFaceBlurPreferences,
  mediaFaceBlurSettings,
} from '~/db/schema';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { logAction } from '~/utils/auditLog.server';

/**
 * Face Blur Settings Router
 * Handles user blur preferences and media blur status management
 */

export const faceBlurRouter = router({
  /**
   * Get user's blur preferences for a family
   */
  getUserBlurPreferences: protectedProcedure
    .input(
      z.object({
        familyId: z.string().uuid('Invalid family ID'),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }

      const preferences = await db
        .select()
        .from(userFaceBlurPreferences)
        .where(
          and(
            eq(userFaceBlurPreferences.userId, ctx.user.id),
            eq(userFaceBlurPreferences.familyId, input.familyId)
          )
        )
        .limit(1);

      if (!preferences[0]) {
        // Return default preferences if none exist
        return {
          id: null,
          userId: ctx.user.id,
          familyId: input.familyId,
          blurAllFaces: false,
          blurIntensity: 50,
          blurSpecificPeople: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      return {
        ...preferences[0],
        blurSpecificPeople: Array.isArray(preferences[0].blurSpecificPeople)
          ? preferences[0].blurSpecificPeople
          : JSON.parse(
              typeof preferences[0].blurSpecificPeople === 'string'
                ? preferences[0].blurSpecificPeople
                : '[]'
            ),
      };
    }),

  /**
   * Update user's blur preferences for a family
   */
  updateUserBlurPreferences: protectedProcedure
    .input(
      z.object({
        familyId: z.string().uuid('Invalid family ID'),
        blurAllFaces: z.boolean().optional(),
        blurIntensity: z.number().min(0).max(100).optional(),
        blurSpecificPeople: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }

      const { familyId, blurAllFaces, blurIntensity, blurSpecificPeople } =
        input;

      // Check if preferences exist
      const existing = await db
        .select()
        .from(userFaceBlurPreferences)
        .where(
          and(
            eq(userFaceBlurPreferences.userId, ctx.user.id),
            eq(userFaceBlurPreferences.familyId, familyId)
          )
        )
        .limit(1);

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (blurAllFaces !== undefined) {
        updateData.blurAllFaces = blurAllFaces;
      }
      if (blurIntensity !== undefined) {
        updateData.blurIntensity = blurIntensity;
      }
      if (blurSpecificPeople !== undefined) {
        updateData.blurSpecificPeople = JSON.stringify(blurSpecificPeople);
      }

      if (existing[0]) {
        // Update existing preferences
        await db
          .update(userFaceBlurPreferences)
          .set(updateData)
          .where(
            and(
              eq(userFaceBlurPreferences.userId, ctx.user.id),
              eq(userFaceBlurPreferences.familyId, familyId)
            )
          );
      } else {
        // Create new preferences
        await db.insert(userFaceBlurPreferences).values({
          userId: ctx.user.id,
          familyId,
          blurAllFaces: blurAllFaces ?? false,
          blurIntensity: blurIntensity ?? 50,
          blurSpecificPeople: JSON.stringify(blurSpecificPeople ?? []),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Return updated preferences
      const updated = await db
        .select()
        .from(userFaceBlurPreferences)
        .where(
          and(
            eq(userFaceBlurPreferences.userId, ctx.user.id),
            eq(userFaceBlurPreferences.familyId, familyId)
          )
        )
        .limit(1);

      // Log blur preference update
      await logAction({
        actionType: 'SESSION_BLUR_TOGGLED',
        actorId: ctx.user.id,
        targetId: ctx.user.id,
        targetType: 'user',
        description: `User updated session blur preferences for family ${familyId}`,
        metadata: {
          familyId,
          blurAllFaces,
          blurIntensity,
          blurSpecificPeopleCount: blurSpecificPeople?.length ?? 0,
        },
      });

      return {
        ...updated[0],
        blurSpecificPeople: Array.isArray(updated[0]?.blurSpecificPeople)
          ? updated[0]?.blurSpecificPeople
          : JSON.parse(
              typeof updated[0]?.blurSpecificPeople === 'string'
                ? updated[0]?.blurSpecificPeople
                : '[]'
            ),
      };
    }),

  /**
   * Get blur status and face detection info for a media item
   */
  getMediaBlurStatus: protectedProcedure
    .input(
      z.object({
        mediaItemId: z.string().uuid('Invalid media item ID'),
      })
    )
    .query(async ({ input }) => {
      const blurSettings = await db
        .select()
        .from(mediaFaceBlurSettings)
        .where(eq(mediaFaceBlurSettings.mediaItemId, input.mediaItemId))
        .limit(1);

      if (!blurSettings[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Media blur settings not found',
        });
      }

      return {
        id: blurSettings[0].id,
        mediaItemId: blurSettings[0].mediaItemId,
        uploaderId: blurSettings[0].uploaderId,
        faceDetectionStatus: blurSettings[0].faceDetectionStatus,
        detectedFaceCount: blurSettings[0].detectedFaceCount,
        blurIntensity: blurSettings[0].blurIntensity,
        isAutoBlurred: blurSettings[0].isAutoBlurred,
        forceBlurByAdmin: blurSettings[0].forceBlurByAdmin,
        createdAt: blurSettings[0].createdAt,
        updatedAt: blurSettings[0].updatedAt,
      };
    }),

  /**
   * Toggle blur on/off for a photo (uploader only)
   */
  togglePhotoBlur: protectedProcedure
    .input(
      z.object({
        mediaItemId: z.string().uuid('Invalid media item ID'),
        enableBlur: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }

      const { mediaItemId, enableBlur } = input;

      // Get current blur settings
      const blurSettings = await db
        .select()
        .from(mediaFaceBlurSettings)
        .where(eq(mediaFaceBlurSettings.mediaItemId, mediaItemId))
        .limit(1);

      if (!blurSettings[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Media blur settings not found',
        });
      }

      // Verify user is the uploader
      if (blurSettings[0].uploaderId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the uploader can toggle blur settings',
        });
      }

      // Update blur settings
      await db
        .update(mediaFaceBlurSettings)
        .set({
          isAutoBlurred: enableBlur,
          updatedAt: new Date(),
        })
        .where(eq(mediaFaceBlurSettings.mediaItemId, mediaItemId));

      // Log blur toggle event
      await logAction({
        actionType: 'BLUR_TOGGLED',
        actorId: ctx.user.id,
        targetId: mediaItemId,
        targetType: 'media',
        description: `User toggled blur on media item ${mediaItemId}`,
        metadata: {
          mediaId: mediaItemId,
          viewerId: ctx.user.id,
          blurEnabled: enableBlur,
          blurIntensity: blurSettings[0].blurIntensity,
          clearanceLevel: 'user_dependent',
        },
      });

      // Return updated settings
      const updated = await db
        .select()
        .from(mediaFaceBlurSettings)
        .where(eq(mediaFaceBlurSettings.mediaItemId, mediaItemId))
        .limit(1);

      return {
        id: updated[0]?.id,
        mediaItemId: updated[0]?.mediaItemId,
        uploaderId: updated[0]?.uploaderId,
        faceDetectionStatus: updated[0]?.faceDetectionStatus,
        detectedFaceCount: updated[0]?.detectedFaceCount,
        blurIntensity: updated[0]?.blurIntensity,
        isAutoBlurred: updated[0]?.isAutoBlurred,
        forceBlurByAdmin: updated[0]?.forceBlurByAdmin,
        createdAt: updated[0]?.createdAt,
        updatedAt: updated[0]?.updatedAt,
      };
    }),

  /**
   * Force blur on a photo (admin only)
   */
  adminForceBlur: adminProcedure
    .input(
      z.object({
        mediaItemId: z.string().uuid('Invalid media item ID'),
        forceBlur: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }

      const { mediaItemId, forceBlur } = input;

      // Get current blur settings
      const blurSettings = await db
        .select()
        .from(mediaFaceBlurSettings)
        .where(eq(mediaFaceBlurSettings.mediaItemId, mediaItemId))
        .limit(1);

      if (!blurSettings[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Media blur settings not found',
        });
      }

      // Update blur settings with admin force flag
      await db
        .update(mediaFaceBlurSettings)
        .set({
          forceBlurByAdmin: forceBlur,
          isAutoBlurred: forceBlur ? true : blurSettings[0].isAutoBlurred,
          updatedAt: new Date(),
        })
        .where(eq(mediaFaceBlurSettings.mediaItemId, mediaItemId));

      // Return updated settings
      const updated = await db
        .select()
        .from(mediaFaceBlurSettings)
        .where(eq(mediaFaceBlurSettings.mediaItemId, mediaItemId))
        .limit(1);

      return {
        id: updated[0]?.id,
        mediaItemId: updated[0]?.mediaItemId,
        uploaderId: updated[0]?.uploaderId,
        faceDetectionStatus: updated[0]?.faceDetectionStatus,
        detectedFaceCount: updated[0]?.detectedFaceCount,
        blurIntensity: updated[0]?.blurIntensity,
        isAutoBlurred: updated[0]?.isAutoBlurred,
        forceBlurByAdmin: updated[0]?.forceBlurByAdmin,
        createdAt: updated[0]?.createdAt,
        updatedAt: updated[0]?.updatedAt,
      };
    }),
});
