/**
 * Compression Profiles Configuration
 * 
 * Defines all compression profiles and quality presets for the image optimization system.
 * 
 * @module config/compressionProfiles
 */

import type {
  CompressionProfile,
  QualityPreset,
  CompressionProfileName,
  QualityLevel,
} from '~/types/compression';

/**
 * Thumbnail Profile
 * Use Case: Gallery previews, list items, avatars
 */
export const THUMBNAIL_PROFILE: CompressionProfile = {
  name: 'thumbnail',
  displayName: 'Thumbnail',
  description: 'Optimized for small previews and thumbnails',
  maxWidth: 150,
  maxHeight: 150,
  format: 'jpeg',
  jpegQuality: 60,
  webpQuality: 55,
  pngCompression: 9,
  avifQuality: 55,
  targetSize: {
    min: 40 * 1024,
    max: 60 * 1024,
  },
  stripExif: true,
  stripICC: true,
  stripXMP: true,
  preserveOrientation: true,
  preserveColorSpace: false,
  progressive: false,
  interlace: false,
  scalingAlgorithm: 'lanczos',
  allowUpscaling: false,
  useCase: 'Gallery grid previews, user avatars, timeline thumbnails, album covers, search results',
  recommendedQualityLevel: 1,
};

/**
 * Mobile Profile
 * Use Case: Mobile devices, slow networks, responsive images
 */
export const MOBILE_PROFILE: CompressionProfile = {
  name: 'mobile',
  displayName: 'Mobile',
  description: 'Optimized for mobile devices and slow networks',
  maxWidth: 480,
  maxHeight: 720,
  format: 'webp',
  jpegQuality: 72,
  webpQuality: 70,
  pngCompression: 8,
  avifQuality: 68,
  targetSize: {
    min: 80 * 1024,
    max: 150 * 1024,
  },
  stripExif: true,
  stripICC: false,
  stripXMP: true,
  preserveOrientation: true,
  preserveColorSpace: true,
  progressive: true,
  interlace: true,
  scalingAlgorithm: 'cubic',
  allowUpscaling: false,
  useCase: 'Mobile app images, responsive image sources (srcset), social media sharing, email attachments, low-bandwidth scenarios',
  recommendedQualityLevel: 3,
};

/**
 * Desktop Profile
 * Use Case: Desktop browsers, high-quality displays, full-page images
 */
export const DESKTOP_PROFILE: CompressionProfile = {
  name: 'desktop',
  displayName: 'Desktop',
  description: 'Optimized for desktop browsers and high-quality displays',
  maxWidth: 1200,
  maxHeight: 1600,
  format: 'webp',
  jpegQuality: 82,
  webpQuality: 80,
  pngCompression: 7,
  avifQuality: 78,
  targetSize: {
    min: 200 * 1024,
    max: 400 * 1024,
  },
  stripExif: true,
  stripICC: false,
  stripXMP: true,
  preserveOrientation: true,
  preserveColorSpace: true,
  progressive: true,
  interlace: false,
  scalingAlgorithm: 'cubic',
  allowUpscaling: false,
  useCase: 'Full-page hero images, photo gallery lightbox, desktop wallpapers, high-resolution displays, print-quality images',
  recommendedQualityLevel: 4,
};

/**
 * Original Profile
 * Use Case: Archive, backup, high-fidelity storage
 */
export const ORIGINAL_PROFILE: CompressionProfile = {
  name: 'original',
  displayName: 'Original',
  description: 'Preserves original image with minimal compression',
  maxWidth: null,
  maxHeight: null,
  format: 'original',
  jpegQuality: 95,
  webpQuality: 95,
  pngCompression: 1,
  avifQuality: 95,
  targetSize: undefined,
  stripExif: false,
  stripICC: false,
  stripXMP: false,
  preserveOrientation: true,
  preserveColorSpace: true,
  progressive: false,
  interlace: false,
  scalingAlgorithm: 'lanczos',
  allowUpscaling: false,
  useCase: 'Archive storage, backup copies, high-resolution downloads, print production, future re-processing',
  recommendedQualityLevel: 6,
};

/**
 * All compression profiles
 */
export const COMPRESSION_PROFILES: Record<CompressionProfileName, CompressionProfile> = {
  thumbnail: THUMBNAIL_PROFILE,
  mobile: MOBILE_PROFILE,
  desktop: DESKTOP_PROFILE,
  original: ORIGINAL_PROFILE,
};

/**
 * Quality Level 1: Ultra-Low
 * Use Case: Thumbnails, previews
 */
export const QUALITY_LEVEL_1: QualityPreset = {
  level: 1,
  name: 'ultra-low',
  jpegQuality: 55,
  webpQuality: 50,
  targetUseCase: 'thumbnails, previews',
  estimatedSize: {
    min: 30 * 1024,
    max: 50 * 1024,
  },
  description: 'Very aggressive compression for thumbnails and previews',
};

/**
 * Quality Level 2: Low
 * Use Case: Mobile (slow networks)
 */
export const QUALITY_LEVEL_2: QualityPreset = {
  level: 2,
  name: 'low',
  jpegQuality: 68,
  webpQuality: 63,
  targetUseCase: 'mobile (slow networks)',
  estimatedSize: {
    min: 60 * 1024,
    max: 100 * 1024,
  },
  description: 'Aggressive compression for slow mobile networks',
};

/**
 * Quality Level 3: Medium
 * Use Case: Mobile (normal networks)
 */
export const QUALITY_LEVEL_3: QualityPreset = {
  level: 3,
  name: 'medium',
  jpegQuality: 73,
  webpQuality: 70,
  targetUseCase: 'mobile (normal networks)',
  estimatedSize: {
    min: 100 * 1024,
    max: 150 * 1024,
  },
  description: 'Balanced compression for mobile devices',
};

/**
 * Quality Level 4: High
 * Use Case: Desktop, responsive
 */
export const QUALITY_LEVEL_4: QualityPreset = {
  level: 4,
  name: 'high',
  jpegQuality: 82,
  webpQuality: 78,
  targetUseCase: 'desktop, responsive',
  estimatedSize: {
    min: 200 * 1024,
    max: 350 * 1024,
  },
  description: 'High quality for desktop browsers',
};

/**
 * Quality Level 5: Very High
 * Use Case: Professional, print
 */
export const QUALITY_LEVEL_5: QualityPreset = {
  level: 5,
  name: 'very-high',
  jpegQuality: 90,
  webpQuality: 87,
  targetUseCase: 'professional, print',
  estimatedSize: {
    min: 350 * 1024,
    max: 500 * 1024,
  },
  description: 'Very high quality for professional and print use',
};

/**
 * Quality Level 6: Lossless
 * Use Case: Archive, backup
 */
export const QUALITY_LEVEL_6: QualityPreset = {
  level: 6,
  name: 'lossless',
  jpegQuality: 95,
  webpQuality: 95,
  targetUseCase: 'archive, backup',
  estimatedSize: {
    min: 500 * 1024,
    max: 2 * 1024 * 1024,
  },
  description: 'Lossless compression for archival and backup',
};

/**
 * All quality presets
 */
export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  1: QUALITY_LEVEL_1,
  2: QUALITY_LEVEL_2,
  3: QUALITY_LEVEL_3,
  4: QUALITY_LEVEL_4,
  5: QUALITY_LEVEL_5,
  6: QUALITY_LEVEL_6,
};

/**
 * Get compression profile by name
 */
export function getCompressionProfile(
  name: CompressionProfileName
): CompressionProfile {
  const profile = COMPRESSION_PROFILES[name];
  if (!profile) {
    throw new Error(`Unknown compression profile: ${name}`);
  }
  return profile;
}

/**
 * Get quality preset by level
 */
export function getQualityPreset(level: QualityLevel): QualityPreset {
  const preset = QUALITY_PRESETS[level];
  if (!preset) {
    throw new Error(`Unknown quality level: ${level}`);
  }
  return preset;
}

/**
 * Get all profile names
 */
export function getAllProfileNames(): CompressionProfileName[] {
  return Object.keys(COMPRESSION_PROFILES) as CompressionProfileName[];
}

/**
 * Get all quality levels
 */
export function getAllQualityLevels(): QualityLevel[] {
  return Object.keys(QUALITY_PRESETS).map(Number) as QualityLevel[];
}

/**
 * Recommend profile based on image dimensions
 */
export function recommendProfile(
  width: number,
  height: number
): CompressionProfileName {
  const maxDimension = Math.max(width, height);

  if (maxDimension <= 200) {
    return 'thumbnail';
  } else if (maxDimension <= 600) {
    return 'mobile';
  } else {
    return 'desktop';
  }
}

/**
 * Recommend quality level based on use case
 */
export function recommendQualityLevel(useCase: string): QualityLevel {
  const lowerCase = useCase.toLowerCase();

  if (
    lowerCase.includes('thumbnail') ||
    lowerCase.includes('preview') ||
    lowerCase.includes('avatar')
  ) {
    return 1;
  } else if (
    lowerCase.includes('mobile') ||
    lowerCase.includes('slow') ||
    lowerCase.includes('low-bandwidth')
  ) {
    return 2;
  } else if (
    lowerCase.includes('responsive') ||
    lowerCase.includes('mobile') &&
      !lowerCase.includes('slow')
  ) {
    return 3;
  } else if (
    lowerCase.includes('desktop') ||
    lowerCase.includes('high-quality')
  ) {
    return 4;
  } else if (
    lowerCase.includes('professional') ||
    lowerCase.includes('print')
  ) {
    return 5;
  } else if (
    lowerCase.includes('archive') ||
    lowerCase.includes('backup') ||
    lowerCase.includes('original')
  ) {
    return 6;
  }

  return 3; // Default to medium
}

/**
 * Get estimated file size for a profile
 */
export function getEstimatedSize(
  profile: CompressionProfileName,
  originalSize: number
): { min: number; max: number } {
  const prof = getCompressionProfile(profile);

  if (!prof.targetSize) {
    return { min: originalSize, max: originalSize };
  }

  return prof.targetSize;
}

/**
 * Calculate compression ratio
 */
export function calculateCompressionRatio(
  originalSize: number,
  compressedSize: number
): number {
  if (originalSize === 0) return 0;
  return compressedSize / originalSize;
}

/**
 * Calculate savings percentage
 */
export function calculateSavingsPercentage(
  originalSize: number,
  compressedSize: number
): number {
  if (originalSize === 0) return 0;
  return ((originalSize - compressedSize) / originalSize) * 100;
}
