# Image Compression Scripts & CLI Tool Guide

## Overview

The image compression system provides a comprehensive command-line tool (`scripts/compress-images.ts`) for batch image optimization with support for multiple compression profiles, quality presets, and responsive image generation.

## Quick Start

### Installation

Ensure `sharp` is installed:

```bash
bun add sharp
```

### Basic Usage

```bash
# Compress a single image
bun scripts/compress-images.ts compress --input photo.jpg --profile mobile

# Batch compress a directory
bun scripts/compress-images.ts batch \
  --input-dir ./images \
  --output-dir ./compressed \
  --profile desktop \
  --recursive

# Generate responsive variants
bun scripts/compress-images.ts srcset \
  --input hero.jpg \
  --output-dir ./variants

# Analyze images
bun scripts/compress-images.ts analyze \
  --input ./images \
  --recursive
```

## Commands

### 1. Compress Command

Compress a single image with a specific profile.

**Usage:**
```bash
bun scripts/compress-images.ts compress [options]
```

**Options:**
- `--input <path>` (required) - Input image path
- `--output <path>` - Output image path (default: auto-generated)
- `--profile <name>` - Compression profile: `thumbnail`, `mobile`, `desktop`, `original` (default: `mobile`)
- `--quality <0-100>` - Quality level (overrides profile default)
- `--format <fmt>` - Output format: `jpeg`, `webp`, `png`, `avif`
- `--dry-run` - Preview without writing files
- `--verbose` - Show detailed output

**Examples:**
```bash
# Compress with mobile profile
bun scripts/compress-images.ts compress --input photo.jpg --profile mobile

# Compress with custom quality
bun scripts/compress-images.ts compress --input photo.jpg --quality 75

# Convert to WebP
bun scripts/compress-images.ts compress --input photo.jpg --format webp

# Preview compression
bun scripts/compress-images.ts compress --input photo.jpg --dry-run --verbose
```

**Output:**
```
🖼️  Compressing image...
   Input: photo.jpg
   Profile: mobile

✅ Compression successful!
   Output: photo-compressed.webp
   Original: 2.45 MB
   Compressed: 890 KB
   Savings: 63.7%
   Time: 1250ms
```

### 2. Batch Command

Batch compress multiple images in a directory with parallel processing.

**Usage:**
```bash
bun scripts/compress-images.ts batch [options]
```

**Options:**
- `--input-dir <path>` (required) - Input directory
- `--output-dir <path>` (required) - Output directory
- `--profile <name>` - Compression profile (default: `mobile`)
- `--pattern <glob>` - File pattern (default: `**/*.{jpg,jpeg,png,webp}`)
- `--recursive` - Search subdirectories
- `--parallel <n>` - Number of parallel workers (default: 4)
- `--quality <0-100>` - Quality level
- `--format <fmt>` - Output format
- `--progress` - Show progress bar (default: true)
- `--dry-run` - Preview without writing
- `--verbose` - Show detailed output

**Examples:**
```bash
# Batch compress with desktop profile
bun scripts/compress-images.ts batch \
  --input-dir ./images \
  --output-dir ./compressed \
  --profile desktop \
  --recursive

# Batch compress with 8 parallel workers
bun scripts/compress-images.ts batch \
  --input-dir ./images \
  --output-dir ./compressed \
  --parallel 8 \
  --verbose

# Compress only JPEGs
bun scripts/compress-images.ts batch \
  --input-dir ./images \
  --output-dir ./compressed \
  --pattern "*.jpg"

# Preview batch compression
bun scripts/compress-images.ts batch \
  --input-dir ./images \
  --output-dir ./compressed \
  --dry-run
```

**Output:**
```
📦 Batch compressing images...
   Input: ./images
   Output: ./compressed
   Profile: desktop
   Parallel workers: 4

✓ photo1.jpg (2.45 MB → 890 KB)
✓ photo2.jpg (1.80 MB → 620 KB)
✓ photo3.jpg (3.20 MB → 1.10 MB)

📊 Batch Compression Report:
   Total Images: 3
   Successful: 3
   Failed: 0
   Original Size: 7.45 MB
   Compressed Size: 2.61 MB
   Overall Savings: 64.9%
   Total Time: 3.45s
   Avg Time/Image: 1150ms
```

### 3. Srcset Command

Generate responsive image variants for use in `srcset` attributes.

**Usage:**
```bash
bun scripts/compress-images.ts srcset [options]
```

**Options:**
- `--input <path>` (required) - Input image path
- `--output-dir <path>` (required) - Output directory
- `--widths <list>` - Comma-separated widths (default: `320,640,960,1280`)

**Examples:**
```bash
# Generate default srcset variants
bun scripts/compress-images.ts srcset \
  --input hero.jpg \
  --output-dir ./variants

# Generate custom widths
bun scripts/compress-images.ts srcset \
  --input hero.jpg \
  --output-dir ./variants \
  --widths 480,768,1024,1440

# Generate mobile-first variants
bun scripts/compress-images.ts srcset \
  --input hero.jpg \
  --output-dir ./variants \
  --widths 320,480,640
```

**Output:**
```
🎨 Generating srcset variants...
   Input: hero.jpg
   Output: ./variants
   Widths: 320, 640, 960, 1280

✅ Srcset generated!

srcset="./variants/hero-320w.webp 320w, ./variants/hero-640w.webp 640w, ./variants/hero-960w.webp 960w, ./variants/hero-1280w.webp 1280w"
sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 60vw"
```

### 4. Analyze Command

Analyze images and get compression recommendations.

**Usage:**
```bash
bun scripts/compress-images.ts analyze [options]
```

**Options:**
- `--input <path>` (required) - Image or directory path
- `--recursive` - Search subdirectories
- `--export <fmt>` - Export format: `json`, `csv`, `html`
- `--output <path>` - Output file path
- `--verbose` - Show detailed output

**Examples:**
```bash
# Analyze single image
bun scripts/compress-images.ts analyze --input photo.jpg

# Analyze directory
bun scripts/compress-images.ts analyze \
  --input ./images \
  --recursive

# Export analysis as JSON
bun scripts/compress-images.ts analyze \
  --input ./images \
  --recursive \
  --export json \
  --output analysis.json
```

**Output:**
```
🔍 Analyzing 3 image(s)...

📄 photo1.jpg
   Size: 2.45 MB
   Dimensions: 3840x2560
   Format: jpeg
   Recommended Profile: desktop
   Recommendations:
     - Image is very large, consider using desktop profile
     - Consider converting to WebP for better compression

📄 photo2.jpg
   Size: 1.80 MB
   Dimensions: 2560x1920
   Format: jpeg
   Recommended Profile: desktop
   Recommendations:
     - Consider converting to WebP for better compression

📄 photo3.jpg
   Size: 890 KB
   Dimensions: 1920x1440
   Format: webp
   Recommended Profile: mobile
```

### 5. Profile Command

Manage and view compression profiles.

**Usage:**
```bash
bun scripts/compress-images.ts profile [action] [options]
```

**Actions:**
- `list` - List all available profiles
- `show <name>` - Show profile details

**Examples:**
```bash
# List all profiles
bun scripts/compress-images.ts profile list

# Show profile details
bun scripts/compress-images.ts profile show desktop
```

**Output:**
```
📚 Available Compression Profiles:

  thumbnail    - Optimized for small previews and thumbnails
  mobile       - Optimized for mobile devices and slow networks
  desktop      - Optimized for desktop browsers and high-quality displays
  original     - Preserves original image with minimal compression

---

📋 Profile: Desktop
   Name: desktop
   Description: Optimized for desktop browsers and high-quality displays
   Use Case: Full-page hero images, photo gallery lightbox, desktop wallpapers, high-resolution displays, print-quality images

   Dimensions:
   - Max Width: 1200
   - Max Height: 1600

   Quality Settings:
   - JPEG Quality: 82
   - WebP Quality: 80
   - AVIF Quality: 78
   - PNG Compression: 7

   Metadata Handling:
   - Strip EXIF: true
   - Strip ICC: false
   - Strip XMP: true
   - Preserve Orientation: true
   - Preserve Color Space: true

   Format Options:
   - Progressive JPEG: true
   - Interlaced PNG: false
   - Scaling Algorithm: cubic
   - Allow Upscaling: false

   Target Size: 200 KB - 400 KB
   Recommended Quality Level: 4
```

### 6. Convert Command

Convert images to different formats.

**Usage:**
```bash
bun scripts/compress-images.ts convert [options]
```

**Options:**
- `--input <path>` (required) - Input image or directory
- `--to <format>` (required) - Target format: `jpeg`, `webp`, `png`, `avif`
- `--output <path>` - Output path
- `--quality <0-100>` - Quality level
- `--recursive` - Search subdirectories
- `--parallel <n>` - Number of parallel workers
- `--verbose` - Show detailed output

**Examples:**
```bash
# Convert single image to WebP
bun scripts/compress-images.ts convert \
  --input photo.jpg \
  --to webp

# Batch convert directory to WebP
bun scripts/compress-images.ts convert \
  --input ./images \
  --to webp \
  --output-dir ./webp \
  --recursive

# Convert to AVIF with custom quality
bun scripts/compress-images.ts convert \
  --input ./images \
  --to avif \
  --quality 85 \
  --recursive
```

## Compression Profiles

### Thumbnail Profile
- **Use Case:** Gallery previews, list items, avatars
- **Max Dimensions:** 150x150
- **Format:** JPEG
- **Quality:** 60 (JPEG), 55 (WebP)
- **Target Size:** 40-60 KB
- **Best For:** Small previews, thumbnails, avatars

### Mobile Profile
- **Use Case:** Mobile devices, slow networks, responsive images
- **Max Dimensions:** 480x720
- **Format:** WebP
- **Quality:** 72 (JPEG), 70 (WebP)
- **Target Size:** 80-150 KB
- **Best For:** Mobile apps, responsive images, social media

### Desktop Profile
- **Use Case:** Desktop browsers, high-quality displays
- **Max Dimensions:** 1200x1600
- **Format:** WebP
- **Quality:** 82 (JPEG), 80 (WebP)
- **Target Size:** 200-400 KB
- **Best For:** Full-page images, high-resolution displays

### Original Profile
- **Use Case:** Archive, backup, high-fidelity storage
- **Max Dimensions:** Unlimited
- **Format:** Original
- **Quality:** 95 (JPEG), 95 (WebP)
- **Target Size:** Unlimited
- **Best For:** Archive storage, backup copies

## Quality Levels

| Level | Name | JPEG | WebP | Use Case |
|-------|------|------|------|----------|
| 1 | Ultra-Low | 55 | 50 | Thumbnails, previews |
| 2 | Low | 68 | 63 | Mobile slow networks |
| 3 | Medium | 73 | 70 | Mobile normal networks |
| 4 | High | 82 | 78 | Desktop browsers |
| 5 | Very High | 90 | 87 | Professional, print |
| 6 | Lossless | 95 | 95 | Archive, backup |

## Integration with React Components

### Using with CachedOptimizedImage

```tsx
import { CachedOptimizedImage } from '~/components/CachedOptimizedImage';

export function HeroImage() {
  return (
    <CachedOptimizedImage
      src="/images/hero.jpg"
      alt="Hero image"
      compressionProfile="desktop"
      qualityLevel={4}
      srcSet="/images/hero-320w.webp 320w, /images/hero-640w.webp 640w, /images/hero-1280w.webp 1280w"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 60vw"
      enableCache={true}
    />
  );
}
```

### Using srcsetGenerator Utilities

```tsx
import { generateSrcset, generatePictureElement } from '~/utils/srcsetGenerator';

export function ResponsiveImage() {
  const srcset = generateSrcset({
    basePath: '/images/photo',
    widths: [320, 640, 960, 1280],
    formats: ['webp', 'jpeg'],
  });

  return (
    <img
      src="/images/photo.jpg"
      srcSet={srcset.srcset}
      sizes={srcset.sizes}
      alt="Responsive image"
      loading={srcset.loadingStrategy}
    />
  );
}
```

## Compression Engine API

### Initialize Engine

```typescript
import { initializeCompressionEngine } from '~/utils/compressionEngine';

initializeCompressionEngine({
  adaptiveCompression: true,
  maxQuality: 95,
  minQuality: 30,
  tolerance: 5,
  cacheResults: true,
});
```

### Estimate Compression Savings

```typescript
import { estimateCompressionSavings } from '~/utils/compressionEngine';

const originalSize = 2_500_000; // 2.5 MB
const savings = estimateCompressionSavings(originalSize, 'mobile');
console.log(`Estimated savings: ${savings}%`);
```

### Recommend Profile

```typescript
import { recommendCompressionProfile } from '~/utils/compressionEngine';

const profile = recommendCompressionProfile(
  1920, // width
  1440, // height
  2_500_000, // file size
  false // has alpha
);
console.log(`Recommended profile: ${profile}`);
```

## Batch Processing

### Using BatchProcessor

```typescript
import { BatchProcessor } from '~/utils/batchProcessor';

const processor = new BatchProcessor(
  async (item) => {
    // Process item
    return result;
  },
  { workers: 4, timeout: 30000 }
);

const { results, errors } = await processor.process(items, (progress) => {
  console.log(`Progress: ${progress.percentage.toFixed(1)}%`);
});
```

### Using CompressionBatchProcessor

```typescript
import { CompressionBatchProcessor } from '~/utils/batchProcessor';

const processor = new CompressionBatchProcessor(
  async (input, output, profile) => {
    // Compress image
    return result;
  }
);

const report = await processor.processBatch(
  [
    { input: 'photo1.jpg', output: 'compressed/photo1.webp', profile: 'mobile' },
    { input: 'photo2.jpg', output: 'compressed/photo2.webp', profile: 'mobile' },
  ],
  (progress) => {
    console.log(`${progress.processed}/${progress.total} images processed`);
  }
);
```

## Performance Tips

### 1. Choose Right Profile
- **Thumbnails:** Use `thumbnail` profile for images < 200px
- **Mobile:** Use `mobile` profile for responsive images
- **Desktop:** Use `desktop` profile for full-page images
- **Archive:** Use `original` profile for backups

### 2. Optimize Parallel Workers
```bash
# For 4-core CPU, use 4 workers
bun scripts/compress-images.ts batch \
  --input-dir ./images \
  --output-dir ./compressed \
  --parallel 4

# For 8-core CPU, use 8 workers
bun scripts/compress-images.ts batch \
  --input-dir ./images \
  --output-dir ./compressed \
  --parallel 8
```

### 3. Use Batch Processing
- Process multiple images in parallel
- Monitor memory usage
- Track progress with callbacks

### 4. Generate Srcset Variants
- Create multiple widths for responsive design
- Use WebP for modern browsers
- Provide JPEG fallback

## Troubleshooting

### Issue: "sharp is not installed"
**Solution:** Install sharp
```bash
bun add sharp
```

### Issue: "Unknown compression profile"
**Solution:** Use valid profile names: `thumbnail`, `mobile`, `desktop`, `original`

### Issue: "Quality must be between 0 and 100"
**Solution:** Ensure quality is in valid range
```bash
bun scripts/compress-images.ts compress --input photo.jpg --quality 75
```

### Issue: "Output directory does not exist"
**Solution:** Create output directory first
```bash
mkdir -p ./compressed
bun scripts/compress-images.ts batch \
  --input-dir ./images \
  --output-dir ./compressed
```

### Issue: "Task timeout"
**Solution:** Increase timeout for large images
```bash
# Modify batch processor config
const processor = new CompressionBatchProcessor(compressionFn, {
  timeout: 60000, // 60 seconds
});
```

## Advanced Usage

### Custom Compression Pipeline

```typescript
import sharp from 'sharp';
import { getCompressionProfile } from '~/config/compressionProfiles';

async function customCompress(inputPath: string, outputPath: string) {
  const profile = getCompressionProfile('desktop');
  
  let pipeline = sharp(inputPath);
  
  // Resize
  if (profile.maxWidth) {
    pipeline = pipeline.resize(profile.maxWidth, profile.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }
  
  // Strip metadata
  pipeline = pipeline.withMetadata(false);
  
  // Compress
  pipeline = pipeline.webp({ quality: profile.webpQuality });
  
  // Write
  await pipeline.toFile(outputPath);
}
```

### Adaptive Compression

```typescript
import { calculateOptimalQuality } from '~/utils/compressionEngine';

const targetSize = 150 * 1024; // 150 KB
const originalSize = 2_500_000; // 2.5 MB

const quality = calculateOptimalQuality(originalSize, targetSize);
console.log(`Optimal quality: ${quality}`);
```

## See Also

- [IMAGE_CACHING.md](./IMAGE_CACHING.md) - Image caching system
- [COMPRESSION_ARCHITECTURE.md](./COMPRESSION_ARCHITECTURE.md) - Architecture overview
- [COMPRESSION_INTEGRATION_GUIDE.md](./COMPRESSION_INTEGRATION_GUIDE.md) - Integration guide
