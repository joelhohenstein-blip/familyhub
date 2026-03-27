// Feature tier definitions
const tierMatrix: Record<string, string[]> = {
  free: [
    "message_board",
    "view_photos",
    "view_videos",
    "view_weather",
    "stream_movies",
  ],
  premium: [
    "message_board",
    "view_photos",
    "view_videos",
    "view_weather",
    "stream_movies",
    "audio_video_calls",
    "upload_photos",
    "upload_videos",
    "advanced_streaming_services",
    "priority_support",
  ],
};

export const tierFeatures = {
  /**
   * Check if a user with a given tier can access a feature
   */
  canUserAccessFeature: (tier: string, featureName: string): boolean => {
    const features = tierMatrix[tier] || tierMatrix.free;
    return features.includes(featureName);
  },

  /**
   * Get all features available for a specific tier
   */
  getFeaturesByTier: (tier: string): string[] => {
    return tierMatrix[tier] || tierMatrix.free;
  },

  /**
   * Get the minimum tier required for a feature
   */
  getFeatureRequiredTier: (featureName: string): string => {
    if (tierMatrix.premium.includes(featureName)) {
      if (tierMatrix.free.includes(featureName)) {
        return "free";
      }
      return "premium";
    }
    return "free";
  },

  /**
   * Get all available features across all tiers
   */
  getAllFeatures: (): Record<string, { tier: string; description: string }> => {
    const allFeatures: Record<string, { tier: string; description: string }> =
      {};

    const descriptions: Record<string, string> = {
      message_board: "Post and read family messages",
      view_photos: "View family photos",
      view_videos: "View family videos",
      view_weather: "Check local weather",
      stream_movies: "Stream movies from free services",
      audio_video_calls: "Make audio and video calls",
      upload_photos: "Upload photos to the hub",
      upload_videos: "Upload videos to the hub",
      advanced_streaming_services: "Access more streaming services",
      priority_support: "Get priority customer support",
    };

    for (const [tier, features] of Object.entries(tierMatrix)) {
      for (const feature of features) {
        if (!allFeatures[feature]) {
          allFeatures[feature] = {
            tier,
            description: descriptions[feature] || feature,
          };
        }
      }
    }

    return allFeatures;
  },
};
