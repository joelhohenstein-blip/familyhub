# Advanced Image Optimization Guide

This guide covers the advanced features added to the OptimizedImage component in Phase 2 of FamilyHub's image optimization.

## Table of Contents

1. [Overview](#overview)
2. [Advanced Features](#advanced-features)
3. [Component Props](#component-props)
4. [Hooks](#hooks)
5. [Utilities](#utilities)
6. [Usage Examples](#usage-examples)
7. [Performance Tips](#performance-tips)

## Overview

The enhanced OptimizedImage component provides production-grade image optimization with:

- **Blur-up/LQIP** - Low Quality Image Placeholder for smooth loading
- **Skeleton Loading** - Visual feedback during image load
- **Error Handling** - Graceful fallbacks with automatic retry
- **Network-Aware Loading** - Adapt to connection speed
- **Format Support Caching** - Avoid repeated detection
- **Performance Monitoring** - Track load times and errors

## Advanced Features

### 1. Blur-up / LQIP (Low Quality Image Placeholder)

Show a blurred version of the image while the full-quality version loads.

```tsx
<OptimizedImage
  src="/image.jpg"
  alt="Product"
  blurDataUrl="data:image/jpeg;base64,..." // Low-quality placeholder
/>
```

**Benefits:**
- Perceived faster loading
- Better visual experience
- Reduces layout shift

### 2. Skeleton Loading

Display an animated skeleton loader while the image loads.

```tsx
<OptimizedImage
  src="/image.jpg"
  alt="Product"
  showSkeleton={true}
  placeholderColor="#e0e0e0"
/>
```

**Features:**
- Shimmer animation
- Customizable placeholder color
- Automatic cleanup on load

### 3. Error Handling & Retry

Automatically retry failed image loads with exponential backoff.

```tsx
<OptimizedImage
  src="/image.jpg"
  alt="Product"
  enableRetry={true}
  maxRetries={3}
  showErrorFallback={true}
  errorFallback={<CustomErrorUI />}
/>
```

**Retry Strategy:**
- Exponential backoff: 1s, 2s, 4s
- Configurable max attempts
- Custom error UI support

### 4. Network-Aware Loading

Adapt image quality based on connection speed.

```tsx
<OptimizedImage
  src="/image.jpg"
  alt="Product"
  networkAware={true}
/>
```

**Behavior:**
- Detects 4G, 3G, 2G connections
- Skips AVIF on slow networks
- Listens for connection changes
- Caches detection results

### 5. Priority Hints

Control image loading priority for performance optimization.

```tsx
<OptimizedImage
  src="/hero.jpg"
  alt="Hero"
  priority="high"  // Loads immediately
/>

<OptimizedImage
  src="/thumbnail.jpg"
  alt="Thumbnail"
  priority="low"   // Deferred loading
/>
```

## Component Props

### New Props (Phase 2)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `blurDataUrl` | `string` | - | Low-quality image placeholder (data URL) |
| `showSkeleton` | `boolean` | `false` | Show animated skeleton loader |
| `showErrorFallback` | `boolean` | `true` | Show error fallback UI |
| `errorFallback` | `ReactNode` | - | Custom error fallback component |
| `enableRetry` | `boolean` | `true` | Retry failed image loads |
| `maxRetries` | `number` | `3` | Maximum retry attempts |
| `networkAware` | `boolean` | `false` | Adapt to connection speed |
| `priority` | `'high' \| 'low' \| 'auto'` | `'auto'` | Loading priority hint |

### Existing Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | - | Image source URL (required) |
| `alt` | `string` | - | Alt text (required) |
| `srcset` | `string` | - | Responsive srcset for JPEG |
| `srcsetWebp` | `string` | - | Responsive srcset for WebP |
| `srcsetAvif` | `string` | - | Responsive srcset for AVIF |
| `sizes` | `string` | - | Responsive sizes attribute |
| `width` | `number` | - | Image width |
| `height` | `number` | - | Image height |
| `className` | `string` | - | CSS class name |
| `loading` | `'lazy' \| 'eager'` | `'lazy'` | Loading strategy |
| `onLoad` | `() => void` | - | Load callback |
| `onError` | `() => void` | - | Error callback |
| `useIntersectionObserver` | `boolean` | `true` | Use lazy loading |
| `rootMargin` | `string` | `'50px'` | Intersection observer margin |
| `enableMonitoring` | `boolean` | `true` | Enable performance monitoring |
| `placeholderColor` | `string` | `'#f0f0f0'` | Placeholder background color |
| `aspectRatio` | `string` | - | Aspect ratio (e.g., '16/9') |

## Hooks

### useOptimizedImage

Provides optimized image configuration with format detection and network awareness.

```tsx
import { useOptimizedImage } from '~/hooks/useOptimizedImage';

function MyComponent() {
  const { imageProps, isSlowNetwork, supportsAvif } = useOptimizedImage({
    networkAware: true,
    showSkeleton: true,
  });

  return (
    <OptimizedImage
      src="/image.jpg"
      alt="Product"
      {...imageProps}
    />
  );
}
```

**Returns:**
- `imageProps` - Props to spread on OptimizedImage
- `effectiveConnection` - Current connection type
- `supportsAvif` - AVIF format support
- `supportsWebp` - WebP format support
- `isSlowNetwork` - Whether on slow connection

### useBlurPlaceholder

Generate blur-up placeholder from image URL.

```tsx
import { useBlurPlaceholder } from '~/hooks/useOptimizedImage';

function MyComponent() {
  const [blurUrl, setBlurUrl] = useState<string>();

  useEffect(() => {
    useBlurPlaceholder('/image.jpg').then(setBlurUrl);
  }, []);

  return (
    <OptimizedImage
      src="/image.jpg"
      alt="Product"
      blurDataUrl={blurUrl}
    />
  );
}
```

### usePreloadImages

Preload multiple images for better perceived performance.

```tsx
import { usePreloadImages } from '~/hooks/useOptimizedImage';

function Gallery() {
  const { isLoading, error } = usePreloadImages([
    '/img1.jpg',
    '/img2.jpg',
    '/img3.jpg',
  ]);

  if (isLoading) return <div>Preloading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>Gallery ready!</div>;
}
```

## Utilities

### imageMetadataCache

Caches format support detection and network info to avoid repeated checks.

```tsx
import {
  getImageMetadata,
  detectFormatSupport,
  detectNetworkConnection,
  onNetworkChange,
} from '~/utils/imageMetadataCache';

// Get cached metadata
const metadata = getImageMetadata();
console.log(metadata.supportsAvif); // true/false

// Detect format support
const { supportsWebp } = detectFormatSupport();

// Detect network
const connection = detectNetworkConnection(); // '4g' | '3g' | '2g'

// Listen for changes
const cleanup = onNetworkChange((connection) => {
  console.log('Network changed to:', connection);
});
```

## Usage Examples

### Example 1: Hero Image with Blur-up

```tsx
import { OptimizedImage } from '~/components/OptimizedImage';

export function HeroSection() {
  return (
    <OptimizedImage
      src="/hero.jpg"
      alt="Hero banner"
      width={1920}
      height={1080}
      aspectRatio="16/9"
      priority="high"
      blurDataUrl="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
      loading="eager"
      sizes="100vw"
    />
  );
}
```

### Example 2: Product Gallery with Skeleton

```tsx
import { OptimizedImage } from '~/components/OptimizedImage';

export function ProductGallery() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {products.map((product) => (
        <OptimizedImage
          key={product.id}
          src={product.image}
          alt={product.name}
          width={400}
          height={400}
          aspectRatio="1/1"
          showSkeleton={true}
          placeholderColor="#f3f4f6"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      ))}
    </div>
  );
}
```

### Example 3: Network-Aware Image

```tsx
import { useOptimizedImage } from '~/hooks/useOptimizedImage';
import { OptimizedImage } from '~/components/OptimizedImage';

export function SmartImage() {
  const { imageProps, isSlowNetwork } = useOptimizedImage({
    networkAware: true,
    showSkeleton: true,
  });

  return (
    <div>
      <OptimizedImage
        src={isSlowNetwork ? '/image-small.jpg' : '/image.jpg'}
        alt="Product"
        {...imageProps}
      />
      {isSlowNetwork && <p>Loading on slow network...</p>}
    </div>
  );
}
```

### Example 4: Error Handling

```tsx
import { OptimizedImage } from '~/components/OptimizedImage';

function ErrorFallback() {
  return (
    <div className="bg-gray-100 flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-gray-600">Image failed to load</p>
        <button className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
          Retry
        </button>
      </div>
    </div>
  );
}

export function ImageWithErrorHandling() {
  return (
    <OptimizedImage
      src="/image.jpg"
      alt="Product"
      enableRetry={true}
      maxRetries={5}
      showErrorFallback={true}
      errorFallback={<ErrorFallback />}
    />
  );
}
```

## Performance Tips

### 1. Use Priority Hints

```tsx
// Hero images - load immediately
<OptimizedImage src="/hero.jpg" priority="high" loading="eager" />

// Below-the-fold images - defer loading
<OptimizedImage src="/thumbnail.jpg" priority="low" />
```

### 2. Provide Blur Placeholders

```tsx
// Generates perceived faster loading
<OptimizedImage
  src="/image.jpg"
  blurDataUrl="data:image/jpeg;base64,..."
  showSkeleton={true}
/>
```

### 3. Use Responsive Sizes

```tsx
<OptimizedImage
  src="/image.jpg"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px"
  srcset="..."
  srcsetWebp="..."
  srcsetAvif="..."
/>
```

### 4. Enable Network-Aware Loading

```tsx
// Automatically adapts to slow networks
<OptimizedImage
  src="/image.jpg"
  networkAware={true}
/>
```

### 5. Preload Critical Images

```tsx
import { usePreloadImages } from '~/hooks/useOptimizedImage';

function Page() {
  usePreloadImages(['/critical-img1.jpg', '/critical-img2.jpg']);
  // ...
}
```

### 6. Monitor Performance

```tsx
<OptimizedImage
  src="/image.jpg"
  enableMonitoring={true}
  onLoad={() => console.log('Image loaded')}
  onError={() => console.error('Image failed')}
/>
```

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| AVIF | 85+ | 93+ | 16+ | 85+ |
| WebP | 23+ | 65+ | 16+ | 18+ |
| Intersection Observer | 51+ | 55+ | 12.1+ | 16+ |
| Network Information API | 61+ | - | - | 79+ |
| fetchPriority | 101+ | - | - | 101+ |

## Troubleshooting

### Images not loading on slow networks

**Solution:** Enable `networkAware` prop to skip advanced formats on slow connections.

```tsx
<OptimizedImage src="/image.jpg" networkAware={true} />
```

### Blur placeholder not showing

**Solution:** Ensure `blurDataUrl` is a valid data URL and `showBlur` is true.

```tsx
<OptimizedImage
  src="/image.jpg"
  blurDataUrl="data:image/jpeg;base64,..."
/>
```

### Retry not working

**Solution:** Check that `enableRetry` is true and `maxRetries` is > 0.

```tsx
<OptimizedImage
  src="/image.jpg"
  enableRetry={true}
  maxRetries={3}
/>
```

### Performance monitoring not working

**Solution:** Ensure `enableMonitoring` is true and browser supports Performance API.

```tsx
<OptimizedImage
  src="/image.jpg"
  enableMonitoring={true}
  onLoad={() => console.log('Loaded')}
/>
```

## Migration Guide

### From Basic OptimizedImage

**Before:**
```tsx
<OptimizedImage
  src="/image.jpg"
  alt="Product"
  width={400}
  height={300}
/>
```

**After (with advanced features):**
```tsx
<OptimizedImage
  src="/image.jpg"
  alt="Product"
  width={400}
  height={300}
  blurDataUrl="data:image/jpeg;base64,..."
  showSkeleton={true}
  networkAware={true}
  priority="high"
/>
```

## Related Documentation

- [Image Optimization Utilities](./IMAGE_OPTIMIZATION.md)
- [Performance Best Practices](./PERFORMANCE.md)
- [Accessibility Guidelines](./ACCESSIBILITY.md)
