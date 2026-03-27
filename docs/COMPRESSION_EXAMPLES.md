# Image Compression CLI - Usage Examples

## Table of Contents

1. [Basic Examples](#basic-examples)
2. [Batch Processing](#batch-processing)
3. [Responsive Images](#responsive-images)
4. [Analysis & Recommendations](#analysis--recommendations)
5. [Advanced Workflows](#advanced-workflows)
6. [Integration Examples](#integration-examples)

---

## Basic Examples

### Example 1: Compress a Single Image

**Scenario:** You have a high-quality photo (3840x2560, 5.2 MB) and want to compress it for web use.

```bash
bun scripts/compress-images.ts compress \
  --input ./photos/vacation.jpg \
  --profile mobile \
  --output ./compressed/vacation.webp
```

**Output:**
```
🖼️  Compressing image...
   Input: ./photos/vacation.jpg
   Profile: mobile

✅ Compression successful!
   Output: ./compressed/vacation.webp
   Original: 5.20 MB
   Compressed: 1.85 MB
   Savings: 64.4%
   Time: 2150ms
```

**What happened:**
- Image resized to 480x720 (mobile profile max)
- Converted to WebP format
- Quality set to 70 (mobile profile default)
- Saved 3.35 MB

---

### Example 2: Compress with Custom Quality

**Scenario:** You want higher quality for a product photo.

```bash
bun scripts/compress-images.ts compress \
  --input ./products/shoe.jpg \
  --profile desktop \
  --quality 85 \
  --format webp
```

**Output:**
```
🖼️  Compressing image...
   Input: ./products/shoe.jpg
   Profile: desktop

✅ Compression successful!
   Output: ./products/shoe-compressed.webp
   Original: 3.20 MB
   Compressed: 890 KB
   Savings: 72.2%
   Time: 1850ms
```

---

### Example 3: Preview Compression (Dry Run)

**Scenario:** You want to see what compression would do without actually writing files.

```bash
bun scripts/compress-images.ts compress \
  --input ./photos/landscape.jpg \
  --profile thumbnail \
  --dry-run \
  --verbose
```

**Output:**
```
🖼️  Compressing image...
   Input: ./photos/landscape.jpg
   Profile: thumbnail

[DRY RUN] Would compress to: landscape-compressed.jpeg
[DRY RUN] Estimated savings: ~75%
[DRY RUN] Estimated output size: ~180 KB
```

---

## Batch Processing

### Example 4: Batch Compress Directory

**Scenario:** You have 50 photos in a directory and want to compress them all for mobile viewing.

```bash
bun scripts/compress-images.ts batch \
  --input-dir ./photos \
  --output-dir ./compressed \
  --profile mobile \
  --recursive \
  --parallel 4
```

**Output:**
```
📦 Batch compressing images...
   Input: ./photos
   Output: ./compressed
   Profile: mobile
   Parallel workers: 4

✓ vacation.jpg (5.20 MB → 1.85 MB)
✓ beach.jpg (4.10 MB → 1.45 MB)
✓ sunset.jpg (3.80 MB → 1.32 MB)
✓ mountain.jpg (6.20 MB → 2.10 MB)
... (46 more images)

📊 Batch Compression Report:
   Total Images: 50
   Successful: 50
   Failed: 0
   Original Size: 215.40 MB
   Compressed Size: 75.20 MB
   Overall Savings: 65.1%
   Total Time: 85.30s
   Avg Time/Image: 1706ms
```

---

### Example 5: Batch Compress with High Parallelism

**Scenario:** You have a powerful machine (8-core CPU) and want to compress 200 images quickly.

```bash
bun scripts/compress-images.ts batch \
  --input-dir ./gallery \
  --output-dir ./gallery-optimized \
  --profile desktop \
  --recursive \
  --parallel 8 \
  --verbose
```

**Output:**
```
📦 Batch compressing images...
   Input: ./gallery
   Output: ./gallery-optimized
   Profile: desktop
   Parallel workers: 8

✓ photo-001.jpg (2.45 MB → 890 KB)
✓ photo-002.jpg (1.80 MB → 620 KB)
✓ photo-003.jpg (3.20 MB → 1.10 MB)
... (197 more images)

📊 Batch Compression Report:
   Total Images: 200
   Successful: 200
   Failed: 0
   Original Size: 520.00 MB
   Compressed Size: 185.20 MB
   Overall Savings: 64.4%
   Total Time: 45.20s
   Avg Time/Image: 226ms
```

**Performance:** With 8 workers, processing time is ~2x faster than with 4 workers.

---

### Example 6: Batch Compress Specific File Types

**Scenario:** You only want to compress PNG files in a directory.

```bash
bun scripts/compress-images.ts batch \
  --input-dir ./assets \
  --output-dir ./assets-compressed \
  --pattern "*.png" \
  --profile mobile \
  --recursive
```

**Output:**
```
📦 Batch compressing images...
   Input: ./assets
   Output: ./assets-compressed
   Profile: mobile
   Pattern: *.png

Found 15 images to compress

✓ icon-1.png (256 KB → 45 KB)
✓ icon-2.png (312 KB → 52 KB)
... (13 more images)

📊 Batch Compression Report:
   Total Images: 15
   Successful: 15
   Failed: 0
   Original Size: 4.20 MB
   Compressed Size: 680 KB
   Overall Savings: 83.8%
   Total Time: 8.50s
   Avg Time/Image: 567ms
```

---

## Responsive Images

### Example 7: Generate Srcset Variants

**Scenario:** You have a hero image and want to generate responsive variants for different screen sizes.

```bash
bun scripts/compress-images.ts srcset \
  --input ./images/hero.jpg \
  --output-dir ./images/variants \
  --widths 320,640,960,1280,1920
```

**Output:**
```
🎨 Generating srcset variants...
   Input: ./images/hero.jpg
   Output: ./images/variants
   Widths: 320, 640, 960, 1280, 1920

✅ Srcset generated!

srcset="./images/variants/hero-320w.webp 320w, ./images/variants/hero-640w.webp 640w, ./images/variants/hero-960w.webp 960w, ./images/variants/hero-1280w.webp 1280w, ./images/variants/hero-1920w.webp 1920w"
sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 60vw"
```

**Generated Files:**
```
./images/variants/
├── hero-320w.webp   (45 KB)
├── hero-640w.webp   (95 KB)
├── hero-960w.webp   (165 KB)
├── hero-1280w.webp  (245 KB)
└── hero-1920w.webp  (380 KB)
```

**HTML Usage:**
```html
<img
  src="./images/variants/hero-1280w.webp"
  srcset="./images/variants/hero-320w.webp 320w, ./images/variants/hero-640w.webp 640w, ./images/variants/hero-960w.webp 960w, ./images/variants/hero-1280w.webp 1280w, ./images/variants/hero-1920w.webp 1920w"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 60vw"
  alt="Hero image"
  loading="lazy"
/>
```

---

### Example 8: Generate Mobile-First Srcset

**Scenario:** You want to optimize for mobile-first design with smaller variants.

```bash
bun scripts/compress-images.ts srcset \
  --input ./images/product.jpg \
  --output-dir ./images/product-variants \
  --widths 320,480,640
```

**Output:**
```
🎨 Generating srcset variants...
   Input: ./images/product.jpg
   Output: ./images/product-variants
   Widths: 320, 480, 640

✅ Srcset generated!

srcset="./images/product-variants/product-320w.webp 320w, ./images/product-variants/product-480w.webp 480w, ./images/product-variants/product-640w.webp 640w"
sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 60vw"
```

---

## Analysis & Recommendations

### Example 9: Analyze Single Image

**Scenario:** You want to understand an image's characteristics and get compression recommendations.

```bash
bun scripts/compress-images.ts analyze --input ./photos/photo.jpg
```

**Output:**
```
🔍 Analyzing 1 image(s)...

📄 photo.jpg
   Size: 2.45 MB
   Dimensions: 3840x2560
   Format: jpeg
   Recommended Profile: desktop
   Recommendations:
     - Image is very large, consider using desktop profile
     - Consider converting to WebP for better compression
```

---

### Example 10: Analyze Directory with Export

**Scenario:** You want to analyze all images in a directory and export the results as JSON.

```bash
bun scripts/compress-images.ts analyze \
  --input ./gallery \
  --recursive \
  --export json \
  --output analysis-report.json
```

**Output:**
```
🔍 Analyzing 50 image(s)...

📄 photo-001.jpg
   Size: 2.45 MB
   Dimensions: 3840x2560
   Format: jpeg
   Recommended Profile: desktop

📄 photo-002.jpg
   Size: 1.80 MB
   Dimensions: 2560x1920
   Format: jpeg
   Recommended Profile: desktop

... (48 more images)

✅ Report exported to analysis-report.json
```

**Generated JSON:**
```json
[
  {
    "path": "./gallery/photo-001.jpg",
    "name": "photo-001.jpg",
    "size": 2560000,
    "width": 3840,
    "height": 2560,
    "format": "jpeg",
    "colorSpace": "srgb",
    "hasAlpha": false,
    "hasExif": true,
    "hasICC": true,
    "recommendedProfile": "desktop",
    "estimatedSavings": {
      "thumbnail": 85,
      "mobile": 70,
      "desktop": 45
    },
    "recommendations": [
      "Image is very large, consider using desktop profile",
      "Consider converting to WebP for better compression"
    ]
  },
  ...
]
```

---

### Example 11: View Compression Profiles

**Scenario:** You want to see all available compression profiles.

```bash
bun scripts/compress-images.ts profile list
```

**Output:**
```
📚 Available Compression Profiles:

  thumbnail    - Optimized for small previews and thumbnails
  mobile       - Optimized for mobile devices and slow networks
  desktop      - Optimized for desktop browsers and high-quality displays
  original     - Preserves original image with minimal compression
```

---

### Example 12: View Profile Details

**Scenario:** You want detailed information about the desktop profile.

```bash
bun scripts/compress-images.ts profile show desktop
```

**Output:**
```
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

---

## Advanced Workflows

### Example 13: Convert All Images to WebP

**Scenario:** You want to convert all JPEG images to WebP format for better compression.

```bash
bun scripts/compress-images.ts convert \
  --input ./images \
  --to webp \
  --output-dir ./images-webp \
  --recursive \
  --parallel 4
```

**Output:**
```
🔄 Converting 25 image(s) to webp...

✓ photo-001 → 890 KB
✓ photo-002 → 620 KB
✓ photo-003 → 1.10 MB
... (22 more images)

✅ Converted 25/25 images
```

---

### Example 14: Compress and Convert in One Step

**Scenario:** You want to compress images with the desktop profile and convert to AVIF format.

```bash
bun scripts/compress-images.ts compress \
  --input ./photos/landscape.jpg \
  --profile desktop \
  --format avif \
  --quality 80
```

**Output:**
```
🖼️  Compressing image...
   Input: ./photos/landscape.jpg
   Profile: desktop

✅ Compression successful!
   Output: ./photos/landscape-compressed.avif
   Original: 4.50 MB
   Compressed: 1.20 MB
   Savings: 73.3%
   Time: 3200ms
```

---

### Example 15: Batch Process with Dry Run

**Scenario:** You want to preview batch compression before actually processing files.

```bash
bun scripts/compress-images.ts batch \
  --input-dir ./photos \
  --output-dir ./compressed \
  --profile mobile \
  --dry-run \
  --verbose
```

**Output:**
```
📦 Batch compressing images...
   Input: ./photos
   Output: ./compressed
   Profile: mobile
   Parallel workers: 4

[DRY RUN] Would compress photo-001.jpg
[DRY RUN] Would compress photo-002.jpg
[DRY RUN] Would compress photo-003.jpg
... (47 more images)

[DRY RUN] Total images: 50
[DRY RUN] Estimated total savings: ~65%
[DRY RUN] Estimated total time: ~85s
```

---

## Integration Examples

### Example 16: React Component with Generated Srcset

**Scenario:** You've generated srcset variants and want to use them in a React component.

```tsx
// First, generate variants:
// bun scripts/compress-images.ts srcset \
//   --input ./public/images/hero.jpg \
//   --output-dir ./public/images/hero-variants

import { CachedOptimizedImage } from '~/components/CachedOptimizedImage';

export function HeroSection() {
  return (
    <CachedOptimizedImage
      src="/images/hero-variants/hero-1280w.webp"
      alt="Hero image"
      srcSet="/images/hero-variants/hero-320w.webp 320w, /images/hero-variants/hero-640w.webp 640w, /images/hero-variants/hero-960w.webp 960w, /images/hero-variants/hero-1280w.webp 1280w, /images/hero-variants/hero-1920w.webp 1920w"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 60vw"
      compressionProfile="desktop"
      qualityLevel={4}
      enableCache={true}
    />
  );
}
```

---

### Example 17: Programmatic Compression in Build Script

**Scenario:** You want to compress images as part of your build process.

```typescript
// scripts/build-compress.ts
import { CompressionBatchProcessor } from '~/utils/batchProcessor';
import { compressImage } from '~/utils/compressionEngine';

async function compressImagesForBuild() {
  const processor = new CompressionBatchProcessor(
    async (input, output, profile) => {
      return await compressImage(input, output, profile);
    },
    { workers: 4 }
  );

  const items = [
    { input: './public/images/hero.jpg', output: './dist/hero.webp', profile: 'desktop' },
    { input: './public/images/thumb.jpg', output: './dist/thumb.webp', profile: 'thumbnail' },
  ];

  const report = await processor.processBatch(items, (progress) => {
    console.log(`${progress.processed}/${progress.total} images compressed`);
  });

  console.log(`✅ Compression complete: ${report.overallSavings.toFixed(1)}% savings`);
}

compressImagesForBuild();
```

---

### Example 18: Analyze and Recommend Profiles

**Scenario:** You want to analyze images and automatically apply recommended profiles.

```typescript
import { analyzeImage, recommendCompressionProfile } from '~/utils/compressionEngine';
import { compressImage } from '~/utils/compressionEngine';

async function smartCompress(imagePath: string) {
  // Analyze image
  const analysis = await analyzeImage(imagePath);
  
  // Get recommended profile
  const profile = recommendCompressionProfile(
    analysis.width,
    analysis.height,
    analysis.size,
    analysis.hasAlpha
  );

  console.log(`Recommended profile: ${profile}`);
  console.log(`Estimated savings: ${analysis.estimatedSavings[profile]}%`);

  // Compress with recommended profile
  const result = await compressImage(imagePath, `${imagePath}.webp`, profile);
  
  console.log(`✅ Compressed: ${result.savings.toFixed(1)}% savings`);
}
```

---

### Example 19: Generate Responsive Variants Programmatically

**Scenario:** You want to generate srcset variants in your code.

```typescript
import { generateSrcset, generatePictureElement } from '~/utils/srcsetGenerator';

function createResponsiveImage(imagePath: string) {
  const srcset = generateSrcset({
    basePath: imagePath,
    widths: [320, 640, 960, 1280],
    formats: ['webp', 'jpeg'],
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 60vw',
  });

  // Use srcset in component
  return {
    srcset: srcset.srcset,
    sizes: srcset.sizes,
    loading: srcset.loadingStrategy,
  };
}

// Or generate HTML directly
function createPictureElement(imagePath: string) {
  const html = generatePictureElement({
    basePath: imagePath,
    alt: 'Responsive image',
    className: 'w-full h-auto',
    formats: ['webp', 'jpeg'],
  });

  return html;
}
```

---

## Performance Tips

### Tip 1: Use Appropriate Profiles
```bash
# For thumbnails (< 200px)
bun scripts/compress-images.ts compress --input photo.jpg --profile thumbnail

# For mobile (responsive)
bun scripts/compress-images.ts compress --input photo.jpg --profile mobile

# For desktop (full-page)
bun scripts/compress-images.ts compress --input photo.jpg --profile desktop
```

### Tip 2: Optimize Parallel Workers
```bash
# For 4-core CPU
bun scripts/compress-images.ts batch --input-dir ./images --output-dir ./compressed --parallel 4

# For 8-core CPU
bun scripts/compress-images.ts batch --input-dir ./images --output-dir ./compressed --parallel 8

# For 16-core CPU
bun scripts/compress-images.ts batch --input-dir ./images --output-dir ./compressed --parallel 16
```

### Tip 3: Use Batch Processing for Multiple Images
```bash
# ✅ Good: Process 100 images in parallel
bun scripts/compress-images.ts batch --input-dir ./images --output-dir ./compressed --parallel 4

# ❌ Avoid: Compress 100 images one by one
for file in ./images/*.jpg; do
  bun scripts/compress-images.ts compress --input "$file"
done
```

### Tip 4: Generate Srcset Variants Once
```bash
# Generate variants once during build
bun scripts/compress-images.ts srcset --input hero.jpg --output-dir ./variants

# Reuse in multiple components
<img srcset="./variants/hero-320w.webp 320w, ..." />
<img srcset="./variants/hero-320w.webp 320w, ..." />
```

---

## Troubleshooting

### Issue: "sharp is not installed"
```bash
bun add sharp
```

### Issue: "Output directory does not exist"
```bash
mkdir -p ./compressed
bun scripts/compress-images.ts batch --input-dir ./images --output-dir ./compressed
```

### Issue: "Task timeout"
Increase timeout for large images:
```typescript
const processor = new CompressionBatchProcessor(compressionFn, {
  timeout: 60000, // 60 seconds
});
```

### Issue: "Out of memory"
Reduce parallel workers:
```bash
bun scripts/compress-images.ts batch --input-dir ./images --output-dir ./compressed --parallel 2
```

---

## See Also

- [COMPRESSION_SCRIPTS_GUIDE.md](./COMPRESSION_SCRIPTS_GUIDE.md) - Complete CLI guide
- [COMPRESSION_API_REFERENCE.md](./COMPRESSION_API_REFERENCE.md) - API documentation
- [COMPRESSION_ARCHITECTURE.md](./COMPRESSION_ARCHITECTURE.md) - Architecture overview
