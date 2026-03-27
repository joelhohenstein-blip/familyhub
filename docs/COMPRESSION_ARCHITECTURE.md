# Image Compression Architecture & Quality Profiles

## Overview

This document defines the compression architecture for FamilyHub's image optimization system. It establishes quality profiles for different use cases, compression strategies, and a CLI tool structure for batch processing.

## Compression Profiles

### Profile Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    Original Image                            │
│              (Full resolution, uncompressed)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
    ┌────────┐  ┌────────┐  ┌──────────┐
    │Thumbnail│ │ Mobile │  │ Desktop  │
    │ 150x150 │  │ 480x*  │  │ 1200x*   │
    │ 40-60KB │  │ 80-150 │  │ 200-400  │
    │ JPEG 60 │  │ JPEG 70│  │ JPEG 80  │
    └────────┘  └────────┘  └──────────┘
```

### 1. **Thumbnail Profile**
**Use Case:** Gallery previews, list items, avatars

| Property | Value |
|----------|-------|
| **Max Width** | 150px |
| **Max Height** | 150px |
| **Format** | JPEG (primary), WebP (fallback) |
| **Quality** | 60 |
| **Target Size** | 40-60 KB |
| **Aspect Ratio** | Preserve original |
| **Optimization** | Aggressive compression, strip metadata |

**Configuration:**
```typescript
{
  name: 'thumbnail',
  maxWidth: 150,
  maxHeight: 150,
  quality: 60,
  format: 'jpeg',
  webpQuality: 55,
  stripMetadata: true,
  progressive: false,
  interlace: false,
  targetSize: { min: 40 * 1024, max: 60 * 1024 },
}
```

**Use Cases:**
- Gallery grid previews
- User avatars
- Timeline thumbnails
- Album covers
- Search results

---

### 2. **Mobile Profile**
**Use Case:** Mobile devices, slow networks, responsive images

| Property | Value |
|----------|-------|
| **Max Width** | 480px |
| **Max Height** | 720px (auto-scale) |
| **Format** | WebP (primary), JPEG (fallback) |
| **Quality** | 70 |
| **Target Size** | 80-150 KB |
| **Aspect Ratio** | Preserve original |
| **Optimization** | Balanced compression, optimize for mobile |

**Configuration:**
```typescript
{
  name: 'mobile',
  maxWidth: 480,
  maxHeight: 720,
  quality: 70,
  format: 'webp',
  jpegQuality: 72,
  stripMetadata: true,
  progressive: true,
  interlace: true,
  targetSize: { min: 80 * 1024, max: 150 * 1024 },
  mobileOptimized: true,
}
```

**Use Cases:**
- Mobile app images
- Responsive image sources (srcset)
- Social media sharing
- Email attachments
- Low-bandwidth scenarios

---

### 3. **Desktop Profile**
**Use Case:** Desktop browsers, high-quality displays, full-page images

| Property | Value |
|----------|-------|
| **Max Width** | 1200px |
| **Max Height** | 1600px (auto-scale) |
| **Format** | WebP (primary), JPEG (fallback) |
| **Quality** | 80 |
| **Target Size** | 200-400 KB |
| **Aspect Ratio** | Preserve original |
| **Optimization** | High quality, minimal compression artifacts |

**Configuration:**
```typescript
{
  name: 'desktop',
  maxWidth: 1200,
  maxHeight: 1600,
  quality: 80,
  format: 'webp',
  jpegQuality: 82,
  stripMetadata: true,
  progressive: true,
  interlace: false,
  targetSize: { min: 200 * 1024, max: 400 * 1024 },
  desktopOptimized: true,
}
```

**Use Cases:**
- Full-page hero images
- Photo gallery lightbox
- Desktop wallpapers
- High-resolution displays
- Print-quality images

---

### 4. **Original Profile**
**Use Case:** Archive, backup, high-fidelity storage

| Property | Value |
|----------|-------|
| **Max Width** | Unlimited |
| **Max Height** | Unlimited |
| **Format** | Original format preserved |
| **Quality** | 95+ |
| **Target Size** | Unlimited |
| **Aspect Ratio** | Preserve original |
| **Optimization** | Minimal, lossless compression only |

**Configuration:**
```typescript
{
  name: 'original',
  maxWidth: null,
  maxHeight: null,
  quality: 95,
  format: 'original',
  stripMetadata: false,
  progressive: false,
  interlace: false,
  targetSize: null,
  preserveOriginal: true,
}
```

**Use Cases:**
- Archive storage
- Backup copies
- High-resolution downloads
- Print production
- Future re-processing

---

## Quality Levels

### Quality Scale (0-100)

```
0-30:   Thumbnail/Preview (very aggressive)
31-50:  Low Quality (mobile, slow networks)
51-70:  Medium Quality (balanced, mobile-friendly)
71-85:  High Quality (desktop, good displays)
86-95:  Very High Quality (professional, print)
96-100: Lossless/Original (archive, backup)
```

### Quality Presets

| Level | Name | Use Case | JPEG | WebP | File Size |
|-------|------|----------|------|------|-----------|
| 1 | Ultra-Low | Thumbnails | 50-60 | 45-55 | 30-50 KB |
| 2 | Low | Mobile (slow) | 65-70 | 60-65 | 60-100 KB |
| 3 | Medium | Mobile (normal) | 72-75 | 68-72 | 100-150 KB |
| 4 | High | Desktop | 80-85 | 75-80 | 200-350 KB |
| 5 | Very High | Professional | 88-92 | 85-90 | 350-500 KB |
| 6 | Lossless | Archive | 95+ | 95+ | 500KB-2MB |

### Adaptive Quality Selection

```typescript
interface QualityProfile {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  name: string;
  jpegQuality: number;
  webpQuality: number;
  targetUseCase: string;
  estimatedSize: { min: number; max: number };
}

const QUALITY_PROFILES: Record<number, QualityProfile> = {
  1: {
    level: 1,
    name: 'ultra-low',
    jpegQuality: 55,
    webpQuality: 50,
    targetUseCase: 'thumbnails, previews',
    estimatedSize: { min: 30 * 1024, max: 50 * 1024 },
  },
  2: {
    level: 2,
    name: 'low',
    jpegQuality: 68,
    webpQuality: 63,
    targetUseCase: 'mobile (slow networks)',
    estimatedSize: { min: 60 * 1024, max: 100 * 1024 },
  },
  3: {
    level: 3,
    name: 'medium',
    jpegQuality: 73,
    webpQuality: 70,
    targetUseCase: 'mobile (normal networks)',
    estimatedSize: { min: 100 * 1024, max: 150 * 1024 },
  },
  4: {
    level: 4,
    name: 'high',
    jpegQuality: 82,
    webpQuality: 78,
    targetUseCase: 'desktop, responsive',
    estimatedSize: { min: 200 * 1024, max: 350 * 1024 },
  },
  5: {
    level: 5,
    name: 'very-high',
    jpegQuality: 90,
    webpQuality: 87,
    targetUseCase: 'professional, print',
    estimatedSize: { min: 350 * 1024, max: 500 * 1024 },
  },
  6: {
    level: 6,
    name: 'lossless',
    jpegQuality: 95,
    webpQuality: 95,
    targetUseCase: 'archive, backup',
    estimatedSize: { min: 500 * 1024, max: 2 * 1024 * 1024 },
  },
};
```

---

## Compression Strategies

### 1. **Format Selection Strategy**

```
Input Image
    │
    ├─ PNG/GIF with transparency?
    │  └─ YES → WebP (with alpha) or PNG
    │  └─ NO  → Continue
    │
    ├─ Photograph/Complex colors?
    │  └─ YES → WebP (primary) + JPEG (fallback)
    │  └─ NO  → Continue
    │
    └─ Simple graphics/Text?
       └─ YES → WebP (lossless) or PNG
       └─ NO  → WebP (lossy) + JPEG (fallback)
```

### 2. **Dimension Scaling Strategy**

```typescript
interface ScalingStrategy {
  profile: 'thumbnail' | 'mobile' | 'desktop' | 'original';
  maxWidth: number | null;
  maxHeight: number | null;
  preserveAspectRatio: boolean;
  upscalingAllowed: boolean;
  algorithm: 'lanczos' | 'cubic' | 'linear' | 'nearest';
}

const SCALING_STRATEGIES = {
  thumbnail: {
    maxWidth: 150,
    maxHeight: 150,
    preserveAspectRatio: true,
    upscalingAllowed: false,
    algorithm: 'lanczos',
  },
  mobile: {
    maxWidth: 480,
    maxHeight: 720,
    preserveAspectRatio: true,
    upscalingAllowed: false,
    algorithm: 'cubic',
  },
  desktop: {
    maxWidth: 1200,
    maxHeight: 1600,
    preserveAspectRatio: true,
    upscalingAllowed: false,
    algorithm: 'cubic',
  },
  original: {
    maxWidth: null,
    maxHeight: null,
    preserveAspectRatio: true,
    upscalingAllowed: false,
    algorithm: 'lanczos',
  },
};
```

### 3. **Metadata Handling Strategy**

```typescript
interface MetadataStrategy {
  stripExif: boolean;
  stripICC: boolean;
  stripXMP: boolean;
  preserveOrientation: boolean;
  preserveColorSpace: boolean;
}

const METADATA_STRATEGIES = {
  aggressive: {
    stripExif: true,
    stripICC: true,
    stripXMP: true,
    preserveOrientation: true,
    preserveColorSpace: false,
  },
  balanced: {
    stripExif: true,
    stripICC: false,
    stripXMP: true,
    preserveOrientation: true,
    preserveColorSpace: true,
  },
  conservative: {
    stripExif: false,
    stripICC: false,
    stripXMP: false,
    preserveOrientation: true,
    preserveColorSpace: true,
  },
};
```

### 4. **Adaptive Compression Strategy**

```typescript
interface AdaptiveCompressionConfig {
  targetSize: number; // bytes
  minQuality: number;
  maxQuality: number;
  maxIterations: number;
  tolerance: number; // percentage
}

// Adaptive compression algorithm
async function adaptiveCompress(
  image: Buffer,
  config: AdaptiveCompressionConfig
): Promise<{ buffer: Buffer; quality: number; size: number }> {
  let quality = (config.minQuality + config.maxQuality) / 2;
  let iterations = 0;

  while (iterations < config.maxIterations) {
    const compressed = await compressWithQuality(image, quality);
    const size = compressed.length;
    const difference = Math.abs(size - config.targetSize);
    const tolerance = config.targetSize * (config.tolerance / 100);

    if (difference <= tolerance) {
      return { buffer: compressed, quality, size };
    }

    if (size > config.targetSize) {
      // Too large, reduce quality
      quality = Math.max(config.minQuality, quality - 5);
    } else {
      // Too small, increase quality
      quality = Math.min(config.maxQuality, quality + 5);
    }

    iterations++;
  }

  // Return best attempt
  return { buffer: compressed, quality, size };
}
```

---

## CLI Tool Structure

### Architecture Overview

```
image-compression-cli/
├── bin/
│   └── compress.ts              # Entry point
├── src/
│   ├── commands/
│   │   ├── compress.ts          # Single image compression
│   │   ├── batch.ts             # Batch processing
│   │   ├── profile.ts           # Apply compression profile
│   │   ├── analyze.ts           # Analyze image
│   │   ├── convert.ts           # Format conversion
│   │   └── optimize.ts          # Adaptive optimization
│   ├── profiles/
│   │   ├── index.ts             # Profile definitions
│   │   ├── thumbnail.ts         # Thumbnail profile
│   │   ├── mobile.ts            # Mobile profile
│   │   ├── desktop.ts           # Desktop profile
│   │   └── original.ts          # Original profile
│   ├── strategies/
│   │   ├── format.ts            # Format selection
│   │   ├── scaling.ts           # Dimension scaling
│   │   ├── metadata.ts          # Metadata handling
│   │   └── adaptive.ts          # Adaptive compression
│   ├── processors/
│   │   ├── sharp.ts             # Sharp.js wrapper
│   │   ├── imagemin.ts          # Imagemin wrapper
│   │   └── ffmpeg.ts            # FFmpeg wrapper (video)
│   ├── utils/
│   │   ├── logger.ts            # Logging
│   │   ├── progress.ts          # Progress tracking
│   │   ├── validation.ts        # Input validation
│   │   ├── metrics.ts           # Performance metrics
│   │   └── config.ts            # Configuration management
│   └── types/
│       ├── index.ts             # Type definitions
│       ├── profiles.ts          # Profile types
│       └── options.ts           # CLI options
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
```

### Command Structure

#### 1. **Compress Command**
```bash
# Compress single image with profile
compress-cli compress <input> --profile mobile --output <output>

# Compress with custom quality
compress-cli compress <input> --quality 75 --format webp

# Compress with size target
compress-cli compress <input> --target-size 150KB --format jpeg

# Compress with all profiles
compress-cli compress <input> --all-profiles --output-dir ./compressed
```

**Options:**
```typescript
interface CompressOptions {
  input: string;                    // Input file path
  output?: string;                  // Output file path
  profile?: 'thumbnail' | 'mobile' | 'desktop' | 'original';
  quality?: number;                 // 0-100
  format?: 'jpeg' | 'webp' | 'png' | 'avif';
  targetSize?: string;              // e.g., "150KB"
  allProfiles?: boolean;            // Generate all profiles
  outputDir?: string;               // Output directory for multiple files
  stripMetadata?: boolean;          // Remove EXIF/ICC/XMP
  progressive?: boolean;            // Progressive JPEG
  interlace?: boolean;              // Interlaced PNG
  verbose?: boolean;                // Detailed output
}
```

#### 2. **Batch Command**
```bash
# Batch compress directory
compress-cli batch <input-dir> --profile mobile --output-dir <output-dir>

# Batch with pattern
compress-cli batch <input-dir> --pattern "*.jpg" --profile desktop

# Batch with recursive search
compress-cli batch <input-dir> --recursive --profile mobile

# Batch with parallel processing
compress-cli batch <input-dir> --parallel 4 --profile mobile

# Batch with progress
compress-cli batch <input-dir> --profile mobile --progress
```

**Options:**
```typescript
interface BatchOptions {
  inputDir: string;                 // Input directory
  outputDir: string;                // Output directory
  profile?: 'thumbnail' | 'mobile' | 'desktop' | 'original';
  pattern?: string;                 // File pattern (e.g., "*.jpg")
  recursive?: boolean;              // Search subdirectories
  parallel?: number;                // Parallel workers (default: 2)
  quality?: number;                 // 0-100
  format?: string;                  // Output format
  stripMetadata?: boolean;          // Remove metadata
  progress?: boolean;               // Show progress bar
  dryRun?: boolean;                 // Preview without writing
  verbose?: boolean;                // Detailed output
}
```

#### 3. **Profile Command**
```bash
# List available profiles
compress-cli profile list

# Show profile details
compress-cli profile show mobile

# Create custom profile
compress-cli profile create --name custom --max-width 800 --quality 75

# Apply profile to image
compress-cli profile apply mobile <input> --output <output>
```

**Options:**
```typescript
interface ProfileOptions {
  action: 'list' | 'show' | 'create' | 'apply';
  name?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: string;
  input?: string;
  output?: string;
}
```

#### 4. **Analyze Command**
```bash
# Analyze image
compress-cli analyze <input>

# Analyze with recommendations
compress-cli analyze <input> --recommendations

# Analyze directory
compress-cli analyze <input-dir> --recursive

# Export analysis
compress-cli analyze <input> --export json --output report.json
```

**Options:**
```typescript
interface AnalyzeOptions {
  input: string;
  recommendations?: boolean;
  recursive?: boolean;
  export?: 'json' | 'csv' | 'html';
  output?: string;
  verbose?: boolean;
}
```

#### 5. **Convert Command**
```bash
# Convert format
compress-cli convert <input> --to webp --output <output>

# Convert with quality
compress-cli convert <input> --to jpeg --quality 80

# Batch convert
compress-cli convert <input-dir> --to webp --recursive
```

**Options:**
```typescript
interface ConvertOptions {
  input: string;
  to: 'jpeg' | 'webp' | 'png' | 'avif';
  output?: string;
  quality?: number;
  recursive?: boolean;
  parallel?: number;
}
```

#### 6. **Optimize Command**
```bash
# Adaptive optimization
compress-cli optimize <input> --target-size 150KB

# Optimize with quality constraints
compress-cli optimize <input> --target-size 150KB --min-quality 60

# Batch optimize
compress-cli optimize <input-dir> --target-size 150KB --recursive
```

**Options:**
```typescript
interface OptimizeOptions {
  input: string;
  targetSize: string;               // e.g., "150KB"
  minQuality?: number;              // Minimum acceptable quality
  maxQuality?: number;              // Maximum quality to try
  output?: string;
  recursive?: boolean;
  parallel?: number;
  verbose?: boolean;
}
```

### Configuration File

```yaml
# .compressionrc.yaml
compression:
  profiles:
    thumbnail:
      maxWidth: 150
      maxHeight: 150
      quality: 60
      format: jpeg
      webpQuality: 55
    mobile:
      maxWidth: 480
      maxHeight: 720
      quality: 70
      format: webp
      jpegQuality: 72
    desktop:
      maxWidth: 1200
      maxHeight: 1600
      quality: 80
      format: webp
      jpegQuality: 82
    original:
      quality: 95
      stripMetadata: false

  defaults:
    stripMetadata: true
    progressive: true
    interlace: false
    parallel: 2

  output:
    directory: ./compressed
    preserveStructure: true
    namingPattern: '{name}-{profile}.{ext}'

  logging:
    level: info
    format: json
    file: compression.log
```

### Output Structure

```
compressed/
├── image1/
│   ├── image1-thumbnail.jpg       (150x150, 45KB)
│   ├── image1-thumbnail.webp      (150x150, 40KB)
│   ├── image1-mobile.jpg          (480x360, 95KB)
│   ├── image1-mobile.webp         (480x360, 85KB)
│   ├── image1-desktop.jpg         (1200x900, 280KB)
│   ├── image1-desktop.webp        (1200x900, 240KB)
│   └── image1-original.jpg        (original)
├── image2/
│   └── ...
└── report.json
    {
      "totalImages": 2,
      "totalOriginalSize": 5242880,
      "totalCompressedSize": 1048576,
      "compressionRatio": 0.2,
      "timeTaken": 45.2,
      "images": [
        {
          "name": "image1.jpg",
          "originalSize": 2621440,
          "profiles": {
            "thumbnail": { "size": 45056, "quality": 60 },
            "mobile": { "size": 97280, "quality": 70 },
            "desktop": { "size": 286720, "quality": 80 }
          }
        }
      ]
    }
```

---

## Integration with Caching System

### Compression → Cache Flow

```
Original Image
    │
    ├─ Generate Profiles
    │  ├─ Thumbnail (150x150, Q60)
    │  ├─ Mobile (480x*, Q70)
    │  ├─ Desktop (1200x*, Q80)
    │  └─ Original (uncompressed)
    │
    ├─ Store in Cache
    │  ├─ Memory Cache (L1)
    │  ├─ IndexedDB (L2)
    │  └─ Service Worker (L3)
    │
    └─ Serve via CachedOptimizedImage
       ├─ Detect device type
       ├─ Select appropriate profile
       └─ Load from cache
```

### CachedOptimizedImage Enhancement

```typescript
interface CachedOptimizedImageProps {
  src: string;
  alt: string;
  
  // Compression profile selection
  compressionProfile?: 'thumbnail' | 'mobile' | 'desktop' | 'original';
  autoSelectProfile?: boolean;  // Auto-detect based on device
  
  // Quality level
  qualityLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  
  // Format preferences
  preferredFormats?: ('webp' | 'jpeg' | 'png' | 'avif')[];
  
  // Responsive images
  srcSet?: string;
  sizes?: string;
  
  // Caching
  enableCache?: boolean;
  cacheTTL?: number;
  
  // Callbacks
  onCompressionComplete?: (profile: string, size: number) => void;
}
```

---

## Performance Targets

### Compression Ratios

| Profile | Original | Compressed | Ratio | Savings |
|---------|----------|-----------|-------|---------|
| Thumbnail | 500 KB | 45 KB | 0.09 | 91% |
| Mobile | 2 MB | 110 KB | 0.055 | 94.5% |
| Desktop | 5 MB | 280 KB | 0.056 | 94.4% |
| Original | 5 MB | 4.8 MB | 0.96 | 4% |

### Processing Speed

| Profile | Image Size | Processing Time |
|---------|-----------|-----------------|
| Thumbnail | 5 MB | 200-300ms |
| Mobile | 5 MB | 300-500ms |
| Desktop | 5 MB | 400-700ms |
| Batch (10 images) | 50 MB | 3-5s |

### Storage Efficiency

```
Total Storage for 1000 Images (avg 3MB each):

Without Compression:
  Original: 3 GB
  Total: 3 GB

With Compression:
  Thumbnail: 45 MB
  Mobile: 110 MB
  Desktop: 280 MB
  Original: 2.88 GB
  Total: 3.315 GB (10% overhead for profiles)

Cache Efficiency:
  Memory Cache: 50 MB (hot images)
  IndexedDB: 50 MB (frequently accessed)
  Service Worker: 50 MB (network cache)
  Total Active Cache: 150 MB
```

---

## Implementation Roadmap

### Phase 1: Core Compression Engine
- [ ] Implement compression profiles
- [ ] Create quality level system
- [ ] Build format selection strategy
- [ ] Integrate with Sharp.js

### Phase 2: CLI Tool
- [ ] Create CLI command structure
- [ ] Implement compress command
- [ ] Implement batch command
- [ ] Add progress tracking

### Phase 3: Advanced Features
- [ ] Adaptive compression
- [ ] Profile creation UI
- [ ] Analysis and recommendations
- [ ] Configuration management

### Phase 4: Integration
- [ ] Integrate with CachedOptimizedImage
- [ ] Auto-profile selection
- [ ] Responsive image generation
- [ ] Cache optimization

### Phase 5: Monitoring & Analytics
- [ ] Compression metrics dashboard
- [ ] Performance monitoring
- [ ] Cache hit rate analysis
- [ ] Storage quota tracking

---

## Best Practices

### 1. Profile Selection
```typescript
// ✅ Good: Use appropriate profile for context
<CachedOptimizedImage
  src="/images/photo.jpg"
  compressionProfile="mobile"
  autoSelectProfile={true}
/>

// ❌ Avoid: Always using original
<CachedOptimizedImage
  src="/images/photo.jpg"
  compressionProfile="original"
/>
```

### 2. Batch Processing
```bash
# ✅ Good: Use batch with parallel processing
compress-cli batch ./images --profile mobile --parallel 4

# ❌ Avoid: Processing one at a time
for file in ./images/*; do
  compress-cli compress "$file" --profile mobile
done
```

### 3. Quality Selection
```typescript
// ✅ Good: Adaptive quality based on use case
const quality = isMobileDevice ? 70 : 80;

// ❌ Avoid: Fixed low quality for all
const quality = 50; // Too aggressive
```

### 4. Format Fallbacks
```typescript
// ✅ Good: Provide fallbacks
preferredFormats={['webp', 'jpeg']}

// ❌ Avoid: Single format without fallback
preferredFormats={['webp']}
```

### 5. Cache Management
```typescript
// ✅ Good: Cache compressed profiles
enableCache={true}
cacheTTL={7 * 24 * 60 * 60 * 1000}

// ❌ Avoid: Disabling cache
enableCache={false}
```

---

## Troubleshooting

### Quality Issues
- **Banding artifacts**: Increase quality by 5-10 points
- **Blurry images**: Use cubic or lanczos scaling algorithm
- **Color shifts**: Preserve ICC color profile

### Performance Issues
- **Slow compression**: Reduce parallel workers or use lower quality
- **High memory usage**: Process smaller batches
- **Timeout errors**: Increase timeout or reduce image size

### Compatibility Issues
- **WebP not supported**: Ensure JPEG fallback is provided
- **AVIF not supported**: Use WebP or JPEG fallback
- **Metadata loss**: Use conservative metadata strategy

---

## Related Documentation

- [Image Caching Layer](./IMAGE_CACHING.md)
- [Optimized Image Component](./OPTIMIZED_IMAGE.md)
- [Performance Optimization](./PERFORMANCE.md)
- [CLI Tool Guide](./CLI_TOOL_GUIDE.md)
