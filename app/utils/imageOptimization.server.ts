import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

export interface ResponsiveImageSet {
  original: string;
  webp: {
    small: string;   // 480px
    medium: string;  // 768px
    large: string;   // 1200px
  };
  jpeg: {
    small: string;
    medium: string;
    large: string;
  };
  srcset: string;
  srcsetWebp: string;
}

/**
 * Compress and optimize a single image
 */
export async function optimizeImage(
  inputPath: string,
  outputPath: string,
  options: ImageOptimizationOptions = {}
): Promise<Buffer> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 80,
    format = 'webp',
  } = options;

  let pipeline = sharp(inputPath)
    .resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });

  if (format === 'webp') {
    pipeline = pipeline.webp({ quality });
  } else if (format === 'jpeg') {
    pipeline = pipeline.jpeg({ quality, progressive: true });
  } else if (format === 'png') {
    pipeline = pipeline.png({ compressionLevel: 9 });
  }

  const buffer = await pipeline.toBuffer();
  await fs.writeFile(outputPath, buffer);
  return buffer;
}

/**
 * Generate responsive image set with multiple sizes and formats
 */
export async function generateResponsiveImageSet(
  inputPath: string,
  outputDir: string,
  baseName: string
): Promise<ResponsiveImageSet> {
  const sizes = [
    { width: 480, name: 'small' },
    { width: 768, name: 'medium' },
    { width: 1200, name: 'large' },
  ];

  const webpPaths: Record<string, string> = {};
  const jpegPaths: Record<string, string> = {};

  // Generate WebP versions
  for (const { width, name } of sizes) {
    const webpPath = path.join(outputDir, `${baseName}-${width}w.webp`);
    await sharp(inputPath)
      .resize(width, width, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(webpPath);
    webpPaths[name] = webpPath;
  }

  // Generate JPEG versions (fallback)
  for (const { width, name } of sizes) {
    const jpegPath = path.join(outputDir, `${baseName}-${width}w.jpg`);
    await sharp(inputPath)
      .resize(width, width, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toFile(jpegPath);
    jpegPaths[name] = jpegPath;
  }

  // Generate srcset strings
  const srcset = `
    ${jpegPaths.small} 480w,
    ${jpegPaths.medium} 768w,
    ${jpegPaths.large} 1200w
  `.trim();

  const srcsetWebp = `
    ${webpPaths.small} 480w,
    ${webpPaths.medium} 768w,
    ${webpPaths.large} 1200w
  `.trim();

  return {
    original: inputPath,
    webp: {
      small: webpPaths.small,
      medium: webpPaths.medium,
      large: webpPaths.large,
    },
    jpeg: {
      small: jpegPaths.small,
      medium: jpegPaths.medium,
      large: jpegPaths.large,
    },
    srcset,
    srcsetWebp,
  };
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(imagePath: string) {
  const metadata = await sharp(imagePath).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format,
  };
}

/**
 * Calculate aspect ratio for responsive images
 */
export function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor} / ${height / divisor}`;
}
