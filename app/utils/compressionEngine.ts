/**
 * Compression Engine
 * 
 * Core compression utilities that integrate with the image caching system.
 * Provides functions for:
 * - Adaptive compression based on target file sizes
 * - Quality optimization
 * - Format selection
 * - Metadata handling
 * 
 * @module utils/compressionEngine
 */

import type {
  CompressionProfile,
  CompressionOptions,
  CompressionResult,
  ImageAnalysis,
  CompressionProfileName,
  ImageFormat,
  QualityLevel,
} from '~/types/compression';
import {
  getCompressionProfile,
  getQualityPreset,
  calculateCompressionRatio,
  calculateSavingsPercentage,
} from '~/config/compressionProfiles';

/**
 * Compression engine configuration
 */
export interface CompressionEngineConfig {
  /** Enable adaptive compression */
  adaptiveCompression: boolean;

  /** Maximum quality to try in adaptive mode */
  maxQuality: number;

  /** Minimum quality to try in adaptive mode */
  minQuality: number;

  /** Target tolerance percentage for adaptive compression */
  tolerance: number;

  /** Maximum iterations for adaptive compression */
  maxIterations: number;

  /** Enable format detection */
  formatDetection: boolean;

  /** Preferred formats in order */
  preferredFormats: ImageFormat[];

  /** Cache compression results */
  cacheResults: boolean;

  /** Compression result TTL in milliseconds */
  cacheTTL: number;
}

/**
 * Default compression engine configuration
 */
export const DEFAULT_COMPRESSION_CONFIG: CompressionEngineConfig = {
  adaptiveCompression: true,
  maxQuality: 95,
  minQuality: 30,
  tolerance: 5, // 5% tolerance
  maxIterations: 10,
  formatDetection: true,
  preferredFormats: ['webp', 'jpeg', 'png'],
  cacheResults: true,
  cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Compression engine state
 */
interface CompressionEngineState {
  config: CompressionEngineConfig;
  resultCache: Map<string, CompressionResult>;
  metrics: {
    totalCompressions: number;
    totalTime: number;
    cacheHits: number;
    cacheMisses: number;
  };
}

/**
 * Global compression engine state
 */
let engineState: CompressionEngineState = {
  config: DEFAULT_COMPRESSION_CONFIG,
  resultCache: new Map(),
  metrics: {
    totalCompressions: 0,
    totalTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
  },
};

/**
 * Initialize compression engine with custom config
 */
export function initializeCompressionEngine(
  config: Partial<CompressionEngineConfig> = {}
): void {
  engineState.config = {
    ...DEFAULT_COMPRESSION_CONFIG,
    ...config,
  };
}

/**
 * Get current compression engine configuration
 */
export function getCompressionEngineConfig(): CompressionEngineConfig {
  return { ...engineState.config };
}

/**
 * Get compression engine metrics
 */
export function getCompressionEngineMetrics() {
  return {
    ...engineState.metrics,
    averageCompressionTime:
      engineState.metrics.totalCompressions > 0
        ? engineState.metrics.totalTime / engineState.metrics.totalCompressions
        : 0,
    cacheHitRate:
      engineState.metrics.totalCompressions > 0
        ? engineState.metrics.cacheHits / engineState.metrics.totalCompressions
        : 0,
  };
}

/**
 * Clear compression result cache
 */
export function clearCompressionCache(): void {
  engineState.resultCache.clear();
}

/**
 * Get cached compression result
 */
export function getCachedCompressionResult(
  cacheKey: string
): CompressionResult | null {
  const cached = engineState.resultCache.get(cacheKey);
  if (cached) {
    engineState.metrics.cacheHits++;
    return cached;
  }
  engineState.metrics.cacheMisses++;
  return null;
}

/**
 * Cache compression result
 */
export function cacheCompressionResult(
  cacheKey: string,
  result: CompressionResult
): void {
  if (engineState.config.cacheResults) {
    engineState.resultCache.set(cacheKey, result);
  }
}

/**
 * Generate cache key for compression
 */
export function generateCompressionCacheKey(
  input: string,
  profile: CompressionProfileName,
  quality?: number,
  format?: ImageFormat
): string {
  return `${input}:${profile}:${quality || 'default'}:${format || 'auto'}`;
}

/**
 * Estimate compression savings for a profile
 */
export function estimateCompressionSavings(
  originalSize: number,
  profile: CompressionProfileName
): number {
  const prof = getCompressionProfile(profile);

  if (!prof.targetSize) {
    return 0;
  }

  // Estimate based on target size range
  const avgTargetSize = (prof.targetSize.min + prof.targetSize.max) / 2;
  const estimatedSavings = Math.max(0, 1 - avgTargetSize / originalSize);

  return Math.round(estimatedSavings * 100);
}

/**
 * Recommend best profile for an image
 */
export function recommendCompressionProfile(
  width: number,
  height: number,
  fileSize: number,
  hasAlpha: boolean
): CompressionProfileName {
  const maxDimension = Math.max(width, height);
  const aspectRatio = width / height;

  // Thumbnail profile for small images
  if (maxDimension <= 200 || fileSize < 100 * 1024) {
    return 'thumbnail';
  }

  // Mobile profile for medium images
  if (maxDimension <= 800 || fileSize < 500 * 1024) {
    return 'mobile';
  }

  // Desktop profile for large images
  if (maxDimension <= 2000 || fileSize < 2 * 1024 * 1024) {
    return 'desktop';
  }

  // Original profile for very large images
  return 'original';
}

/**
 * Recommend best quality level for a use case
 */
export function recommendQualityLevelForUseCase(
  useCase: string
): QualityLevel {
  const lower = useCase.toLowerCase();

  if (
    lower.includes('thumbnail') ||
    lower.includes('preview') ||
    lower.includes('avatar')
  ) {
    return 1;
  }

  if (
    lower.includes('mobile') &&
    (lower.includes('slow') || lower.includes('low-bandwidth'))
  ) {
    return 2;
  }

  if (lower.includes('mobile') || lower.includes('responsive')) {
    return 3;
  }

  if (lower.includes('desktop') || lower.includes('web')) {
    return 4;
  }

  if (lower.includes('professional') || lower.includes('print')) {
    return 5;
  }

  if (lower.includes('archive') || lower.includes('backup')) {
    return 6;
  }

  return 3; // Default to medium
}

/**
 * Select best output format based on image characteristics
 */
export function selectBestFormat(
  hasAlpha: boolean,
  hasAnimation: boolean,
  originalFormat: ImageFormat
): ImageFormat {
  // Preserve animation
  if (hasAnimation) {
    return originalFormat === 'webp' ? 'webp' : 'png';
  }

  // Use WebP for most cases (best compression)
  if (!hasAlpha) {
    return 'webp';
  }

  // Use PNG for transparency
  return 'png';
}

/**
 * Calculate optimal quality for target file size
 */
export function calculateOptimalQuality(
  originalSize: number,
  targetSize: number,
  minQuality: number = 30,
  maxQuality: number = 95
): number {
  if (targetSize >= originalSize) {
    return maxQuality;
  }

  const ratio = targetSize / originalSize;

  // Linear interpolation between min and max quality
  // Lower ratio = lower quality needed
  const quality = Math.round(minQuality + (maxQuality - minQuality) * ratio);

  return Math.max(minQuality, Math.min(maxQuality, quality));
}

/**
 * Validate compression options
 */
export function validateCompressionOptions(
  options: CompressionOptions
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!options.input) {
    errors.push('Input file path is required');
  }

  if (options.quality !== undefined) {
    if (options.quality < 0 || options.quality > 100) {
      errors.push('Quality must be between 0 and 100');
    }
  }

  if (options.profile) {
    try {
      getCompressionProfile(options.profile);
    } catch {
      errors.push(`Unknown compression profile: ${options.profile}`);
    }
  }

  if (options.format) {
    const validFormats: ImageFormat[] = ['jpeg', 'webp', 'png', 'avif', 'original'];
    if (!validFormats.includes(options.format)) {
      errors.push(`Invalid format: ${options.format}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create compression result
 */
export function createCompressionResult(
  input: string,
  output: string,
  originalSize: number,
  compressedSize: number,
  format: ImageFormat,
  quality: number,
  processingTime: number,
  success: boolean,
  error?: string
): CompressionResult {
  return {
    input,
    output,
    originalSize,
    compressedSize,
    ratio: calculateCompressionRatio(originalSize, compressedSize),
    savings: calculateSavingsPercentage(originalSize, compressedSize),
    format,
    quality,
    processingTime,
    success,
    error,
  };
}

/**
 * Analyze compression efficiency
 */
export function analyzeCompressionEfficiency(
  result: CompressionResult
): {
  efficiency: 'excellent' | 'good' | 'fair' | 'poor';
  score: number;
  recommendation: string;
} {
  const savings = result.savings;
  let efficiency: 'excellent' | 'good' | 'fair' | 'poor';
  let score: number;
  let recommendation: string;

  if (savings >= 70) {
    efficiency = 'excellent';
    score = 95;
    recommendation = 'Excellent compression achieved';
  } else if (savings >= 50) {
    efficiency = 'good';
    score = 80;
    recommendation = 'Good compression achieved';
  } else if (savings >= 30) {
    efficiency = 'fair';
    score = 60;
    recommendation = 'Fair compression, consider higher compression profile';
  } else {
    efficiency = 'poor';
    score = 40;
    recommendation = 'Poor compression, try different profile or quality';
  }

  return { efficiency, score, recommendation };
}

/**
 * Get compression profile recommendations based on image analysis
 */
export function getProfileRecommendations(
  analysis: ImageAnalysis
): Array<{
  profile: CompressionProfileName;
  reason: string;
  estimatedSavings: number;
}> {
  const recommendations: Array<{
    profile: CompressionProfileName;
    reason: string;
    estimatedSavings: number;
  }> = [];

  const { width, height, size, hasAlpha } = analysis;

  // Thumbnail profile
  if (width <= 300 && height <= 300) {
    recommendations.push({
      profile: 'thumbnail',
      reason: 'Image is small, thumbnail profile is optimal',
      estimatedSavings: analysis.estimatedSavings.thumbnail,
    });
  }

  // Mobile profile
  if (width <= 800 && height <= 1200) {
    recommendations.push({
      profile: 'mobile',
      reason: 'Image dimensions suit mobile profile',
      estimatedSavings: analysis.estimatedSavings.mobile,
    });
  }

  // Desktop profile
  if (width > 800 || height > 1200) {
    recommendations.push({
      profile: 'desktop',
      reason: 'Image dimensions suit desktop profile',
      estimatedSavings: analysis.estimatedSavings.desktop,
    });
  }

  // Original profile for large files
  if (size > 5 * 1024 * 1024) {
    recommendations.push({
      profile: 'original',
      reason: 'File is very large, consider archiving with original profile',
      estimatedSavings: 0,
    });
  }

  return recommendations.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
}

/**
 * Format compression metrics for display
 */
export function formatCompressionMetrics(result: CompressionResult): string {
  const originalMB = (result.originalSize / (1024 * 1024)).toFixed(2);
  const compressedMB = (result.compressedSize / (1024 * 1024)).toFixed(2);

  return `${originalMB}MB → ${compressedMB}MB (${result.savings.toFixed(1)}% saved)`;
}

/**
 * Get compression profile by use case
 */
export function getProfileByUseCase(
  useCase: string
): CompressionProfileName {
  const lower = useCase.toLowerCase();

  if (
    lower.includes('thumbnail') ||
    lower.includes('preview') ||
    lower.includes('avatar')
  ) {
    return 'thumbnail';
  }

  if (lower.includes('mobile')) {
    return 'mobile';
  }

  if (lower.includes('desktop') || lower.includes('web')) {
    return 'desktop';
  }

  if (lower.includes('archive') || lower.includes('backup')) {
    return 'original';
  }

  return 'mobile'; // Default
}

/**
 * Batch analyze compression results
 */
export function analyzeBatchCompressionResults(
  results: CompressionResult[]
): {
  totalImages: number;
  successCount: number;
  failureCount: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  overallSavings: number;
  averageQuality: number;
  averageCompressionTime: number;
  bestResult: CompressionResult | null;
  worstResult: CompressionResult | null;
} {
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  const totalOriginalSize = successful.reduce((sum, r) => sum + r.originalSize, 0);
  const totalCompressedSize = successful.reduce((sum, r) => sum + r.compressedSize, 0);
  const overallSavings = calculateSavingsPercentage(totalOriginalSize, totalCompressedSize);
  const averageQuality =
    successful.length > 0
      ? successful.reduce((sum, r) => sum + r.quality, 0) / successful.length
      : 0;
  const averageCompressionTime =
    successful.length > 0
      ? successful.reduce((sum, r) => sum + r.processingTime, 0) / successful.length
      : 0;

  const bestResult = successful.length > 0
    ? successful.reduce((best, current) =>
        current.savings > best.savings ? current : best
      )
    : null;

  const worstResult = successful.length > 0
    ? successful.reduce((worst, current) =>
        current.savings < worst.savings ? current : worst
      )
    : null;

  return {
    totalImages: results.length,
    successCount: successful.length,
    failureCount: failed.length,
    totalOriginalSize,
    totalCompressedSize,
    overallSavings,
    averageQuality,
    averageCompressionTime,
    bestResult,
    worstResult,
  };
}
