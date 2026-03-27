/**
 * Responsive Image srcset Generator
 * 
 * Utilities for generating responsive image srcset attributes and sizes declarations.
 * Supports:
 * - Multiple width variants
 * - Format-specific srcsets (WebP, JPEG, etc.)
 * - Automatic width calculation
 * - Device pixel ratio variants
 * - Lazy loading optimization
 * 
 * @module utils/srcsetGenerator
 */

import type { ImageFormat, CompressionProfileName } from '~/types/compression';

/**
 * Srcset variant configuration
 */
export interface SrcsetVariant {
  /** Image path */
  path: string;

  /** Width in pixels */
  width: number;

  /** Device pixel ratio (1x, 2x, etc.) */
  dpr?: number;

  /** Image format */
  format?: ImageFormat;

  /** File size in bytes */
  size?: number;
}

/**
 * Srcset generation options
 */
export interface SrcsetGenerationOptions {
  /** Base image path */
  basePath: string;

  /** Width variants to generate */
  widths?: number[];

  /** Device pixel ratios to support */
  dprs?: number[];

  /** Include format variants (WebP, JPEG, etc.) */
  formats?: ImageFormat[];

  /** Responsive sizes declaration */
  sizes?: string;

  /** Use density descriptors instead of width descriptors */
  useDensity?: boolean;

  /** Include file size information */
  includeSize?: boolean;

  /** Naming pattern for variants */
  namingPattern?: string;
}

/**
 * Srcset generation result
 */
export interface SrcsetResult {
  /** Main srcset attribute value */
  srcset: string;

  /** Sizes attribute value */
  sizes: string;

  /** Format-specific srcsets */
  formatSrcsets: Record<ImageFormat, string>;

  /** Variants metadata */
  variants: SrcsetVariant[];

  /** Total variants generated */
  variantCount: number;

  /** Recommended loading strategy */
  loadingStrategy: 'lazy' | 'eager' | 'auto';
}

/**
 * Common responsive breakpoints
 */
export const RESPONSIVE_BREAKPOINTS = {
  mobile: [320, 480, 640],
  tablet: [768, 1024],
  desktop: [1280, 1440, 1920],
  all: [320, 480, 640, 768, 1024, 1280, 1440, 1920],
};

/**
 * Common sizes declarations
 */
export const COMMON_SIZES = {
  fullWidth: '100vw',
  halfWidth: '50vw',
  thirdWidth: '33vw',
  responsive: '(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 60vw',
  mobileFirst: '(max-width: 480px) 100vw, (max-width: 768px) 90vw, (max-width: 1024px) 80vw, 70vw',
  heroImage: '(max-width: 640px) 100vw, (max-width: 1280px) 90vw, 1280px',
  thumbnail: '(max-width: 480px) 80px, (max-width: 768px) 120px, 150px',
  avatar: '(max-width: 480px) 40px, (max-width: 768px) 50px, 64px',
};

/**
 * Generate srcset string from variants
 */
export function generateSrcsetString(
  variants: SrcsetVariant[],
  useDensity: boolean = false
): string {
  if (variants.length === 0) {
    return '';
  }

  return variants
    .map((variant) => {
      if (useDensity && variant.dpr) {
        return `${variant.path} ${variant.dpr}x`;
      }
      return `${variant.path} ${variant.width}w`;
    })
    .join(', ');
}

/**
 * Generate responsive image srcset
 */
export function generateSrcset(
  options: SrcsetGenerationOptions
): SrcsetResult {
  const {
    basePath,
    widths = RESPONSIVE_BREAKPOINTS.all,
    dprs = [1, 2],
    formats = ['webp', 'jpeg'],
    sizes = COMMON_SIZES.responsive,
    useDensity = false,
    includeSize = false,
    namingPattern = '{base}-{width}w.{format}',
  } = options;

  const variants: SrcsetVariant[] = [];
  const formatSrcsets: Record<ImageFormat, string> = {
    avif: '',
    jpeg: '',
    original: '',
    png: '',
    webp: '',
  };

  // Generate variants for each width
  for (const width of widths) {
    for (const format of formats) {
      const path = namingPattern
        .replace('{base}', basePath)
        .replace('{width}', width.toString())
        .replace('{format}', format);

      variants.push({
        path,
        width,
        format: format as ImageFormat,
      });

      // Group by format
      if (!formatSrcsets[format as ImageFormat]) {
        formatSrcsets[format as ImageFormat] = '';
      }
    }
  }

  // Generate DPR variants if needed
  if (useDensity && dprs.length > 0) {
    const dprVariants: SrcsetVariant[] = [];
    for (const dpr of dprs) {
      const path = namingPattern
        .replace('{base}', basePath)
        .replace('{width}', (widths[0] * dpr).toString())
        .replace('{format}', formats[0]);

      dprVariants.push({
        path,
        width: widths[0],
        dpr,
        format: formats[0] as ImageFormat,
      });
    }
    variants.push(...dprVariants);
  }

  // Generate format-specific srcsets
  for (const format of formats) {
    const formatVariants = variants.filter((v) => v.format === format);
    formatSrcsets[format as ImageFormat] = generateSrcsetString(
      formatVariants,
      useDensity
    );
  }

  // Determine loading strategy
  const loadingStrategy: 'lazy' | 'eager' | 'auto' =
    widths[0] <= 640 ? 'eager' : 'lazy';

  return {
    srcset: generateSrcsetString(variants, useDensity),
    sizes,
    formatSrcsets,
    variants,
    variantCount: variants.length,
    loadingStrategy,
  };
}

/**
 * Generate picture element HTML
 */
export function generatePictureElement(
  options: SrcsetGenerationOptions & {
    alt: string;
    title?: string;
    className?: string;
  }
): string {
  const { alt, title, className, formats = ['webp', 'jpeg'] } = options;
  const srcset = generateSrcset(options);

  let html = '<picture>\n';

  // Add format-specific sources
  for (const format of formats) {
    if (format !== 'jpeg') {
      const srcsetStr = srcset.formatSrcsets[format as ImageFormat];
      if (srcsetStr) {
        html += `  <source srcset="${srcsetStr}" type="image/${format}" sizes="${srcset.sizes}" />\n`;
      }
    }
  }

  // Add fallback img
  const jpegSrcset = srcset.formatSrcsets['jpeg'];
  const fallbackPath = options.basePath.replace(/\.[^.]+$/, '.jpg');

  html += `  <img\n`;
  html += `    src="${fallbackPath}"\n`;
  if (jpegSrcset) {
    html += `    srcset="${jpegSrcset}"\n`;
  }
  html += `    sizes="${srcset.sizes}"\n`;
  html += `    alt="${alt}"\n`;
  if (title) {
    html += `    title="${title}"\n`;
  }
  if (className) {
    html += `    class="${className}"\n`;
  }
  html += `    loading="${srcset.loadingStrategy}"\n`;
  html += `  />\n`;
  html += '</picture>';

  return html;
}

/**
 * Generate img element with srcset
 */
export function generateImgElement(
  options: SrcsetGenerationOptions & {
    alt: string;
    title?: string;
    className?: string;
    id?: string;
  }
): string {
  const { alt, title, className, id } = options;
  const srcset = generateSrcset(options);

  let html = '<img\n';
  html += `  src="${options.basePath}"\n`;
  html += `  srcset="${srcset.srcset}"\n`;
  html += `  sizes="${srcset.sizes}"\n`;
  html += `  alt="${alt}"\n`;

  if (title) {
    html += `  title="${title}"\n`;
  }
  if (className) {
    html += `  class="${className}"\n`;
  }
  if (id) {
    html += `  id="${id}"\n`;
  }

  html += `  loading="${srcset.loadingStrategy}"\n`;
  html += '/>';

  return html;
}

/**
 * Calculate optimal widths for an image
 */
export function calculateOptimalWidths(
  originalWidth: number,
  minWidth: number = 320,
  maxWidth: number = 1920,
  step: number = 320
): number[] {
  const widths: number[] = [];

  for (let w = minWidth; w <= Math.min(originalWidth, maxWidth); w += step) {
    widths.push(w);
  }

  // Always include original width if not already included
  if (widths[widths.length - 1] !== originalWidth && originalWidth <= maxWidth) {
    widths.push(originalWidth);
  }

  return widths.sort((a, b) => a - b);
}

/**
 * Generate srcset for different device types
 */
export function generateDeviceSpecificSrcsets(
  basePath: string,
  originalWidth: number
): {
  mobile: SrcsetResult;
  tablet: SrcsetResult;
  desktop: SrcsetResult;
} {
  return {
    mobile: generateSrcset({
      basePath,
      widths: RESPONSIVE_BREAKPOINTS.mobile,
      sizes: COMMON_SIZES.mobileFirst,
    }),
    tablet: generateSrcset({
      basePath,
      widths: RESPONSIVE_BREAKPOINTS.tablet,
      sizes: COMMON_SIZES.responsive,
    }),
    desktop: generateSrcset({
      basePath,
      widths: RESPONSIVE_BREAKPOINTS.desktop.filter((w) => w <= originalWidth),
      sizes: COMMON_SIZES.fullWidth,
    }),
  };
}

/**
 * Generate srcset for hero image
 */
export function generateHeroImageSrcset(basePath: string): SrcsetResult {
  return generateSrcset({
    basePath,
    widths: [640, 960, 1280, 1920],
    sizes: COMMON_SIZES.heroImage,
    formats: ['webp', 'jpeg'],
  });
}

/**
 * Generate srcset for thumbnail
 */
export function generateThumbnailSrcset(basePath: string): SrcsetResult {
  return generateSrcset({
    basePath,
    widths: [80, 120, 150],
    sizes: COMMON_SIZES.thumbnail,
    formats: ['webp', 'jpeg'],
  });
}

/**
 * Generate srcset for avatar
 */
export function generateAvatarSrcset(basePath: string): SrcsetResult {
  return generateSrcset({
    basePath,
    widths: [40, 50, 64, 128],
    dprs: [1, 2],
    sizes: COMMON_SIZES.avatar,
    formats: ['webp', 'jpeg'],
    useDensity: true,
  });
}

/**
 * Estimate bandwidth savings with srcset
 */
export function estimateBandwidthSavings(
  originalSize: number,
  variants: SrcsetVariant[]
): {
  averageSize: number;
  savings: number;
  savingsPercentage: number;
} {
  if (variants.length === 0) {
    return { averageSize: originalSize, savings: 0, savingsPercentage: 0 };
  }

  const totalSize = variants.reduce((sum, v) => sum + (v.size || 0), 0);
  const averageSize = totalSize / variants.length;
  const savings = originalSize - averageSize;
  const savingsPercentage = (savings / originalSize) * 100;

  return {
    averageSize,
    savings,
    savingsPercentage,
  };
}

/**
 * Validate srcset string
 */
export function validateSrcset(srcset: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!srcset || srcset.trim().length === 0) {
    errors.push('Srcset is empty');
    return { valid: false, errors };
  }

  const variants = srcset.split(',').map((s) => s.trim());

  for (const variant of variants) {
    const parts = variant.split(/\s+/);
    if (parts.length < 2) {
      errors.push(`Invalid variant: ${variant}`);
    }

    const descriptor = parts[parts.length - 1];
    if (!descriptor.match(/^\d+[wx]$/)) {
      errors.push(`Invalid descriptor: ${descriptor}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse srcset string into variants
 */
export function parseSrcset(srcset: string): SrcsetVariant[] {
  const variants: SrcsetVariant[] = [];

  const parts = srcset.split(',').map((s) => s.trim());

  for (const part of parts) {
    const match = part.match(/^(.+?)\s+(\d+)([wx])$/);
    if (match) {
      const [, path, value, descriptor] = match;
      variants.push({
        path: path.trim(),
        width: descriptor === 'w' ? parseInt(value, 10) : parseInt(value, 10),
        dpr: descriptor === 'x' ? parseInt(value, 10) : undefined,
      });
    }
  }

  return variants;
}

/**
 * Merge multiple srcsets
 */
export function mergeSrcsets(...srcsets: string[]): string {
  const allVariants: SrcsetVariant[] = [];

  for (const srcset of srcsets) {
    const variants = parseSrcset(srcset);
    allVariants.push(...variants);
  }

  // Remove duplicates
  const uniqueVariants = Array.from(
    new Map(allVariants.map((v) => [v.path, v])).values()
  );

  return generateSrcsetString(uniqueVariants);
}
