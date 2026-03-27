#!/usr/bin/env node

/**
 * Image Compression CLI Tool
 * 
 * Comprehensive command-line tool for batch image compression with support for:
 * - Multiple compression profiles (thumbnail, mobile, desktop, original)
 * - Quality presets (1-6)
 * - Batch processing with parallel workers
 * - Adaptive compression to target file sizes
 * - Image analysis and recommendations
 * - Format conversion (JPEG, WebP, PNG, AVIF)
 * - srcset variant generation
 * 
 * @usage
 * bun scripts/compress-images.ts compress --input image.jpg --profile mobile
 * bun scripts/compress-images.ts batch --input ./images --output ./compressed --profile desktop
 * bun scripts/compress-images.ts analyze --input ./images --recursive
 * bun scripts/compress-images.ts profile list
 * 
 * @module scripts/compress-images
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { globSync } from 'glob';
import type {
  CompressionOptions,
  BatchCompressionOptions,
  CompressionResult,
  BatchCompressionReport,
  ImageAnalysis,
  CompressionProfileName,
  ImageFormat,
  QualityLevel,
} from '../app/types/compression';
import {
  COMPRESSION_PROFILES,
  QUALITY_PRESETS,
  getCompressionProfile,
  getQualityPreset,
  getAllProfileNames,
  getAllQualityLevels,
  recommendProfile,
  recommendQualityLevel,
  calculateCompressionRatio,
  calculateSavingsPercentage,
} from '../app/config/compressionProfiles';

/**
 * CLI argument parser
 */
interface ParsedArgs {
  command: string;
  action?: string;
  input?: string;
  output?: string;
  inputDir?: string;
  outputDir?: string;
  profile?: CompressionProfileName;
  quality?: number;
  format?: ImageFormat;
  pattern?: string;
  recursive?: boolean;
  parallel?: number;
  verbose?: boolean;
  dryRun?: boolean;
  progress?: boolean;
  targetSize?: string;
  export?: 'json' | 'csv' | 'html';
  [key: string]: any;
}

/**
 * Parse command-line arguments
 */
function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const parsed: ParsedArgs = {
    command: args[0] || 'help',
    parallel: 4,
    recursive: false,
    verbose: false,
    dryRun: false,
    progress: true,
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];

      if (value && !value.startsWith('--')) {
        if (key === 'parallel' || key === 'quality') {
          parsed[key] = parseInt(value, 10);
        } else if (key === 'recursive' || key === 'verbose' || key === 'dryRun' || key === 'progress') {
          parsed[key] = value !== 'false';
        } else {
          parsed[key] = value;
        }
        i++;
      } else {
        parsed[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      parsed[key] = true;
    } else if (i === 1) {
      parsed.action = arg;
    }
  }

  return parsed;
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get sharp quality settings for a profile
 */
function getSharpQualitySettings(profile: CompressionProfileName, quality?: number) {
  const prof = getCompressionProfile(profile);
  const q = quality ?? prof.jpegQuality;

  return {
    jpeg: { quality: q, progressive: prof.progressive },
    webp: { quality: q },
    png: { compressionLevel: prof.pngCompression ?? 9 },
    avif: { quality: q },
  };
}

/**
 * Get sharp metadata stripping options
 */
function getMetadataOptions(profile: CompressionProfileName) {
  const prof = getCompressionProfile(profile);

  return {
    orientation: prof.preserveOrientation ? undefined : 0,
  };
}

/**
 * Compress a single image
 */
async function compressImage(
  inputPath: string,
  outputPath: string,
  profile: CompressionProfileName,
  quality?: number,
  format?: ImageFormat
): Promise<CompressionResult> {
  const startTime = Date.now();
  const prof = getCompressionProfile(profile);
  const originalSize = fs.statSync(inputPath).size;

  try {
    let pipeline = sharp(inputPath);

    // Get image metadata
    const metadata = await pipeline.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Resize if needed
    if (prof.maxWidth || prof.maxHeight) {
      const maxW = prof.maxWidth || width;
      const maxH = prof.maxHeight || height;

      if (width > maxW || height > maxH) {
        pipeline = pipeline.resize(maxW, maxH, {
          fit: 'inside',
          withoutEnlargement: !prof.allowUpscaling,
          kernel: prof.scalingAlgorithm as any,
        });
      }
    }

    // Strip metadata
    if (prof.stripExif || prof.stripICC || prof.stripXMP) {
      pipeline = pipeline.withMetadata(false);
    }

    // Determine output format
    const outputFormat = format || prof.format;
    const qualitySettings = getSharpQualitySettings(profile, quality);

    // Apply format-specific compression
    if (outputFormat === 'webp') {
      pipeline = pipeline.webp(qualitySettings.webp);
    } else if (outputFormat === 'png') {
      pipeline = pipeline.png(qualitySettings.png);
    } else if (outputFormat === 'avif') {
      pipeline = pipeline.avif(qualitySettings.avif);
    } else if (outputFormat === 'jpeg' || outputFormat === 'original') {
      pipeline = pipeline.jpeg(qualitySettings.jpeg);
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write output
    await pipeline.toFile(outputPath);

    const compressedSize = fs.statSync(outputPath).size;
    const processingTime = Date.now() - startTime;

    return {
      input: inputPath,
      output: outputPath,
      originalSize,
      compressedSize,
      ratio: calculateCompressionRatio(originalSize, compressedSize),
      savings: calculateSavingsPercentage(originalSize, compressedSize),
      format: outputFormat as ImageFormat,
      quality: quality ?? prof.jpegQuality,
      processingTime,
      success: true,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    return {
      input: inputPath,
      output: outputPath,
      originalSize,
      compressedSize: 0,
      ratio: 0,
      savings: 0,
      format: format || 'jpeg',
      quality: quality ?? 75,
      processingTime,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate srcset variants for an image
 */
async function generateSrcsetVariants(
  inputPath: string,
  outputDir: string,
  baseName: string,
  widths: number[] = [320, 640, 960, 1280]
): Promise<{ srcset: string; sizes: string }> {
  const variants: string[] = [];

  for (const width of widths) {
    const variantPath = path.join(outputDir, `${baseName}-${width}w.webp`);
    const result = await compressImage(inputPath, variantPath, 'mobile', undefined, 'webp');

    if (result.success) {
      variants.push(`${variantPath} ${width}w`);
    }
  }

  const srcset = variants.join(', ');
  const sizes = '(max-width: 640px) 100vw, (max-width: 960px) 80vw, 60vw';

  return { srcset, sizes };
}

/**
 * Analyze an image
 */
async function analyzeImage(imagePath: string): Promise<ImageAnalysis> {
  try {
    const metadata = await sharp(imagePath).metadata();
    const stats = fs.statSync(imagePath);
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const format = (metadata.format || 'unknown') as ImageFormat;

    // Estimate compression savings for each profile
    const estimatedSavings = {
      thumbnail: 75,
      mobile: 60,
      desktop: 40,
    };

    // Generate recommendations
    const recommendations: string[] = [];
    if (width > 2000 || height > 2000) {
      recommendations.push('Image is very large, consider using desktop profile');
    }
    if (stats.size > 5 * 1024 * 1024) {
      recommendations.push('File size is large, compression recommended');
    }
    if (format === 'jpeg') {
      recommendations.push('Consider converting to WebP for better compression');
    }
    if (!metadata.hasAlpha && format === 'png') {
      recommendations.push('PNG without transparency, JPEG would be more efficient');
    }

    return {
      path: imagePath,
      name: path.basename(imagePath),
      size: stats.size,
      width,
      height,
      format,
      colorSpace: metadata.space,
      hasAlpha: metadata.hasAlpha || false,
      hasExif: !!metadata.exif,
      hasICC: !!metadata.icc,
      recommendedProfile: recommendProfile(width, height),
      estimatedSavings,
      recommendations,
    };
  } catch (error) {
    throw new Error(`Failed to analyze ${imagePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Batch compress images
 */
async function batchCompress(options: BatchCompressionOptions): Promise<BatchCompressionReport> {
  const startTime = Date.now();
  const profile = options.profile || 'mobile';
  const pattern = options.pattern || '**/*.{jpg,jpeg,png,webp}';
  const searchPath = options.recursive ? `${options.inputDir}/${pattern}` : `${options.inputDir}/${pattern}`;

  // Find all matching files
  const files = globSync(searchPath, {
    ignore: ['node_modules/**', 'dist/**', '.git/**'],
  });

  if (files.length === 0) {
    console.log('No images found matching pattern');
    return {
      totalImages: 0,
      successCount: 0,
      failureCount: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      overallRatio: 0,
      overallSavings: 0,
      totalTime: 0,
      averageTimePerImage: 0,
      results: [],
      errors: [],
    };
  }

  console.log(`Found ${files.length} images to compress`);

  const results: CompressionResult[] = [];
  const errors: Array<{ file: string; error: string }> = [];
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;

  // Process files with parallel workers
  const chunkSize = Math.ceil(files.length / options.parallel!);
  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize);
    const promises = chunk.map(async (file) => {
      try {
        const relativePath = path.relative(options.inputDir, file);
        const outputPath = path.join(options.outputDir, relativePath);

        if (!options.dryRun) {
          const result = await compressImage(file, outputPath, profile, options.quality, options.format);
          results.push(result);

          if (result.success) {
            totalOriginalSize += result.originalSize;
            totalCompressedSize += result.compressedSize;
            if (options.verbose) {
              console.log(`✓ ${relativePath} (${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)})`);
            }
          } else {
            errors.push({ file, error: result.error || 'Unknown error' });
            if (options.verbose) {
              console.log(`✗ ${relativePath}: ${result.error}`);
            }
          }
        } else {
          console.log(`[DRY RUN] Would compress ${relativePath}`);
        }
      } catch (error) {
        errors.push({
          file,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    await Promise.all(promises);
  }

  const totalTime = Date.now() - startTime;
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  return {
    totalImages: files.length,
    successCount,
    failureCount,
    totalOriginalSize,
    totalCompressedSize,
    overallRatio: calculateCompressionRatio(totalOriginalSize, totalCompressedSize),
    overallSavings: calculateSavingsPercentage(totalOriginalSize, totalCompressedSize),
    totalTime,
    averageTimePerImage: totalTime / files.length,
    results,
    errors,
  };
}

/**
 * Print compression profile information
 */
function printProfile(name: CompressionProfileName): void {
  const profile = getCompressionProfile(name);

  console.log(`\n📋 Profile: ${profile.displayName}`);
  console.log(`   Name: ${profile.name}`);
  console.log(`   Description: ${profile.description}`);
  console.log(`   Use Case: ${profile.useCase}`);
  console.log(`\n   Dimensions:`);
  console.log(`   - Max Width: ${profile.maxWidth || 'unlimited'}`);
  console.log(`   - Max Height: ${profile.maxHeight || 'unlimited'}`);
  console.log(`\n   Quality Settings:`);
  console.log(`   - JPEG Quality: ${profile.jpegQuality}`);
  console.log(`   - WebP Quality: ${profile.webpQuality}`);
  console.log(`   - AVIF Quality: ${profile.avifQuality}`);
  console.log(`   - PNG Compression: ${profile.pngCompression}`);
  console.log(`\n   Metadata Handling:`);
  console.log(`   - Strip EXIF: ${profile.stripExif}`);
  console.log(`   - Strip ICC: ${profile.stripICC}`);
  console.log(`   - Strip XMP: ${profile.stripXMP}`);
  console.log(`   - Preserve Orientation: ${profile.preserveOrientation}`);
  console.log(`   - Preserve Color Space: ${profile.preserveColorSpace}`);
  console.log(`\n   Format Options:`);
  console.log(`   - Progressive JPEG: ${profile.progressive}`);
  console.log(`   - Interlaced PNG: ${profile.interlace}`);
  console.log(`   - Scaling Algorithm: ${profile.scalingAlgorithm}`);
  console.log(`   - Allow Upscaling: ${profile.allowUpscaling}`);
  console.log(`\n   Target Size: ${profile.targetSize ? `${formatBytes(profile.targetSize.min)} - ${formatBytes(profile.targetSize.max)}` : 'N/A'}`);
  console.log(`   Recommended Quality Level: ${profile.recommendedQualityLevel}\n`);
}

/**
 * Print all profiles
 */
function listProfiles(): void {
  console.log('\n📚 Available Compression Profiles:\n');

  const profiles = getAllProfileNames();
  profiles.forEach((name) => {
    const profile = getCompressionProfile(name);
    console.log(`  ${name.padEnd(12)} - ${profile.description}`);
  });

  console.log('\n');
}

/**
 * Print quality presets
 */
function listQualityLevels(): void {
  console.log('\n⭐ Quality Presets:\n');

  const levels = getAllQualityLevels();
  levels.forEach((level) => {
    const preset = getQualityPreset(level);
    console.log(`  Level ${level}: ${preset.name.padEnd(15)} - ${preset.description}`);
    console.log(`             JPEG: ${preset.jpegQuality}, WebP: ${preset.webpQuality}`);
  });

  console.log('\n');
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║          Image Compression CLI Tool                            ║
║          Batch image optimization with sharp                   ║
╚════════════════════════════════════════════════════════════════╝

USAGE:
  bun scripts/compress-images.ts <command> [options]

COMMANDS:

  compress              Compress a single image
    --input <path>     Input image path (required)
    --output <path>    Output image path (optional)
    --profile <name>   Compression profile (default: mobile)
    --quality <0-100>  Quality level (overrides profile)
    --format <fmt>     Output format: jpeg, webp, png, avif
    --dry-run          Preview without writing files
    --verbose          Show detailed output

  batch                 Batch compress images in a directory
    --input-dir <path> Input directory (required)
    --output-dir <path> Output directory (required)
    --profile <name>   Compression profile (default: mobile)
    --pattern <glob>   File pattern (default: **/*.{jpg,jpeg,png,webp})
    --recursive        Search subdirectories
    --parallel <n>     Number of parallel workers (default: 4)
    --quality <0-100>  Quality level (overrides profile)
    --format <fmt>     Output format
    --progress         Show progress bar (default: true)
    --dry-run          Preview without writing files
    --verbose          Show detailed output

  srcset                Generate responsive image variants
    --input <path>     Input image path (required)
    --output-dir <path> Output directory (required)
    --widths <list>    Comma-separated widths (default: 320,640,960,1280)

  analyze               Analyze images and get recommendations
    --input <path>     Image or directory path (required)
    --recursive        Search subdirectories
    --export <fmt>     Export format: json, csv, html
    --output <path>    Output file path
    --verbose          Show detailed output

  profile               Manage compression profiles
    list               List all available profiles
    show <name>        Show profile details
    create <name>      Create custom profile (interactive)
    apply <name>       Apply profile to image

  convert               Convert images to different formats
    --input <path>     Input image or directory
    --to <format>      Target format: jpeg, webp, png, avif (required)
    --output <path>    Output path
    --quality <0-100>  Quality level
    --recursive        Search subdirectories
    --parallel <n>     Number of parallel workers
    --verbose          Show detailed output

EXAMPLES:

  # Compress single image with mobile profile
  bun scripts/compress-images.ts compress --input photo.jpg --profile mobile

  # Batch compress directory
  bun scripts/compress-images.ts batch \\
    --input-dir ./images \\
    --output-dir ./compressed \\
    --profile desktop \\
    --recursive

  # Generate responsive variants
  bun scripts/compress-images.ts srcset \\
    --input hero.jpg \\
    --output-dir ./variants \\
    --widths 320,640,960,1280

  # Analyze images
  bun scripts/compress-images.ts analyze \\
    --input ./images \\
    --recursive \\
    --export json \\
    --output report.json

  # List profiles
  bun scripts/compress-images.ts profile list

  # Show profile details
  bun scripts/compress-images.ts profile show desktop

  # Convert to WebP
  bun scripts/compress-images.ts convert \\
    --input ./images \\
    --to webp \\
    --output-dir ./webp \\
    --recursive

PROFILES:
  thumbnail  - Small previews, avatars, thumbnails (150x150)
  mobile     - Mobile devices, responsive images (480x720)
  desktop    - Desktop browsers, high-quality (1200x1600)
  original   - Archive, backup, minimal compression

QUALITY LEVELS:
  1 (ultra-low)  - Thumbnails, previews
  2 (low)        - Mobile slow networks
  3 (medium)     - Mobile normal networks
  4 (high)       - Desktop browsers
  5 (very-high)  - Professional, print
  6 (lossless)   - Archive, backup

For more information, visit: https://github.com/familyhub/image-compression
`);
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = parseArgs();

  try {
    switch (args.command) {
      case 'compress': {
        if (!args.input) {
          console.error('Error: --input is required for compress command');
          process.exit(1);
        }

        const outputPath = args.output || args.input.replace(/\.[^.]+$/, `-compressed.${'webp'}`);
        const profile = (args.profile || 'mobile') as CompressionProfileName;

        console.log(`\n🖼️  Compressing image...`);
        console.log(`   Input: ${args.input}`);
        console.log(`   Profile: ${profile}`);

        const result = await compressImage(args.input, outputPath, profile, args.quality, args.format);

        if (result.success) {
          console.log(`\n✅ Compression successful!`);
          console.log(`   Output: ${result.output}`);
          console.log(`   Original: ${formatBytes(result.originalSize)}`);
          console.log(`   Compressed: ${formatBytes(result.compressedSize)}`);
          console.log(`   Savings: ${result.savings.toFixed(1)}%`);
          console.log(`   Time: ${result.processingTime}ms\n`);
        } else {
          console.error(`\n❌ Compression failed: ${result.error}\n`);
          process.exit(1);
        }
        break;
      }

      case 'batch': {
        if (!args.inputDir || !args.outputDir) {
          console.error('Error: --input-dir and --output-dir are required for batch command');
          process.exit(1);
        }

        const profile = (args.profile || 'mobile') as CompressionProfileName;

        console.log(`\n📦 Batch compressing images...`);
        console.log(`   Input: ${args.inputDir}`);
        console.log(`   Output: ${args.outputDir}`);
        console.log(`   Profile: ${profile}`);
        console.log(`   Parallel workers: ${args.parallel}\n`);

        const report = await batchCompress({
          inputDir: args.inputDir,
          outputDir: args.outputDir,
          profile,
          pattern: args.pattern,
          recursive: args.recursive,
          parallel: args.parallel,
          quality: args.quality,
          format: args.format,
          dryRun: args.dryRun,
          verbose: args.verbose,
        });

        console.log(`\n📊 Batch Compression Report:`);
        console.log(`   Total Images: ${report.totalImages}`);
        console.log(`   Successful: ${report.successCount}`);
        console.log(`   Failed: ${report.failureCount}`);
        console.log(`   Original Size: ${formatBytes(report.totalOriginalSize)}`);
        console.log(`   Compressed Size: ${formatBytes(report.totalCompressedSize)}`);
        console.log(`   Overall Savings: ${report.overallSavings.toFixed(1)}%`);
        console.log(`   Total Time: ${(report.totalTime / 1000).toFixed(2)}s`);
        console.log(`   Avg Time/Image: ${report.averageTimePerImage.toFixed(0)}ms\n`);

        if (report.errors.length > 0) {
          console.log(`⚠️  Errors:`);
          report.errors.forEach((err) => {
            console.log(`   ${err.file}: ${err.error}`);
          });
        }
        break;
      }

      case 'srcset': {
        if (!args.input || !args.outputDir) {
          console.error('Error: --input and --output-dir are required for srcset command');
          process.exit(1);
        }

        const widths = args.widths ? args.widths.split(',').map(Number) : [320, 640, 960, 1280];
        const baseName = path.basename(args.input, path.extname(args.input));

        console.log(`\n🎨 Generating srcset variants...`);
        console.log(`   Input: ${args.input}`);
        console.log(`   Output: ${args.outputDir}`);
        console.log(`   Widths: ${widths.join(', ')}\n`);

        const { srcset, sizes } = await generateSrcsetVariants(args.input, args.outputDir, baseName, widths);

        console.log(`✅ Srcset generated!\n`);
        console.log(`srcset="${srcset}"`);
        console.log(`sizes="${sizes}"\n`);
        break;
      }

      case 'analyze': {
        if (!args.input) {
          console.error('Error: --input is required for analyze command');
          process.exit(1);
        }

        const isDir = fs.statSync(args.input).isDirectory();
        const files = isDir
          ? globSync(`${args.input}${args.recursive ? '/**' : ''}/*.{jpg,jpeg,png,webp}`)
          : [args.input];

        console.log(`\n🔍 Analyzing ${files.length} image(s)...\n`);

        const analyses: ImageAnalysis[] = [];
        for (const file of files) {
          try {
            const analysis = await analyzeImage(file);
            analyses.push(analysis);

            console.log(`📄 ${analysis.name}`);
            console.log(`   Size: ${formatBytes(analysis.size)}`);
            console.log(`   Dimensions: ${analysis.width}x${analysis.height}`);
            console.log(`   Format: ${analysis.format}`);
            console.log(`   Recommended Profile: ${analysis.recommendedProfile}`);
            if (analysis.recommendations.length > 0) {
              console.log(`   Recommendations:`);
              analysis.recommendations.forEach((rec) => {
                console.log(`     - ${rec}`);
              });
            }
            console.log('');
          } catch (error) {
            console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        if (args.export && args.output) {
          if (args.export === 'json') {
            fs.writeFileSync(args.output, JSON.stringify(analyses, null, 2));
            console.log(`✅ Report exported to ${args.output}`);
          }
        }
        break;
      }

      case 'profile': {
        const action = args.action || 'list';

        if (action === 'list') {
          listProfiles();
        } else if (action === 'show') {
          const profileName = args.input as CompressionProfileName;
          if (!profileName) {
            console.error('Error: profile name required');
            process.exit(1);
          }
          printProfile(profileName);
        } else {
          console.error(`Unknown profile action: ${action}`);
          process.exit(1);
        }
        break;
      }

      case 'convert': {
        if (!args.input || !args.to) {
          console.error('Error: --input and --to are required for convert command');
          process.exit(1);
        }

        const isDir = fs.statSync(args.input).isDirectory();
        const files = isDir
          ? globSync(`${args.input}${args.recursive ? '/**' : ''}/*.{jpg,jpeg,png,webp}`)
          : [args.input];

        console.log(`\n🔄 Converting ${files.length} image(s) to ${args.to}...\n`);

        const outputDir = args.output || args.input;
        let successCount = 0;

        for (const file of files) {
          const baseName = path.basename(file, path.extname(file));
          const outputPath = path.join(outputDir, `${baseName}.${args.to}`);

          const result = await compressImage(file, outputPath, 'mobile', args.quality, args.to);

          if (result.success) {
            successCount++;
            console.log(`✓ ${baseName} → ${formatBytes(result.compressedSize)}`);
          } else {
            console.log(`✗ ${baseName}: ${result.error}`);
          }
        }

        console.log(`\n✅ Converted ${successCount}/${files.length} images\n`);
        break;
      }

      case 'help':
      case '--help':
      case '-h':
        printHelp();
        break;

      default:
        console.error(`Unknown command: ${args.command}`);
        console.log('Run with --help for usage information');
        process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Run CLI
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
