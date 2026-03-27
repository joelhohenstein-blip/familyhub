import sharp from 'sharp';
import type { FaceDetectionResult } from './faceDetection.service';

export interface BlurProcessingOptions {
  blurIntensity?: number; // 0-100
  format?: 'jpeg' | 'png' | 'webp';
}

export interface BlurProcessingResult {
  blurredImageBuffer: Buffer;
  blurredImageUrl?: string;
  facesBlurred: number;
  processingTime: number;
}

/**
 * Apply face blur to an image based on face detection results
 * @param imageBuffer - Original image buffer
 * @param faceDetectionResult - Face detection results with bounding boxes
 * @param options - Blur processing options (intensity, format)
 * @returns Blurred image buffer and metadata
 */
export async function applyBlurToImage(
  imageBuffer: Buffer,
  faceDetectionResult: FaceDetectionResult,
  options: BlurProcessingOptions = {}
): Promise<BlurProcessingResult> {
  const startTime = Date.now();
  const blurIntensity = options.blurIntensity ?? 50;
  const format = options.format ?? 'jpeg';

  try {
    // If no faces detected, return original image
    if (faceDetectionResult.faceCount === 0) {
      return {
        blurredImageBuffer: imageBuffer,
        facesBlurred: 0,
        processingTime: Date.now() - startTime,
      };
    }

    // Get image metadata to calculate pixel coordinates
    const metadata = await sharp(imageBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Could not determine image dimensions');
    }

    // Start with the original image
    let image = sharp(imageBuffer);

    // Apply blur to each detected face
    for (const face of faceDetectionResult.faces) {
      // Convert normalized coordinates (0-1) to pixel coordinates
      const x = Math.round(face.boundingBox.x * metadata.width);
      const y = Math.round(face.boundingBox.y * metadata.height);
      const width = Math.round(face.boundingBox.width * metadata.width);
      const height = Math.round(face.boundingBox.height * metadata.height);

      // Calculate blur radius based on intensity (0-100)
      // Map intensity to blur radius: 0 = 0px, 100 = 50px
      const blurRadius = Math.round((blurIntensity / 100) * 50);

      // Create a blurred version of the face region
      const faceRegion = await sharp(imageBuffer)
        .extract({
          left: Math.max(0, x),
          top: Math.max(0, y),
          width: Math.min(width, metadata.width - x),
          height: Math.min(height, metadata.height - y),
        })
        .blur(blurRadius)
        .toBuffer();

      // Composite the blurred face back onto the image
      image = image.composite([
        {
          input: faceRegion,
          left: Math.max(0, x),
          top: Math.max(0, y),
        },
      ]);
    }

    // Convert to desired format
    let blurredBuffer: Buffer;
    if (format === 'png') {
      blurredBuffer = await image.png().toBuffer();
    } else if (format === 'webp') {
      blurredBuffer = await image.webp().toBuffer();
    } else {
      blurredBuffer = await image.jpeg({ quality: 90 }).toBuffer();
    }

    return {
      blurredImageBuffer: blurredBuffer,
      facesBlurred: faceDetectionResult.faceCount,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Blur processing failed: ${errorMessage}`);
  }
}

/**
 * Apply blur to an image URL
 * @param imageUrl - URL of the image to blur
 * @param faceDetectionResult - Face detection results
 * @param options - Blur processing options
 * @returns Blurred image buffer
 */
export async function applyBlurToImageUrl(
  imageUrl: string,
  faceDetectionResult: FaceDetectionResult,
  options: BlurProcessingOptions = {}
): Promise<BlurProcessingResult> {
  try {
    // Fetch the image from URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    return applyBlurToImage(Buffer.from(imageBuffer), faceDetectionResult, options);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to blur image from URL: ${errorMessage}`);
  }
}

/**
 * Calculate blur intensity based on clearance level
 * Higher clearance = less blur needed
 * @param uploaderClearance - Uploader's clearance level (0-3, where 3 is highest)
 * @param viewerClearance - Viewer's clearance level (0-3)
 * @returns Blur intensity (0-100)
 */
export function calculateBlurIntensityByClearance(
  uploaderClearance: number,
  viewerClearance: number
): number {
  // If viewer has same or higher clearance than uploader, no blur needed
  if (viewerClearance >= uploaderClearance) {
    return 0;
  }

  // Calculate blur intensity based on clearance gap
  const clearanceGap = uploaderClearance - viewerClearance;

  // Map clearance gap to blur intensity
  // Gap of 1 = 30% blur, Gap of 2 = 60% blur, Gap of 3 = 100% blur
  return Math.min(100, clearanceGap * 30);
}

/**
 * Determine if blur should be applied based on clearance levels
 * @param uploaderClearance - Uploader's clearance level
 * @param viewerClearance - Viewer's clearance level
 * @returns true if blur should be applied
 */
export function shouldApplyBlurByClearance(
  uploaderClearance: number,
  viewerClearance: number
): boolean {
  return viewerClearance < uploaderClearance;
}

/**
 * Wrapper function for face blurring - delegates to applyBlurToImage
 */
export async function blurFaces(
  imageBuffer: Buffer,
  faceDetectionResult: FaceDetectionResult,
  options?: BlurProcessingOptions
): Promise<BlurProcessingResult> {
  return applyBlurToImage(imageBuffer, faceDetectionResult, options);
}
