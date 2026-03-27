// File: app/server/services/blurDisplay.service.ts (181 lines, 5098 bytes)

import { userFaceBlurPreferences, mediaFaceBlurSettings, userClearanceLevels } from "~/db/schema";
import { eq, and } from "drizzle-orm";
import type { Database } from "~/db/index.server";

/**
 * Determines if a viewer should see a blurred version of a photo
 * 
 * Checks three conditions:
 * 1. User blur preferences (blurAllFaces, blurSpecificPeople)
 * 2. Photo blur settings (forceBlurByAdmin, isAutoBlurred)
 * 3. Viewer clearance level
 * 
 * Returns true if ANY condition requires blur to be applied
 */
export async function shouldBlurForViewer(
  db: Database,
  viewerId: string,
  mediaItemId: string,
  familyId: string
): Promise<boolean> {
  try {
    // Fetch user blur preferences
    const userPreferences = await db
      .select()
      .from(userFaceBlurPreferences)
      .where(
        and(
          eq(userFaceBlurPreferences.userId, viewerId),
          eq(userFaceBlurPreferences.familyId, familyId)
        )
      )
      .limit(1);

    // Fetch media blur settings
    const mediaBlurSettings = await db
      .select()
      .from(mediaFaceBlurSettings)
      .where(eq(mediaFaceBlurSettings.mediaItemId, mediaItemId))
      .limit(1);

    // Check if viewer has clearance level
    const viewerClearance = await db
      .select()
      .from(userClearanceLevels)
      .where(eq(userClearanceLevels.familyId, familyId))
      .limit(1);

    // Condition 1: Check user blur preferences
    if (userPreferences.length > 0) {
      const prefs = userPreferences[0];
      
      // If user has blurAllFaces enabled, blur should be applied
      if (prefs.blurAllFaces) {
        return true;
      }

      // If user has specific people to blur, check if uploader is in that list
      if (prefs.blurSpecificPeople && Array.isArray(prefs.blurSpecificPeople)) {
        const blurList = prefs.blurSpecificPeople as string[];
        if (blurList.includes(viewerId)) {
          return true;
        }
      }
    }

    // Condition 2: Check photo blur settings
    if (mediaBlurSettings.length > 0) {
      const settings = mediaBlurSettings[0];
      
      // If admin forced blur, apply it
      if (settings.forceBlurByAdmin) {
        return true;
      }

      // If photo was auto-blurred, apply it
      if (settings.isAutoBlurred) {
        return true;
      }
    }

    // Condition 3: Check viewer clearance level
    // If viewer has no clearance level assigned, blur should be applied (edge case)
    if (viewerClearance.length === 0) {
      return true;
    }

    // No blur conditions met
    return false;
  } catch (error) {
    // On error, default to blurring for safety
    console.error("Error checking blur display settings:", error);
    return true;
  }
}

/**
 * Batch check blur status for multiple media items
 * Returns a map of mediaItemId -> shouldBlur boolean
 */
export async function shouldBlurForViewerBatch(
  db: Database,
  viewerId: string,
  mediaItemIds: string[],
  familyId: string
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();

  try {
    // Fetch user blur preferences once
    const userPreferences = await db
      .select()
      .from(userFaceBlurPreferences)
      .where(
        and(
          eq(userFaceBlurPreferences.userId, viewerId),
          eq(userFaceBlurPreferences.familyId, familyId)
        )
      )
      .limit(1);

    // Fetch all media blur settings for the given items
    const mediaBlurSettingsMap = new Map<string, typeof mediaFaceBlurSettings.$inferSelect>();
    if (mediaItemIds.length > 0) {
      const settings = await db
        .select()
        .from(mediaFaceBlurSettings);
      
      settings.forEach((setting: typeof mediaFaceBlurSettings.$inferSelect) => {
        if (mediaItemIds.includes(setting.mediaItemId)) {
          mediaBlurSettingsMap.set(setting.mediaItemId, setting);
        }
      });
    }

    // Check if viewer has clearance level
    const viewerClearance = await db
      .select()
      .from(userClearanceLevels)
      .where(eq(userClearanceLevels.familyId, familyId))
      .limit(1);

    const hasNoClearance = viewerClearance.length === 0;

    // Process each media item
    for (const mediaItemId of mediaItemIds) {
      let shouldBlur = false;

      // Check user preferences
      if (userPreferences.length > 0) {
        const prefs = userPreferences[0];
        if (prefs.blurAllFaces) {
          shouldBlur = true;
        }
      }

      // Check media blur settings
      const mediaSettings = mediaBlurSettingsMap.get(mediaItemId);
      if (mediaSettings) {
        if (mediaSettings.forceBlurByAdmin || mediaSettings.isAutoBlurred) {
          shouldBlur = true;
        }
      }

      // Check clearance level
      if (hasNoClearance) {
        shouldBlur = true;
      }

      results.set(mediaItemId, shouldBlur);
    }

    return results;
  } catch (error) {
    console.error("Error checking batch blur display settings:", error);
    // Default to blurring all for safety
    const safeResults = new Map<string, boolean>();
    mediaItemIds.forEach((id) => safeResults.set(id, true));
    return safeResults;
  }
}

