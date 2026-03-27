/**
 * Validation utilities for posts
 */

export interface PostValidationError {
  field: string;
  message: string;
}

/**
 * Validate post content
 * - Must be non-empty
 * - Must be less than 5000 characters
 */
export function validateContent(content: string): PostValidationError[] {
  const errors: PostValidationError[] = [];

  if (!content || content.trim().length === 0) {
    errors.push({
      field: 'content',
      message: 'Content cannot be empty',
    });
  }

  if (content.length > 5000) {
    errors.push({
      field: 'content',
      message: `Content must be less than 5000 characters (current: ${content.length})`,
    });
  }

  return errors;
}

/**
 * Validate media file
 * - Must be image or video type
 * - File size must not exceed 10MB
 */
export function validateMedia(
  file: File
): PostValidationError[] {
  const errors: PostValidationError[] = [];

  // Check file type
  const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const validVideoTypes = ['video/mp4', 'video/webm', 'video/mpeg'];
  const allValidTypes = [...validImageTypes, ...validVideoTypes];

  if (!allValidTypes.includes(file.type)) {
    errors.push({
      field: 'media',
      message: `Invalid file type. Supported: ${validImageTypes.concat(validVideoTypes).join(', ')}`,
    });
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    errors.push({
      field: 'media',
      message: `File size exceeds 10MB limit (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`,
    });
  }

  return errors;
}

/**
 * Get media type from file type
 */
export function getMediaType(fileType: string): 'image' | 'video' | null {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const videoTypes = ['video/mp4', 'video/webm', 'video/mpeg'];

  if (imageTypes.includes(fileType)) {
    return 'image';
  }

  if (videoTypes.includes(fileType)) {
    return 'video';
  }

  return null;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
