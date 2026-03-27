/**
 * Image Optimization Utilities
 * 
 * Provides functions for:
 * - Generating responsive srcset strings
 * - Determining image type (lossy/lossless)
 * - Creating WebP and AVIF variants
 * - Calculating responsive sizes
 * - Format detection and conversion
 */

export interface ImageSize {
  width: number;
  density: number;
}

export interface ResponsiveImageConfig {
  sizes: number[];
  densities: number[];
  formats: ('jpeg' | 'webp' | 'avif')[];
}

export interface ImageTypeInfo {
  type: 'lossy' | 'lossless';
  format: string;
  mimeType: string;
}

/**
 * Generate a srcset string for responsive images
 * @param basePath - Base path without extension (e.g., '/images/photo')
 * @param sizes - Array of widths to generate (e.g., [320, 640, 1024, 1920])
 * @param format - Image format (default: 'jpeg')
 * @returns Srcset string for use in img or source tags
 */
export function generateSrcset(
  basePath: string,
  sizes: number[] = [320, 640, 1024, 1280, 1920],
  format: string = 'jpeg'
): string {
  return sizes
    .map((size) => `${basePath}-${size}w.${format} ${size}w`)
    .join(', ');
}

/**
 * Generate a WebP srcset string
 * @param basePath - Base path without extension
 * @param sizes - Array of widths to generate
 * @returns Srcset string for WebP format
 */
export function generateWebpSrcset(
  basePath: string,
  sizes: number[] = [320, 640, 1024, 1280, 1920]
): string {
  return generateSrcset(basePath, sizes, 'webp');
}

/**
 * Generate an AVIF srcset string
 * @param basePath - Base path without extension
 * @param sizes - Array of widths to generate
 * @returns Srcset string for AVIF format
 */
export function generateAvifSrcset(
  basePath: string,
  sizes: number[] = [320, 640, 1024, 1280, 1920]
): string {
  return generateSrcset(basePath, sizes, 'avif');
}

/**
 * Determine if an image is lossy or lossless based on file extension
 * @param filename - Image filename or path
 * @returns Object with type, format, and MIME type
 */
export function determineImageType(filename: string): ImageTypeInfo {
  const ext = filename.toLowerCase().split('.').pop() || '';

  const lossyFormats: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
  };

  const losslessFormats: Record<string, string> = {
    png: 'image/png',
    gif: 'image/gif',
    avif: 'image/avif',
    svg: 'image/svg+xml',
  };

  if (lossyFormats[ext]) {
    return {
      type: 'lossy',
      format: ext,
      mimeType: lossyFormats[ext],
    };
  }

  if (losslessFormats[ext]) {
    return {
      type: 'lossless',
      format: ext,
      mimeType: losslessFormats[ext],
    };
  }

  // Default to lossy JPEG
  return {
    type: 'lossy',
    format: 'jpeg',
    mimeType: 'image/jpeg',
  };
}

/**
 * Calculate aspect ratio from width and height
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns Aspect ratio as a decimal (e.g., 1.5 for 3:2)
 */
export function calculateAspectRatio(width: number, height: number): number {
  if (height === 0) return 1;
  return width / height;
}

/**
 * Format aspect ratio as a string (e.g., '16/9', '4/3')
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns Formatted aspect ratio string
 */
export function formatAspectRatio(width: number, height: number): string {
  const ratio = calculateAspectRatio(width, height);
  
  // Common aspect ratios
  const commonRatios: Record<number, string> = {
    1: '1/1',
    1.333: '4/3',
    1.5: '3/2',
    1.778: '16/9',
    2.333: '21/9',
  };

  // Find closest common ratio
  let closest = '16/9';
  let minDiff = Math.abs(ratio - 1.778);

  for (const [ratioValue, ratioString] of Object.entries(commonRatios)) {
    const diff = Math.abs(ratio - parseFloat(ratioValue));
    if (diff < minDiff) {
      minDiff = diff;
      closest = ratioString;
    }
  }

  return closest;
}

/**
 * Generate responsive sizes attribute for picture element
 * @param breakpoints - Object with breakpoint names and their CSS media queries
 * @returns Sizes attribute string
 */
export function generateResponsiveSizes(
  breakpoints: Record<string, { query: string; size: string }> = {
    mobile: { query: '(max-width: 640px)', size: '100vw' },
    tablet: { query: '(max-width: 1024px)', size: '90vw' },
    desktop: { query: '(min-width: 1025px)', size: '1200px' },
  }
): string {
  return Object.values(breakpoints)
    .map((bp) => `${bp.query} ${bp.size}`)
    .join(', ');
}

/**
 * Create a WebP variant path from original image path
 * @param originalPath - Original image path
 * @returns Path to WebP variant
 */
export function createWebpVariant(originalPath: string): string {
  return originalPath.replace(/\.[^.]+$/, '.webp');
}

/**
 * Create an AVIF variant path from original image path
 * @param originalPath - Original image path
 * @returns Path to AVIF variant
 */
export function createAvifVariant(originalPath: string): string {
  return originalPath.replace(/\.[^.]+$/, '.avif');
}

/**
 * Get recommended image sizes for responsive design
 * @param maxWidth - Maximum image width in pixels
 * @returns Array of recommended sizes
 */
export function getResponsiveSizes(maxWidth: number = 1920): number[] {
  const sizes = [320, 640, 960, 1280, 1920];
  return sizes.filter((size) => size <= maxWidth);
}

/**
 * Calculate image dimensions maintaining aspect ratio
 * @param originalWidth - Original image width
 * @param originalHeight - Original image height
 * @param targetWidth - Target width (height will be calculated)
 * @returns Object with calculated width and height
 */
export function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth: number
): { width: number; height: number } {
  const ratio = originalHeight / originalWidth;
  return {
    width: targetWidth,
    height: Math.round(targetWidth * ratio),
  };
}

/**
 * Generate a complete picture element srcset configuration
 * @param basePath - Base path without extension
 * @param options - Configuration options
 * @returns Object with srcset strings for different formats
 */
export function generatePictureSrcsets(
  basePath: string,
  options: {
    sizes?: number[];
    includeWebp?: boolean;
    includeAvif?: boolean;
    includeJpeg?: boolean;
  } = {}
): {
  jpeg?: string;
  webp?: string;
  avif?: string;
} {
  const {
    sizes = [320, 640, 1024, 1280, 1920],
    includeWebp = true,
    includeAvif = true,
    includeJpeg = true,
  } = options;

  return {
    ...(includeJpeg && { jpeg: generateSrcset(basePath, sizes, 'jpeg') }),
    ...(includeWebp && { webp: generateWebpSrcset(basePath, sizes) }),
    ...(includeAvif && { avif: generateAvifSrcset(basePath, sizes) }),
  };
}

/**
 * Check if a URL is an external image
 * @param url - Image URL
 * @returns True if URL is external (http/https)
 */
export function isExternalImage(url: string): boolean {
  return /^https?:\/\//.test(url);
}

/**
 * Get image extension from URL
 * @param url - Image URL
 * @returns File extension (without dot)
 */
export function getImageExtension(url: string): string {
  const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
  return match ? match[1].toLowerCase() : 'jpeg';
}
