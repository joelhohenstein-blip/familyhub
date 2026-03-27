# Image Caching Layer Documentation

## Overview

The Image Caching Layer provides a comprehensive, multi-tier caching strategy for images in FamilyHub. It combines Service Worker caching, IndexedDB persistence, and in-memory caching to deliver optimal performance and offline capabilities.

## Architecture

### Three-Tier Caching Strategy

```
┌─────────────────────────────────────────────────────────┐
│                   Image Request                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │   Memory Cache (L1)    │ ◄─── Fastest, limited size
        │   (In-process Map)     │
        └────────────┬───────────┘
                     │ Miss
                     ▼
        ┌────────────────────────┐
        │  IndexedDB Cache (L2)  │ ◄─── Persistent, larger
        │  (50MB per origin)     │
        └────────────┬───────────┘
                     │ Miss
                     ▼
        ┌────────────────────────┐
        │ Service Worker (L3)    │ ◄─── Network interception
        │ (Cache API)            │
        └────────────┬───────────┘
                     │ Miss
                     ▼
        ┌────────────────────────┐
        │   Network Request      │
        │   (Fetch from server)  │
        └────────────────────────┘
```

### Components

#### 1. **ImageCacheManager** (`app/utils/imageCacheManager.ts`)
- Core caching logic
- Manages memory cache and IndexedDB
- Automatic cache cleanup and eviction
- Statistics tracking

#### 2. **Service Worker** (`public/sw.js`)
- Network request interception
- Cache-first strategy for images
- Automatic cache updates
- Message-based communication

#### 3. **useServiceWorkerCache Hook** (`app/hooks/useServiceWorkerCache.ts`)
- Service Worker registration
- Cache management from React components
- Statistics monitoring
- Prefetching capabilities

#### 4. **CachedOptimizedImage Component** (`app/components/CachedOptimizedImage.tsx`)
- Drop-in replacement for `<img>` tags
- Integrated caching
- Blur-up placeholders
- Skeleton loaders
- Error handling and retry

#### 5. **Cache Utilities** (`app/utils/cacheUtils.ts`)
- Helper functions for cache management
- Statistics formatting
- Health monitoring
- Storage quota estimation

## Configuration

### Default Cache Configuration

```typescript
{
  maxSize: 50 * 1024 * 1024,        // 50MB
  maxItems: 500,                     // Max 500 images
  ttl: 7 * 24 * 60 * 60 * 1000,     // 7 days
  compressionThreshold: 100 * 1024,  // 100KB
  enableIndexedDB: true,
  enableMemoryCache: true,
  enableServiceWorker: true,
}
```

### Custom Configuration

```typescript
import { getImageCacheManager } from '@/utils/imageCacheManager';

const cacheManager = getImageCacheManager({
  maxSize: 100 * 1024 * 1024,  // 100MB
  maxItems: 1000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
});
```

## Usage

### Basic Image Caching

```tsx
import { CachedOptimizedImage } from '@/components/CachedOptimizedImage';

export function PhotoGallery() {
  return (
    <CachedOptimizedImage
      src="/images/family-photo.jpg"
      alt="Family photo"
      width={800}
      height={600}
    />
  );
}
```

### With Blur-up Placeholder

```tsx
<CachedOptimizedImage
  src="/images/photo.jpg"
  alt="Photo"
  blurDataUrl="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  showSkeleton
  width={800}
  height={600}
/>
```

### With Prefetching

```tsx
<CachedOptimizedImage
  src="/images/current-photo.jpg"
  alt="Current photo"
  prefetchUrls={[
    '/images/next-photo.jpg',
    '/images/next-next-photo.jpg',
  ]}
  width={800}
  height={600}
/>
```

### Manual Cache Management

```tsx
import { useServiceWorkerCache } from '@/hooks/useServiceWorkerCache';

export function CacheManager() {
  const {
    isRegistered,
    stats,
    clearCache,
    getCacheStats,
    prefetchImages,
  } = useServiceWorkerCache();

  const handleClearCache = async () => {
    await clearCache();
    console.log('Cache cleared');
  };

  const handlePrefetch = async () => {
    await prefetchImages([
      '/images/photo1.jpg',
      '/images/photo2.jpg',
    ]);
  };

  return (
    <div>
      <p>Cache registered: {isRegistered ? 'Yes' : 'No'}</p>
      <p>Cache size: {stats.size} bytes</p>
      <p>Items: {stats.itemCount}</p>
      <button onClick={handleClearCache}>Clear Cache</button>
      <button onClick={handlePrefetch}>Prefetch Images</button>
    </div>
  );
}
```

### Cache Monitoring

```tsx
import { useCacheMonitor } from '@/hooks/useServiceWorkerCache';

export function CacheStats() {
  const stats = useCacheMonitor(5000); // Update every 5 seconds

  return (
    <div>
      <p>Size: {formatBytes(stats.size)}</p>
      <p>Items: {stats.itemCount}</p>
      <p>Hit Rate: {Math.round(stats.hitRate * 100)}%</p>
    </div>
  );
}
```

### Prefetching Images

```tsx
import { usePrefetchImages } from '@/hooks/useServiceWorkerCache';

export function ImageGallery() {
  const { isLoading, error } = usePrefetchImages([
    '/images/photo1.jpg',
    '/images/photo2.jpg',
    '/images/photo3.jpg',
  ]);

  if (isLoading) return <p>Prefetching images...</p>;
  if (error) return <p>Failed to prefetch: {error.message}</p>;

  return <div>Images prefetched!</div>;
}
```

## API Reference

### ImageCacheManager

#### Methods

```typescript
// Get image from cache
async get(url: string): Promise<Blob | null>

// Store image in cache
async set(url: string, blob: Blob, metadata?: Record<string, any>): Promise<void>

// Remove image from cache
async remove(url: string): Promise<void>

// Clear entire cache
async clear(): Promise<void>

// Get cache statistics
async getStats(): Promise<CacheStats>

// Prefetch multiple images
async prefetch(urls: string[]): Promise<void>

// Get cache size in bytes
async getCacheSize(): Promise<number>
```

### useServiceWorkerCache Hook

```typescript
const {
  // State
  isSupported: boolean,
  isRegistered: boolean,
  error: Error | null,
  stats: SWCacheStats,

  // Methods
  register: () => Promise<ServiceWorkerRegistration | undefined>,
  unregister: () => Promise<void>,
  clearCache: () => Promise<boolean>,
  getCacheStats: () => Promise<SWCacheStats>,
  prefetchImages: (urls: string[]) => Promise<boolean>,
  update: () => Promise<void>,
} = useServiceWorkerCache(enabled?: boolean);
```

### useCacheMonitor Hook

```typescript
const stats: SWCacheStats = useCacheMonitor(interval?: number);
```

### usePrefetchImages Hook

```typescript
const { isLoading, error } = usePrefetchImages(
  urls: string[],
  enabled?: boolean
);
```

### Cache Utilities

```typescript
// Format bytes to human-readable size
formatBytes(bytes: number, decimals?: number): string

// Format timestamp to readable date
formatDate(timestamp: number): string

// Calculate cache hit rate percentage
calculateHitRate(stats: CacheStats): number

// Get cache health status
getCacheHealth(stats: CacheStats): 'good' | 'warning' | 'critical'

// Clear all caches
async clearAllCaches(): Promise<void>

// Get total cache size
async getTotalCacheSize(): Promise<number>

// Get cache statistics
async getCacheStatistics(): Promise<CacheStats>

// Estimate cache efficiency
async estimateCacheEfficiency(): Promise<{
  efficiency: number;
  recommendation: string;
}>

// Estimate storage quota usage
async estimateStorageQuota(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
}>

// Request persistent storage
async requestPersistentStorage(): Promise<boolean>

// Check if storage is persistent
async isStoragePersistent(): Promise<boolean>
```

## Performance Characteristics

### Cache Hit Rates

| Scenario | Expected Hit Rate |
|----------|-------------------|
| Repeated image loads | 95%+ |
| Gallery navigation | 80-90% |
| First visit | 0% (cold cache) |
| After prefetch | 90%+ |

### Storage Capacity

| Storage Type | Capacity | Persistence |
|--------------|----------|-------------|
| Memory Cache | ~10-50MB | Session only |
| IndexedDB | 50MB+ | Persistent |
| Service Worker | 50MB+ | Persistent |
| **Total** | **150MB+** | **Persistent** |

### Load Time Improvements

| Scenario | Without Cache | With Cache |
|----------|---------------|-----------|
| Cached image | 200-500ms | 10-50ms |
| Prefetched image | 200-500ms | 5-20ms |
| Network request | 200-500ms | 200-500ms |

## Best Practices

### 1. Use CachedOptimizedImage for All Images

```tsx
// ✅ Good
<CachedOptimizedImage src="/images/photo.jpg" alt="Photo" />

// ❌ Avoid
<img src="/images/photo.jpg" alt="Photo" />
```

### 2. Prefetch Related Images

```tsx
// Prefetch next images in gallery
<CachedOptimizedImage
  src="/images/current.jpg"
  alt="Current"
  prefetchUrls={[
    '/images/next.jpg',
    '/images/next-next.jpg',
  ]}
/>
```

### 3. Use Blur-up Placeholders

```tsx
// Provides better perceived performance
<CachedOptimizedImage
  src="/images/photo.jpg"
  alt="Photo"
  blurDataUrl="data:image/jpeg;base64,..."
  showSkeleton
/>
```

### 4. Monitor Cache Health

```tsx
// Periodically check cache efficiency
const efficiency = await estimateCacheEfficiency();
if (efficiency.efficiency < 50) {
  console.warn('Cache hit rate is low');
}
```

### 5. Request Persistent Storage

```tsx
// Ensure cache persists across browser restarts
const isPersistent = await requestPersistentStorage();
if (isPersistent) {
  console.log('Storage is persistent');
}
```

### 6. Set Appropriate Cache TTL

```typescript
// For frequently updated images
const cacheManager = getImageCacheManager({
  ttl: 24 * 60 * 60 * 1000, // 1 day
});

// For static images
const cacheManager = getImageCacheManager({
  ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
});
```

### 7. Handle Cache Cleanup

```tsx
// Manually cleanup when needed
const handleClearCache = async () => {
  await clearAllCaches();
  // Reload images
  window.location.reload();
};
```

## Troubleshooting

### Service Worker Not Registering

```typescript
// Check browser support
if ('serviceWorker' in navigator) {
  // Service Worker is supported
}

// Check registration
const { isSupported, isRegistered } = useServiceWorkerCache();
console.log('Supported:', isSupported, 'Registered:', isRegistered);
```

### Cache Not Persisting

```typescript
// Check persistent storage
const isPersistent = await isStoragePersistent();
if (!isPersistent) {
  // Request persistent storage
  await requestPersistentStorage();
}
```

### High Memory Usage

```typescript
// Reduce cache size
const cacheManager = getImageCacheManager({
  maxSize: 25 * 1024 * 1024, // 25MB instead of 50MB
  maxItems: 250, // 250 items instead of 500
});
```

### Cache Not Clearing

```typescript
// Clear all caches including Service Worker
await clearAllCaches();

// Unregister Service Worker if needed
const { unregister } = useServiceWorkerCache();
await unregister();
```

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Service Worker | ✅ 40+ | ✅ 44+ | ✅ 11.1+ | ✅ 17+ |
| IndexedDB | ✅ 24+ | ✅ 16+ | ✅ 10+ | ✅ 12+ |
| Cache API | ✅ 43+ | ✅ 39+ | ✅ 11.1+ | ✅ 15+ |
| Blob URLs | ✅ All | ✅ All | ✅ All | ✅ All |

## Performance Monitoring

### Enable Performance Tracking

```typescript
// Track cache performance
const stats = await getCacheStatistics();
console.log('Hit Rate:', calculateHitRate(stats));
console.log('Cache Size:', formatBytes(stats.totalSize));
console.log('Items:', stats.itemCount);
```

### Monitor Storage Quota

```typescript
// Check storage usage
const quota = await estimateStorageQuota();
console.log('Usage:', formatBytes(quota.usage));
console.log('Quota:', formatBytes(quota.quota));
console.log('Percentage:', quota.percentage + '%');
```

## Security Considerations

1. **HTTPS Only**: Service Workers only work over HTTPS (except localhost)
2. **Same-Origin Policy**: Can only cache images from the same origin
3. **Cache Isolation**: Each origin has its own cache storage
4. **User Control**: Users can clear cache through browser settings

## Future Enhancements

- [ ] Compression for cached images
- [ ] Automatic image format conversion
- [ ] Advanced cache invalidation strategies
- [ ] Cache analytics dashboard
- [ ] Bandwidth-aware caching
- [ ] Offline image gallery mode

## Related Documentation

- [OptimizedImage Component](./OPTIMIZED_IMAGE.md)
- [Image Compression](./IMAGE_COMPRESSION.md)
- [Performance Optimization](./PERFORMANCE.md)
