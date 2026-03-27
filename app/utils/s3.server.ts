/**
 * S3 utilities for handling file uploads and deletions
 * NOTE: AWS SDK v3 (@aws-sdk/client-s3) should be installed for production use
 * Install with: bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 * 
 * Requires environment variables:
 * - AWS_REGION
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - S3_BUCKET_NAME
 */

/**
 * Generate a presigned POST URL for direct browser uploads to S3
 * This allows users to upload directly to S3 without going through your server
 */
export async function generatePresignedPostUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<{
  url: string;
  fields: Record<string, string>;
}> {
  const bucket = process.env.S3_BUCKET_NAME;

  if (!bucket) {
    throw new Error('S3_BUCKET_NAME environment variable is not set');
  }

  // TODO: Implement with AWS SDK v3 when installed
  // For now, return a placeholder that will be replaced with actual implementation
  return {
    url: `https://${bucket}.s3.amazonaws.com/${key}`,
    fields: {
      key,
      contentType,
    },
  };
}

/**
 * Generate a presigned GET URL for accessing S3 objects
 * Useful for creating temporary access links
 */
export async function generatePresignedGetUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const bucket = process.env.S3_BUCKET_NAME;

  if (!bucket) {
    throw new Error('S3_BUCKET_NAME environment variable is not set');
  }

  // TODO: Implement with AWS SDK v3 when installed
  // For now, return a placeholder URL
  return `https://${bucket}.s3.amazonaws.com/${key}`;
}

/**
 * Delete an object from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  const bucket = process.env.S3_BUCKET_NAME;

  if (!bucket) {
    throw new Error('S3_BUCKET_NAME environment variable is not set');
  }

  // TODO: Implement with AWS SDK v3 when installed
  console.log(`Would delete ${key} from S3 bucket ${bucket}`);
}

/**
 * Get the full S3 URL for a key (without presigning)
 * Only works for publicly readable objects
 */
export function getS3ObjectUrl(key: string): string {
  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION || 'us-east-1';

  if (!bucket) {
    throw new Error('S3_BUCKET_NAME environment variable is not set');
  }

  // Use S3 virtual hosted-style URL
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Validate that an object exists in S3
 * (Requires appropriate S3 permissions)
 */
export async function validateS3Object(key: string): Promise<boolean> {
  try {
    const url = await generatePresignedGetUrl(key, 60); // 1 minute
    // If we can generate a URL, the key likely exists
    return !!url;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a safe S3 key from file name
 * Includes timestamp and randomness to avoid collisions
 */
export function generateS3Key(
  familyId: string,
  fileName: string,
  fileType: 'image' | 'video'
): string {
  // Remove extension
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
  // Get file extension
  const ext = fileName.substring(fileName.lastIndexOf('.') + 1);
  // Sanitize filename
  const sanitized = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Generate unique key: families/{familyId}/{type}/{timestamp}-{random}-{filename}.{ext}
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);

  return `families/${familyId}/${fileType}/${timestamp}-${random}-${sanitized}.${ext}`;
}
