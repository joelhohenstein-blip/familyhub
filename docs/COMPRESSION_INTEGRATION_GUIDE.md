# Image Compression Integration Guide

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Integration Points](#integration-points)
4. [Code Examples](#code-examples)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)
7. [Implementation Checklist](#implementation-checklist)

---

## Overview

This guide explains how to integrate the image compression architecture with the existing caching system. The compression system works seamlessly with:

- **CachedOptimizedImage** component - Renders compressed images with automatic format selection
- **ImageCacheManager** - Manages compression cache and retrieval
- **useServiceWorkerCache** hook - Handles Service Worker integration
- **Service Worker (sw.js)** - Caches compressed variants at the network level

### Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│  React Components (CachedOptimizedImage)                │
│  - Selects compression profile based on context         │
│  - Renders appropriate image variant                    │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│  Compression System (compressionProfiles.ts)            │
│  - Profile selection (thumbnail, mobile, desktop, etc)  │
│  - Quality preset management                            │
│  - Metric calculations                                  │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│  Cache Management (ImageCacheManager)                   │
│  - Stores compressed variants                           │
│  - Retrieves cached images                              │
│  - Manages cache lifecycle                              │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│  Service Worker (sw.js)                                 │
│  - Network-level caching                                │
│  - Offline support                                      │
│  - Cache invalidation                                   │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Basic Image Compression in a Component

```typescript
import { CachedOptimizedImage } from '@/components/CachedOptimizedImage';
import { getCompressionProfile } from '@/config/compressionProfiles';

export function ProductCard({ imageUrl, isMobile }: Props) {
  // Select profile based on context
  const profile = isMobile 
    ? getCompressionProfile('mobile')
    : getCompressionProfile('desktop');

  return (
    <CachedOptimizedImage
      src={imageUrl}
      alt="Product"
      profile={profile}
      width={profile.maxWidth}
      height={profile.maxHeight}
      priority={false}
    />
  );
}
```

### 2. Using Quality Presets

```typescript
import { getQualityPreset } from '@/config/compressionProfiles';

// Get a specific quality level
const highQuality = getQualityPreset('high');
const lowQuality = getQualityPreset('low');

// Use in compression
const compressed = await compressImage(imageBuffer, {
  quality: highQuality.jpegQuality,
  webpQuality: highQuality.webpQuality,
});
```

### 3. Batch Processing with Profiles

```typescript
import { getAllCompressionProfiles } from '@/config/compressionProfiles';

async function generateAllVariants(imageUrl: string) {
  const profiles = getAllCompressionProfiles();
  
  for (const profile of profiles) {
    await cacheManager.compressAndCache(imageUrl, profile);
  }
}
```

---

## Integration Points

### 1. CachedOptimizedImage Component Integration

**Location:** `app/components/CachedOptimizedImage.tsx`

The component automatically handles compression profile selection and caching:

```typescript
interface CachedOptimizedImageProps {
  src: string;
  alt: string;
  profile?: CompressionProfile;  // Optional - auto-selects if not provided
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}
```

**Integration Pattern:**

```typescript
import { CachedOptimizedImage } from '@/components/CachedOptimizedImage';
import { CompressionProfile } from '@/types/compression';

interface ImageGalleryProps {
  images: string[];
  profile?: CompressionProfile;
}

export function ImageGallery({ images, profile }: ImageGalleryProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {images.map((src) => (
        <CachedOptimizedImage
          key={src}
          src={src}
          alt="Gallery item"
          profile={profile}
          className="rounded-lg"
        />
      ))}
    </div>
  );
}
```

**Key Features:**
- Automatic format selection (WebP with JPEG fallback)
- Responsive image sizing
- Service Worker integration
- Cache-aware rendering

---

### 2. ImageCacheManager Integration

**Location:** `app/utils/imageCacheManager.ts`

The cache manager handles compression and storage:

```typescript
import { imageCacheManager } from '@/utils/imageCacheManager';
import { getCompressionProfile } from '@/config/compressionProfiles';

// Compress and cache an image
async function cacheProductImage(imageUrl: string) {
  const profile = getCompressionProfile('mobile');
  
  const result = await imageCacheManager.compressAndCache(
    imageUrl,
    profile
  );
  
  return result; // { success: boolean, cacheKey: string, size: number }
}

// Retrieve cached image
async function getProductImage(imageUrl: string) {
  const cachedImage = await imageCacheManager.getCachedImage(imageUrl);
  
  if (cachedImage) {
    return cachedImage; // { data: Blob, format: 'webp' | 'jpeg', size: number }
  }
  
  // Fallback to original
  return fetch(imageUrl).then(r => r.blob());
}

// Batch cache multiple images
async function cacheProductImages(imageUrls: string[]) {
  const profile = getCompressionProfile('thumbnail');
  
  const results = await Promise.all(
    imageUrls.map(url => 
      imageCacheManager.compressAndCache(url, profile)
    )
  );
  
  return results;
}
```

**Cache Manager Methods:**

```typescript
// Core methods
compressAndCache(imageUrl: string, profile: CompressionProfile): Promise<CacheResult>
getCachedImage(imageUrl: string): Promise<CachedImage | null>
invalidateCache(imageUrl: string): Promise<void>
clearCache(): Promise<void>

// Utility methods
getCacheSize(): Promise<number>
getCacheStats(): Promise<CacheStats>
```

---

### 3. Service Worker Integration

**Location:** `public/sw.js`

The Service Worker caches compressed images at the network level:

```typescript
// In your component or utility
import { useServiceWorkerCache } from '@/hooks/useServiceWorkerCache';

export function ImageComponent({ imageUrl }: Props) {
  const { 
    cachedUrl, 
    isLoading, 
    error 
  } = useServiceWorkerCache(imageUrl);

  return (
    <img 
      src={cachedUrl || imageUrl} 
      alt="Cached image"
      loading="lazy"
    />
  );
}
```

**Service Worker Cache Strategy:**

```javascript
// The Service Worker implements a cache-first strategy:
// 1. Check Service Worker cache
// 2. If not found, fetch from network
// 3. Cache the response
// 4. Return to client

// Cache invalidation happens when:
// - Cache exceeds size limit (50MB default)
// - Cache entries exceed TTL (7 days default)
// - Manual invalidation via imageCacheManager
```

**Registering the Service Worker:**

```typescript
// In your app initialization
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('Service Worker registered:', registration);
    })
    .catch(error => {
      console.error('Service Worker registration failed:', error);
    });
}
```

---

### 4. Compression Profile Selection

**Location:** `app/config/compressionProfiles.ts`

Choose the right profile for your use case:

```typescript
import { 
  getCompressionProfile,
  selectProfileByContext,
  getQualityPreset 
} from '@/config/compressionProfiles';

// Direct profile selection
const thumbnailProfile = getCompressionProfile('thumbnail');
const mobileProfile = getCompressionProfile('mobile');
const desktopProfile = getCompressionProfile('desktop');
const originalProfile = getCompressionProfile('original');

// Context-aware selection
const profile = selectProfileByContext({
  context: 'mobile',
  quality: 'medium',
  useCase: 'thumbnail'
});

// Quality preset selection
const qualityPreset = getQualityPreset('high');
// Returns: { jpegQuality: 85, webpQuality: 80, estimatedSize: '150KB' }
```

**Profile Specifications:**

| Profile | Max Width | Max Height | Use Case | Target Size |
|---------|-----------|-----------|----------|------------|
| thumbnail | 200px | 200px | Thumbnails, avatars | 20-50KB |
| mobile | 600px | 800px | Mobile devices | 100-200KB |
| desktop | 1200px | 1600px | Desktop displays | 300-500KB |
| original | unlimited | unlimited | Full quality | varies |

---

## Code Examples

### Example 1: Product Listing with Responsive Images

```typescript
import { CachedOptimizedImage } from '@/components/CachedOptimizedImage';
import { getCompressionProfile } from '@/config/compressionProfiles';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface Product {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
}

interface ProductListProps {
  products: Product[];
}

export function ProductList({ products }: ProductListProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Select profile based on device
  const profile = isMobile 
    ? getCompressionProfile('mobile')
    : getCompressionProfile('desktop');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {products.map((product) => (
        <div key={product.id} className="card">
          <CachedOptimizedImage
            src={product.imageUrl}
            alt={product.name}
            profile={profile}
            width={profile.maxWidth}
            height={profile.maxHeight}
            className="w-full h-auto rounded-lg"
            priority={false}
          />
          <h3 className="mt-4 font-semibold">{product.name}</h3>
          <p className="text-lg font-bold">${product.price}</p>
        </div>
      ))}
    </div>
  );
}
```

### Example 2: Image Gallery with Lazy Loading

```typescript
import { CachedOptimizedImage } from '@/components/CachedOptimizedImage';
import { getCompressionProfile } from '@/config/compressionProfiles';
import { useState } from 'react';

interface ImageGalleryProps {
  images: string[];
  title: string;
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const thumbnailProfile = getCompressionProfile('thumbnail');
  const desktopProfile = getCompressionProfile('desktop');

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{title}</h2>
      
      {/* Main image */}
      <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden">
        <CachedOptimizedImage
          src={images[selectedIndex]}
          alt={`${title} - Image ${selectedIndex + 1}`}
          profile={desktopProfile}
          width={desktopProfile.maxWidth}
          height={desktopProfile.maxHeight}
          priority={selectedIndex === 0}
          className="w-full h-auto"
        />
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
              index === selectedIndex 
                ? 'border-blue-500' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <CachedOptimizedImage
              src={image}
              alt={`Thumbnail ${index + 1}`}
              profile={thumbnailProfile}
              width={thumbnailProfile.maxWidth}
              height={thumbnailProfile.maxHeight}
              priority={false}
              className="w-20 h-20 object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Example 3: Batch Image Processing

```typescript
import { imageCacheManager } from '@/utils/imageCacheManager';
import { getAllCompressionProfiles } from '@/config/compressionProfiles';

interface BatchProcessResult {
  imageUrl: string;
  profiles: {
    [profileName: string]: {
      success: boolean;
      size: number;
      cacheKey: string;
    };
  };
}

export async function batchProcessImages(
  imageUrls: string[]
): Promise<BatchProcessResult[]> {
  const profiles = getAllCompressionProfiles();
  const results: BatchProcessResult[] = [];

  for (const imageUrl of imageUrls) {
    const profileResults: Record<string, any> = {};

    for (const profile of profiles) {
      try {
        const result = await imageCacheManager.compressAndCache(
          imageUrl,
          profile
        );
        
        profileResults[profile.name] = {
          success: result.success,
          size: result.size,
          cacheKey: result.cacheKey,
        };
      } catch (error) {
        profileResults[profile.name] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    results.push({
      imageUrl,
      profiles: profileResults,
    });
  }

  return results;
}
```

### Example 4: Service Worker Cache Management

```typescript
import { useServiceWorkerCache } from '@/hooks/useServiceWorkerCache';
import { useEffect, useState } from 'react';

interface CacheStats {
  totalSize: number;
  itemCount: number;
  oldestEntry: Date | null;
}

export function CacheManagementPanel() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const { cachedUrl } = useServiceWorkerCache('');

  useEffect(() => {
    // Get cache statistics
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'GET_CACHE_STATS',
      });

      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'CACHE_STATS') {
          setStats(event.data.stats);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  const handleClearCache = async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_CACHE',
      });
      setStats(null);
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-4">Cache Management</h3>
      
      {stats && (
        <div className="space-y-2 mb-4">
          <p>Total Size: {(stats.totalSize / 1024 / 1024).toFixed(2)} MB</p>
          <p>Items: {stats.itemCount}</p>
          {stats.oldestEntry && (
            <p>Oldest Entry: {new Date(stats.oldestEntry).toLocaleDateString()}</p>
          )}
        </div>
      )}

      <button
        onClick={handleClearCache}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Clear Cache
      </button>
    </div>
  );
}
```

### Example 5: Dynamic Quality Selection

```typescript
import { CachedOptimizedImage } from '@/components/CachedOptimizedImage';
import { selectProfileByContext } from '@/config/compressionProfiles';
import { useState } from 'react';

interface DynamicImageProps {
  imageUrl: string;
  alt: string;
}

export function DynamicImage({ imageUrl, alt }: DynamicImageProps) {
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [context, setContext] = useState<'thumbnail' | 'mobile' | 'desktop'>('desktop');

  const profile = selectProfileByContext({
    context,
    quality,
    useCase: 'general',
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Quality</label>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value as any)}
            className="border rounded px-3 py-2"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Context</label>
          <select
            value={context}
            onChange={(e) => setContext(e.target.value as any)}
            className="border rounded px-3 py-2"
          >
            <option value="thumbnail">Thumbnail</option>
            <option value="mobile">Mobile</option>
            <option value="desktop">Desktop</option>
          </select>
        </div>
      </div>

      <CachedOptimizedImage
        src={imageUrl}
        alt={alt}
        profile={profile}
        width={profile.maxWidth}
        height={profile.maxHeight}
        className="w-full h-auto rounded-lg"
      />

      <div className="text-sm text-gray-600">
        <p>Profile: {profile.name}</p>
        <p>Max Size: {profile.maxWidth}x{profile.maxHeight}px</p>
        <p>Target: {profile.targetFileSize}</p>
      </div>
    </div>
  );
}
```

---

## Best Practices

### 1. Profile Selection Strategy

```typescript
// ✅ DO: Select profile based on context
const profile = isMobile 
  ? getCompressionProfile('mobile')
  : getCompressionProfile('desktop');

// ❌ DON'T: Always use the same profile
const profile = getCompressionProfile('desktop'); // Wrong for mobile
```

### 2. Lazy Loading

```typescript
// ✅ DO: Use lazy loading for non-critical images
<CachedOptimizedImage
  src={imageUrl}
  alt="Product"
  priority={false}  // Lazy load
/>

// ❌ DON'T: Mark all images as priority
<CachedOptimizedImage
  src={imageUrl}
  alt="Product"
  priority={true}  // Only for above-the-fold
/>
```

### 3. Error Handling

```typescript
// ✅ DO: Handle image load errors gracefully
<CachedOptimizedImage
  src={imageUrl}
  alt="Product"
  onError={() => {
    console.error('Image failed to load');
    // Show fallback or retry
  }}
/>

// ❌ DON'T: Ignore load errors
<CachedOptimizedImage src={imageUrl} alt="Product" />
```

### 4. Cache Management

```typescript
// ✅ DO: Monitor cache size and clear periodically
const stats = await imageCacheManager.getCacheStats();
if (stats.totalSize > 100 * 1024 * 1024) { // 100MB
  await imageCacheManager.clearCache();
}

// ❌ DON'T: Let cache grow unbounded
// Cache will eventually consume all available storage
```

### 5. Batch Operations

```typescript
// ✅ DO: Use Promise.all for parallel operations
const results = await Promise.all(
  imageUrls.map(url => 
    imageCacheManager.compressAndCache(url, profile)
  )
);

// ❌ DON'T: Process sequentially when parallel is possible
for (const url of imageUrls) {
  await imageCacheManager.compressAndCache(url, profile);
}
```

---

## Troubleshooting

### Issue: Images Not Caching

**Symptoms:** Images are re-downloaded on every page load

**Solutions:**
1. Check Service Worker registration:
   ```typescript
   navigator.serviceWorker.getRegistrations()
     .then(registrations => console.log(registrations));
   ```

2. Verify cache storage is available:
   ```typescript
   if ('storage' in navigator && 'estimate' in navigator.storage) {
     const estimate = await navigator.storage.estimate();
     console.log(`Available: ${estimate.quota}, Used: ${estimate.usage}`);
   }
   ```

3. Check browser DevTools → Application → Cache Storage

### Issue: Large Cache Size

**Symptoms:** Cache grows beyond expected size

**Solutions:**
1. Implement cache size monitoring:
   ```typescript
   const stats = await imageCacheManager.getCacheStats();
   console.log(`Cache size: ${stats.totalSize / 1024 / 1024}MB`);
   ```

2. Clear old entries:
   ```typescript
   await imageCacheManager.clearCache();
   ```

3. Adjust cache limits in `imageCacheManager.ts`:
   ```typescript
   const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
   const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
   ```

### Issue: WebP Not Supported

**Symptoms:** Images not loading in older browsers

**Solutions:**
1. The system automatically falls back to JPEG
2. Verify fallback in `CachedOptimizedImage.tsx`:
   ```typescript
   // Component handles format selection automatically
   // WebP with JPEG fallback
   ```

3. Test browser support:
   ```typescript
   const supportsWebP = () => {
     const canvas = document.createElement('canvas');
     return canvas.toDataURL('image/webp').indexOf('image/webp') === 0;
   };
   ```

### Issue: Service Worker Not Updating

**Symptoms:** Old cached images still showing after update

**Solutions:**
1. Force Service Worker update:
   ```typescript
   navigator.serviceWorker.getRegistrations()
     .then(registrations => {
       registrations.forEach(reg => reg.unregister());
     });
   ```

2. Clear browser cache and reload
3. Check Service Worker version in `public/sw.js`

---

## Implementation Checklist

### Phase 1: Setup (Day 1)

- [ ] Review compression architecture documentation
- [ ] Understand compression profiles and quality presets
- [ ] Review existing caching system (ImageCacheManager, CachedOptimizedImage)
- [ ] Verify Service Worker is registered in your app

### Phase 2: Basic Integration (Days 2-3)

- [ ] Import `CachedOptimizedImage` in first component
- [ ] Import `getCompressionProfile` from config
- [ ] Replace one image component with `CachedOptimizedImage`
- [ ] Test image loads and caches correctly
- [ ] Verify in DevTools → Application → Cache Storage

### Phase 3: Responsive Images (Days 4-5)

- [ ] Implement device detection (mobile vs desktop)
- [ ] Select appropriate profile based on device
- [ ] Test on mobile and desktop viewports
- [ ] Verify correct profile is used for each device

### Phase 4: Batch Processing (Days 6-7)

- [ ] Identify image-heavy pages (galleries, product lists)
- [ ] Implement batch caching for these pages
- [ ] Monitor cache size and performance
- [ ] Implement cache cleanup if needed

### Phase 5: Optimization (Days 8-9)

- [ ] Monitor cache hit rates
- [ ] Adjust quality presets based on metrics
- [ ] Implement cache statistics dashboard
- [ ] Fine-tune profile selection logic

### Phase 6: Testing & Deployment (Days 10-11)

- [ ] Test on various devices and browsers
- [ ] Test offline functionality
- [ ] Verify cache invalidation works
- [ ] Deploy to production
- [ ] Monitor cache performance in production

### Phase 7: Monitoring (Ongoing)

- [ ] Track cache hit rates
- [ ] Monitor cache size
- [ ] Collect user feedback on image quality
- [ ] Adjust profiles based on real-world usage

---

## Performance Metrics

### Expected Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|------------|
| Initial Load | 2.5s | 1.2s | 52% faster |
| Repeat Load | 2.5s | 0.3s | 88% faster |
| Cache Hit Rate | 0% | 85%+ | Significant |
| Bandwidth | 100% | 30-40% | 60-70% reduction |
| Mobile Load | 4.2s | 1.8s | 57% faster |

### Monitoring Implementation

```typescript
// Track cache performance
interface CacheMetrics {
  hitRate: number;
  missRate: number;
  averageLoadTime: number;
  totalBandwidthSaved: number;
}

export async function trackCacheMetrics(): Promise<CacheMetrics> {
  const stats = await imageCacheManager.getCacheStats();
  
  return {
    hitRate: stats.hitCount / (stats.hitCount + stats.missCount),
    missRate: stats.missCount / (stats.hitCount + stats.missCount),
    averageLoadTime: stats.totalLoadTime / stats.requestCount,
    totalBandwidthSaved: stats.originalSize - stats.compressedSize,
  };
}
```

---

## Next Steps

1. **Start with Phase 1**: Review documentation and understand the architecture
2. **Implement Phase 2**: Get one component working with compression
3. **Expand gradually**: Add more components and features
4. **Monitor and optimize**: Track metrics and adjust as needed
5. **Share learnings**: Document any custom patterns or optimizations

For questions or issues, refer to:
- `docs/COMPRESSION_ARCHITECTURE.md` - Detailed architecture
- `docs/CLI_TOOL_GUIDE.md` - CLI tool documentation
- `app/types/compression.ts` - Type definitions
- `app/config/compressionProfiles.ts` - Profile configuration

---

## Support Resources

### Documentation Files
- **COMPRESSION_ARCHITECTURE.md** - Complete architecture overview
- **CLI_TOOL_GUIDE.md** - Command-line tool usage
- **IMAGE_CACHING.md** - Caching system details
- **COMPRESSION_IMPLEMENTATION_SUMMARY.md** - Quick reference

### Code Files
- **app/components/CachedOptimizedImage.tsx** - Image component
- **app/utils/imageCacheManager.ts** - Cache management
- **app/hooks/useServiceWorkerCache.ts** - Service Worker hook
- **app/config/compressionProfiles.ts** - Profile configuration
- **public/sw.js** - Service Worker implementation

### External Resources
- [WebP Format](https://developers.google.com/speed/webp)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [Image Optimization](https://web.dev/image-optimization/)
