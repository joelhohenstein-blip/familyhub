/**
 * Compression System Type Definitions
 * 
 * Defines all types for the image compression architecture,
 * quality profiles, and CLI tool configuration.
 * 
 * @module compression/types
 */

/**
 * Compression profile names
 */
export type CompressionProfileName = 'thumbnail' | 'mobile' | 'desktop' | 'original';

/**
 * Image format types
 */
export type ImageFormat = 'jpeg' | 'webp' | 'png' | 'avif' | 'original';

/**
 * Quality levels (1-6)
 */
export type QualityLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Scaling algorithms
 */
export type ScalingAlgorithm = 'lanczos' | 'cubic' | 'linear' | 'nearest';

/**
 * Metadata handling strategies
 */
export type MetadataStrategy = 'aggressive' | 'balanced' | 'conservative';

/**
 * CLI command types
 */
export type CLICommand = 'compress' | 'batch' | 'profile' | 'analyze' | 'convert' | 'optimize';

/**
 * CLI action types for profile command
 */
export type ProfileAction = 'list' | 'show' | 'create' | 'apply';

/**
 * Export formats for analysis
 */
export type ExportFormat = 'json' | 'csv' | 'html';

/**
 * Compression profile configuration
 */
export interface CompressionProfile {
  /** Profile identifier */
  name: CompressionProfileName;

  /** Human-readable name */
  displayName: string;

  /** Profile description */
  description: string;

  /** Maximum width in pixels (null = unlimited) */
  maxWidth: number | null;

  /** Maximum height in pixels (null = unlimited) */
  maxHeight: number | null;

  /** Primary image format */
  format: ImageFormat;

  /** JPEG quality (0-100) */
  jpegQuality: number;

  /** WebP quality (0-100) */
  webpQuality: number;

  /** PNG compression level (0-9) */
  pngCompression?: number;

  /** AVIF quality (0-100) */
  avifQuality?: number;

  /** Target file size range in bytes */
  targetSize?: {
    min: number;
    max: number;
  };

  /** Strip EXIF data */
  stripExif: boolean;

  /** Strip ICC color profile */
  stripICC: boolean;

  /** Strip XMP metadata */
  stripXMP: boolean;

  /** Preserve image orientation */
  preserveOrientation: boolean;

  /** Preserve color space */
  preserveColorSpace: boolean;

  /** Use progressive JPEG */
  progressive: boolean;

  /** Use interlaced PNG */
  interlace: boolean;

  /** Scaling algorithm */
  scalingAlgorithm: ScalingAlgorithm;

  /** Allow upscaling */
  allowUpscaling: boolean;

  /** Use case description */
  useCase: string;

  /** Recommended quality level */
  recommendedQualityLevel: QualityLevel;
}

/**
 * Quality level preset
 */
export interface QualityPreset {
  /** Quality level (1-6) */
  level: QualityLevel;

  /** Preset name */
  name: string;

  /** JPEG quality */
  jpegQuality: number;

  /** WebP quality */
  webpQuality: number;

  /** Target use case */
  targetUseCase: string;

  /** Estimated file size range */
  estimatedSize: {
    min: number;
    max: number;
  };

  /** Description */
  description: string;
}

/**
 * Compression options
 */
export interface CompressionOptions {
  /** Input file path */
  input: string;

  /** Output file path */
  output?: string;

  /** Compression profile to use */
  profile?: CompressionProfileName;

  /** Quality level (0-100) */
  quality?: number;

  /** Output format */
  format?: ImageFormat;

  /** Target file size (e.g., "150KB") */
  targetSize?: string;

  /** Generate all profiles */
  allProfiles?: boolean;

  /** Output directory for multiple files */
  outputDir?: string;

  /** Strip metadata */
  stripMetadata?: boolean;

  /** Use progressive JPEG */
  progressive?: boolean;

  /** Use interlaced PNG */
  interlace?: boolean;

  /** Verbose output */
  verbose?: boolean;

  /** Dry run (preview without writing) */
  dryRun?: boolean;
}

/**
 * Batch compression options
 */
export interface BatchCompressionOptions {
  /** Input directory */
  inputDir: string;

  /** Output directory */
  outputDir: string;

  /** Compression profile */
  profile?: CompressionProfileName;

  /** File pattern (e.g., "*.jpg") */
  pattern?: string;

  /** Search subdirectories */
  recursive?: boolean;

  /** Number of parallel workers */
  parallel?: number;

  /** Quality level */
  quality?: number;

  /** Output format */
  format?: ImageFormat;

  /** Strip metadata */
  stripMetadata?: boolean;

  /** Show progress bar */
  progress?: boolean;

  /** Dry run */
  dryRun?: boolean;

  /** Verbose output */
  verbose?: boolean;
}

/**
 * Adaptive compression options
 */
export interface AdaptiveCompressionOptions {
  /** Input file path */
  input: string;

  /** Target file size */
  targetSize: string;

  /** Minimum acceptable quality */
  minQuality?: number;

  /** Maximum quality to try */
  maxQuality?: number;

  /** Output file path */
  output?: string;

  /** Search subdirectories */
  recursive?: boolean;

  /** Number of parallel workers */
  parallel?: number;

  /** Verbose output */
  verbose?: boolean;
}

/**
 * Image analysis result
 */
export interface ImageAnalysis {
  /** File path */
  path: string;

  /** File name */
  name: string;

  /** File size in bytes */
  size: number;

  /** Image width in pixels */
  width: number;

  /** Image height in pixels */
  height: number;

  /** Image format */
  format: ImageFormat;

  /** Color space */
  colorSpace?: string;

  /** Has transparency */
  hasAlpha: boolean;

  /** Has EXIF data */
  hasExif: boolean;

  /** Has ICC profile */
  hasICC: boolean;

  /** Recommended profile */
  recommendedProfile: CompressionProfileName;

  /** Estimated compression savings */
  estimatedSavings: {
    thumbnail: number;
    mobile: number;
    desktop: number;
  };

  /** Recommendations */
  recommendations: string[];
}

/**
 * Compression result
 */
export interface CompressionResult {
  /** Input file path */
  input: string;

  /** Output file path */
  output: string;

  /** Original size in bytes */
  originalSize: number;

  /** Compressed size in bytes */
  compressedSize: number;

  /** Compression ratio (0-1) */
  ratio: number;

  /** Compression savings percentage */
  savings: number;

  /** Output format */
  format: ImageFormat;

  /** Quality used */
  quality: number;

  /** Processing time in milliseconds */
  processingTime: number;

  /** Success status */
  success: boolean;

  /** Error message if failed */
  error?: string;
}

/**
 * Batch compression report
 */
export interface BatchCompressionReport {
  /** Total images processed */
  totalImages: number;

  /** Successfully processed */
  successCount: number;

  /** Failed to process */
  failureCount: number;

  /** Total original size */
  totalOriginalSize: number;

  /** Total compressed size */
  totalCompressedSize: number;

  /** Overall compression ratio */
  overallRatio: number;

  /** Overall savings percentage */
  overallSavings: number;

  /** Total processing time in milliseconds */
  totalTime: number;

  /** Average time per image */
  averageTimePerImage: number;

  /** Individual results */
  results: CompressionResult[];

  /** Errors encountered */
  errors: Array<{
    file: string;
    error: string;
  }>;
}

/**
 * Compression configuration
 */
export interface CompressionConfig {
  /** Compression profiles */
  profiles: Record<CompressionProfileName, CompressionProfile>;

  /** Quality presets */
  qualityPresets: Record<QualityLevel, QualityPreset>;

  /** Default options */
  defaults: {
    /** Default profile */
    profile: CompressionProfileName;

    /** Default quality */
    quality: number;

    /** Default format */
    format: ImageFormat;

    /** Strip metadata by default */
    stripMetadata: boolean;

    /** Progressive JPEG by default */
    progressive: boolean;

    /** Interlaced PNG by default */
    interlace: boolean;

    /** Number of parallel workers */
    parallel: number;
  };

  /** Output configuration */
  output: {
    /** Output directory */
    directory: string;

    /** Preserve directory structure */
    preserveStructure: boolean;

    /** Naming pattern */
    namingPattern: string;
  };

  /** Logging configuration */
  logging: {
    /** Log level */
    level: 'debug' | 'info' | 'warn' | 'error';

    /** Log format */
    format: 'json' | 'text';

    /** Log file path */
    file?: string;
  };
}

/**
 * Metadata handling strategy configuration
 */
export interface MetadataStrategyConfig {
  /** Strip EXIF data */
  stripExif: boolean;

  /** Strip ICC color profile */
  stripICC: boolean;

  /** Strip XMP metadata */
  stripXMP: boolean;

  /** Preserve image orientation */
  preserveOrientation: boolean;

  /** Preserve color space */
  preserveColorSpace: boolean;
}

/**
 * Scaling strategy configuration
 */
export interface ScalingStrategyConfig {
  /** Maximum width */
  maxWidth: number | null;

  /** Maximum height */
  maxHeight: number | null;

  /** Preserve aspect ratio */
  preserveAspectRatio: boolean;

  /** Allow upscaling */
  allowUpscaling: boolean;

  /** Scaling algorithm */
  algorithm: ScalingAlgorithm;
}

/**
 * Adaptive compression configuration
 */
export interface AdaptiveCompressionConfig {
  /** Target file size in bytes */
  targetSize: number;

  /** Minimum acceptable quality */
  minQuality: number;

  /** Maximum quality to try */
  maxQuality: number;

  /** Maximum iterations */
  maxIterations: number;

  /** Tolerance percentage */
  tolerance: number;
}

/**
 * Compression metrics
 */
export interface CompressionMetrics {
  /** Total images processed */
  totalImages: number;

  /** Total original size */
  totalOriginalSize: number;

  /** Total compressed size */
  totalCompressedSize: number;

  /** Overall compression ratio */
  overallRatio: number;

  /** Average compression time */
  averageTime: number;

  /** Peak memory usage */
  peakMemory: number;

  /** Compression rate (images/second) */
  compressionRate: number;
}

/**
 * CachedOptimizedImage compression props
 */
export interface CachedOptimizedImageCompressionProps {
  /** Compression profile to use */
  compressionProfile?: CompressionProfileName;

  /** Auto-detect profile based on device */
  autoSelectProfile?: boolean;

  /** Quality level (1-6) */
  qualityLevel?: QualityLevel;

  /** Preferred image formats in order */
  preferredFormats?: ImageFormat[];

  /** Responsive image srcset */
  srcSet?: string;

  /** Responsive image sizes */
  sizes?: string;

  /** Enable caching */
  enableCache?: boolean;

  /** Cache TTL in milliseconds */
  cacheTTL?: number;

  /** Callback when compression completes */
  onCompressionComplete?: (profile: CompressionProfileName, size: number) => void;
}

/**
 * Profile creation options
 */
export interface CreateProfileOptions {
  /** Profile name */
  name: string;

  /** Display name */
  displayName?: string;

  /** Description */
  description?: string;

  /** Maximum width */
  maxWidth?: number;

  /** Maximum height */
  maxHeight?: number;

  /** Quality */
  quality?: number;

  /** Format */
  format?: ImageFormat;

  /** Use case */
  useCase?: string;
}

/**
 * Profile application options
 */
export interface ApplyProfileOptions {
  /** Profile name */
  profile: CompressionProfileName;

  /** Input file */
  input: string;

  /** Output file */
  output?: string;

  /** Verbose output */
  verbose?: boolean;
}

/**
 * Analysis options
 */
export interface AnalysisOptions {
  /** Input file or directory */
  input: string;

  /** Include recommendations */
  recommendations?: boolean;

  /** Search subdirectories */
  recursive?: boolean;

  /** Export format */
  export?: ExportFormat;

  /** Output file path */
  output?: string;

  /** Verbose output */
  verbose?: boolean;
}

/**
 * Conversion options
 */
export interface ConversionOptions {
  /** Input file or directory */
  input: string;

  /** Target format */
  to: ImageFormat;

  /** Output file or directory */
  output?: string;

  /** Quality */
  quality?: number;

  /** Search subdirectories */
  recursive?: boolean;

  /** Number of parallel workers */
  parallel?: number;

  /** Verbose output */
  verbose?: boolean;
}
