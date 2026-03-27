/**
 * Media file validation utilities
 * Handles validation for uploads, file types, sizes, and duration
 */

export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_DURATION = 3600; // 1 hour in seconds

/**
 * Get media type from file type
 */
export function getMediaType(
  mimeType: string
): 'image' | 'video' | null {
  if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
    return 'image';
  }
  if (SUPPORTED_VIDEO_TYPES.includes(mimeType)) {
    return 'video';
  }
  return null;
}

/**
 * Validate media file type
 */
export function validateMediaType(mimeType: string): {
  valid: boolean;
  type?: 'image' | 'video';
  error?: string;
} {
  const type = getMediaType(mimeType);

  if (!type) {
    return {
      valid: false,
      error: `Unsupported file type: ${mimeType}. Supported types: JPEG, PNG, GIF, WebP, SVG, MP4, WebM, OGG, MOV, AVI`,
    };
  }

  return { valid: true, type };
}

/**
 * Validate media file size
 */
export function validateUploadSize(
  fileSize: number,
  maxSize: number = MAX_FILE_SIZE
): {
  valid: boolean;
  error?: string;
} {
  if (fileSize > maxSize) {
    return {
      valid: false,
      error: `File size (${formatBytes(fileSize)}) exceeds maximum limit of ${formatBytes(maxSize)}`,
    };
  }

  if (fileSize <= 0) {
    return {
      valid: false,
      error: 'File size must be greater than 0',
    };
  }

  return { valid: true };
}

/**
 * Validate video duration
 */
export function validateVideoDuration(
  duration: number | undefined,
  maxDuration: number = MAX_VIDEO_DURATION
): {
  valid: boolean;
  error?: string;
} {
  if (duration === undefined || duration === null) {
    // Duration is optional during upload
    return { valid: true };
  }

  if (duration > maxDuration) {
    return {
      valid: false,
      error: `Video duration (${formatDuration(duration)}) exceeds maximum limit of ${formatDuration(maxDuration)}`,
    };
  }

  if (duration <= 0) {
    return {
      valid: false,
      error: 'Video duration must be greater than 0',
    };
  }

  return { valid: true };
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFileName(fileName: string): string {
  // Remove any path separators and special characters
  let sanitized = fileName
    .replace(/[/\\]/g, '') // Remove path separators
    .replace(/[<>:"|?*]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/^\.+/, ''); // Remove leading dots

  // Ensure it's not empty
  if (!sanitized) {
    sanitized = 'file';
  }

  // Truncate if too long (keep extension)
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop() || '';
    const name = sanitized.slice(0, 255 - ext.length - 1);
    sanitized = `${name}.${ext}`;
  }

  return sanitized;
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Comprehensive validation for media file
 */
export function validateMedia(
  file: File
): {
  valid: boolean;
  type?: 'image' | 'video';
  errors: string[];
} {
  const errors: string[] = [];

  // Check file type
  const typeValidation = validateMediaType(file.type);
  if (!typeValidation.valid) {
    errors.push(typeValidation.error!);
  }

  // Check file size
  const sizeValidation = validateUploadSize(file.size);
  if (!sizeValidation.valid) {
    errors.push(sizeValidation.error!);
  }

  return {
    valid: errors.length === 0,
    type: typeValidation.type,
    errors,
  };
}
