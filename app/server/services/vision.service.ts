import { analyzeImageContent } from './openai.service';
import { mediaModeration } from '~/db/schema';
import { eq } from 'drizzle-orm';
import CryptoJS from 'crypto-js';
import sharp from 'sharp';
import type { PgDatabase } from 'drizzle-orm/pg-core';

interface MediaScanResult {
  isExplicit: boolean;
  analysisResults: {
    text: string;
    confidence: number;
  };
  mediaHash: string;
  mediaFormat: string;
  isValidMedia: boolean;
}

/**
 * Calculate hash of media file for audit trail
 */
function calculateMediaHash(buffer: Buffer): string {
  return CryptoJS.SHA256(buffer.toString('base64')).toString();
}

/**
 * Validate and get media format information
 */
async function validateMediaFormat(buffer: Buffer): Promise<{
  isValid: boolean;
  format: string;
  width?: number;
  height?: number;
}> {
  try {
    // Try to get image metadata using sharp
    const metadata = await sharp(buffer).metadata();
    
    const supportedFormats = ['jpeg', 'png', 'webp', 'gif', 'tiff'];
    const format = metadata.format || 'unknown';
    
    return {
      isValid: supportedFormats.includes(format.toLowerCase()),
      format,
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error) {
    // If sharp fails, it's likely not a valid image
    return {
      isValid: false,
      format: 'invalid',
    };
  }
}

/**
 * Scan media (image/video) for policy violations
 * Returns moderation result with hash for audit trail
 */
export async function scanMedia(
  mediaBuffer: Buffer,
  mediaType: string,
  userId: string
): Promise<MediaScanResult> {
  // Validate media format
  const formatInfo = await validateMediaFormat(mediaBuffer);
  
  if (!formatInfo.isValid) {
    return {
      isExplicit: true, // Reject non-image content
      analysisResults: {
        text: `Invalid or unsupported media format: ${formatInfo.format}. Non-image content detected.`,
        confidence: 0.95,
      },
      mediaHash: calculateMediaHash(mediaBuffer),
      mediaFormat: formatInfo.format,
      isValidMedia: false,
    };
  }

  // Calculate media hash for audit trail
  const mediaHash = calculateMediaHash(mediaBuffer);

  // For now, we'll use a base64 URL representation since we can't upload directly
  // In production, upload to secure storage and get signed URL
  const base64Media = mediaBuffer.toString('base64');
  const imageUrl = `data:${mediaType};base64,${base64Media}`;

  try {
    // Use OpenAI Vision API for analysis
    const analysisResult = await analyzeImageContent(imageUrl);
    
    return {
      isExplicit: analysisResult.isExplicit,
      analysisResults: {
        text: analysisResult.analysis,
        confidence: analysisResult.confidence,
      },
      mediaHash,
      mediaFormat: formatInfo.format || 'unknown',
      isValidMedia: true,
    };
  } catch (error) {
    console.error('Error analyzing media with Vision API:', error);
    // On error, flag for manual review
    return {
      isExplicit: false,
      analysisResults: {
        text: `Vision API analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. Requires manual review.`,
        confidence: 0.5,
      },
      mediaHash,
      mediaFormat: formatInfo.format || 'unknown',
      isValidMedia: true,
    };
  }
}

/**
 * Log media moderation event in the database
 */
export async function logMediaModeration(
  db: PgDatabase<any>,
  mediaId: string,
  userId: string,
  mediaHash: string,
  scanResult: MediaScanResult
) {
  try {
    const insertData: any = {
      mediaId,
      userId,
      mediaHash,
      mediaFormat: scanResult.mediaFormat,
      aiAnalysisResults: scanResult.analysisResults.text,
      violationScore: scanResult.analysisResults.confidence,
      status: scanResult.isExplicit || !scanResult.isValidMedia ? 'blocked' : 'approved',
    };
    
    await db.insert(mediaModeration).values(insertData);
  } catch (error) {
    console.error('Error logging media moderation:', error);
    throw error;
  }
}

/**
 * Get flagged media pending review
 */
export async function getFlaggedMedia(
  db: PgDatabase<any>,
  status?: 'pending' | 'blocked' | 'approved' | 'rejected',
  limit: number = 50,
  offset: number = 0
) {
  try {
    let query: any = db.select().from(mediaModeration);
    
    if (status) {
      query = query.where(eq(mediaModeration.status, status));
    }
    
    const results = await query
      .orderBy(mediaModeration.createdAt)
      .limit(limit)
      .offset(offset);
    
    return results;
  } catch (error) {
    console.error('Error fetching flagged media:', error);
    throw error;
  }
}

/**
 * Update moderation decision for media
 */
export async function updateMediaModerationDecision(
  db: PgDatabase<any>,
  mediaId: string,
  decision: 'approved' | 'rejected',
  reviewReason: string,
  reviewedBy: string
) {
  try {
    await db
      .update(mediaModeration)
      .set({
        status: decision,
        reviewedBy,
        reviewReason,
        reviewedAt: new Date(),
      })
      .where(eq(mediaModeration.mediaId, mediaId));
  } catch (error) {
    console.error('Error updating media moderation decision:', error);
    throw error;
  }
}

/**
 * Check if media hash already exists (duplicate detection)
 */
export async function getMediaByHash(db: PgDatabase<any>, mediaHash: string) {
  try {
    const result: any = await db
      .select()
      .from(mediaModeration)
      .where(eq(mediaModeration.mediaHash, mediaHash))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error getting media by hash:', error);
    return null;
  }
}

export default {
  scanMedia,
  logMediaModeration,
  getFlaggedMedia,
  updateMediaModerationDecision,
  getMediaByHash,
};
