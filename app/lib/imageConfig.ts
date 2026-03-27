/**
 * Image Optimization Configuration
 * 
 * Defines compression profiles, feature flags, and optimization settings
 */

export interface CompressionProfile {
  name: string;
  quality: number;
  format: 'jpeg' | 'webp' | 'avif';
  description: string;
}

export interface ImageOptimizationConfig {
  enabled: boolean;
  compression: {
    lossy: CompressionProfile;
    lossless: CompressionProfile;
    photo: CompressionProfile;
  };
  responsive: {
    breakpoints: number[];
    densities: number[];
  };
  formats: {
    primary: string;
    fallback: string;
    modern: string[];
  };
  monitoring: {
    enabled: boolean;
    trackLoadTimes: boolean;
    trackErrors: boolean;
  };
  cache: {
    enabled: boolean;
    ttl: number; // in seconds
  };
}

/**
 * Image Optimization Configuration
 * 
 * Feature flag and compression settings for image optimization
 */
export const IMAGE_OPTIMIZATION_CONFIG: ImageOptimizationConfig = {
  // Master feature flag for image optimization
  enabled: process.env.REACT_APP_IMAGE_OPTIMIZATION_ENABLED === 'true' || true,

  // Compression profiles for different image types
  compression: {
    // Lossy compression for photos and complex images
    lossy: {
      name: 'lossy',
      quality: 75, // 0-100, lower = more compression
      format: 'webp',
      description: 'Lossy compression for photos and complex images',
    },

    // Lossless compression for graphics and text
    lossless: {
      name: 'lossless',
      quality: 90, // 0-100, lower = more compression
      format: 'webp',
      description: 'Lossless compression for graphics and text',
    },

    // High-quality photo compression
    photo: {
      name: 'photo',
      quality: 80, // 0-100
      format: 'avif',
      description: 'High-quality photo compression with AVIF format',
    },
  },

  // Responsive image settings
  responsive: {
    // Breakpoints for responsive images (in pixels)
    breakpoints: [320, 640, 960, 1280, 1920],

    // Device pixel ratios to generate
    densities: [1, 2],
  },

  // Image format preferences
  formats: {
    primary: 'jpeg', // Fallback format
    fallback: 'jpeg', // Ultimate fallback
    modern: ['avif', 'webp'], // Modern formats in order of preference
  },

  // Performance monitoring
  monitoring: {
    enabled: true,
    trackLoadTimes: true,
    trackErrors: true,
  },

  // Caching configuration
  cache: {
    enabled: true,
    ttl: 86400, // 24 hours in seconds
  },
};

/**
 * Get compression profile by image type
 * @param imageType - 'lossy', 'lossless', or 'photo'
 * @returns Compression profile configuration
 */
export function getCompressionProfile(
  imageType: 'lossy' | 'lossless' | 'photo'
): CompressionProfile {
  return IMAGE_OPTIMIZATION_CONFIG.compression[imageType];
}

/**
 * Check if image optimization is enabled
 * @returns True if optimization is enabled
 */
export function isImageOptimizationEnabled(): boolean {
  return IMAGE_OPTIMIZATION_CONFIG.enabled;
}

/**
 * Get responsive breakpoints
 * @returns Array of breakpoint widths
 */
export function getResponsiveBreakpoints(): number[] {
  return IMAGE_OPTIMIZATION_CONFIG.responsive.breakpoints;
}

/**
 * Get device pixel ratios
 * @returns Array of DPR values
 */
export function getDevicePixelRatios(): number[] {
  return IMAGE_OPTIMIZATION_CONFIG.responsive.densities;
}

/**
 * Get modern image formats in preference order
 * @returns Array of modern format names
 */
export function getModernFormats(): string[] {
  return IMAGE_OPTIMIZATION_CONFIG.formats.modern;
}

/**
 * Get fallback image format
 * @returns Fallback format name
 */
export function getFallbackFormat(): string {
  return IMAGE_OPTIMIZATION_CONFIG.formats.fallback;
}

/**
 * Check if monitoring is enabled
 * @returns True if monitoring is enabled
 */
export function isMonitoringEnabled(): boolean {
  return IMAGE_OPTIMIZATION_CONFIG.monitoring.enabled;
}

/**
 * Check if caching is enabled
 * @returns True if caching is enabled
 */
export function isCachingEnabled(): boolean {
  return IMAGE_OPTIMIZATION_CONFIG.cache.enabled;
}

/**
 * Get cache TTL in seconds
 * @returns Cache TTL value
 */
export function getCacheTTL(): number {
  return IMAGE_OPTIMIZATION_CONFIG.cache.ttl;
}
