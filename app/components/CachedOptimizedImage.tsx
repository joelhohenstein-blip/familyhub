/**
 * Cached Optimized Image Component
 * 
 * Enhanced image component with integrated caching:
 * - Automatic cache management
 * - Service Worker integration
 * - IndexedDB persistence
 * - Memory cache for fast access
 * - Automatic prefetching
 * 
 * @module CachedOptimizedImage
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getImageCacheManager } from '../utils/imageCacheManager';
import { useServiceWorkerCache } from '../hooks/useServiceWorkerCache';

/**
 * Props for CachedOptimizedImage component
 */
export interface CachedOptimizedImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'onError'> {
  /** Image source URL */
  src: string;

  /** Alternative text for accessibility */
  alt: string;

  /** Blur-up placeholder image (data URL) */
  blurDataUrl?: string;

  /** Show skeleton loader while loading */
  showSkeleton?: boolean;

  /** Enable caching (default: true) */
  enableCache?: boolean;

  /** Enable Service Worker caching (default: true) */
  enableServiceWorkerCache?: boolean;

  /** Prefetch related images */
  prefetchUrls?: string[];

  /** Cache metadata */
  cacheMetadata?: Record<string, any>;

  /** Callback when image loads */
  onLoadComplete?: () => void;

  /** Callback on error */
  onError?: (error: Error) => void;

  /** Image width for aspect ratio calculation */
  width?: number;

  /** Image height for aspect ratio calculation */
  height?: number;

  /** Priority hint for loading */
  priority?: 'high' | 'low' | 'auto';
}

/**
 * Cached Optimized Image Component
 * 
 * Provides intelligent image caching with multiple strategies:
 * 1. Service Worker cache (network interception)
 * 2. IndexedDB cache (persistent storage)
 * 3. Memory cache (fast access)
 * 
 * @example
 * ```tsx
 * <CachedOptimizedImage
 *   src="/images/photo.jpg"
 *   alt="Family photo"
 *   blurDataUrl="data:image/jpeg;base64,..."
 *   showSkeleton
 *   prefetchUrls={['/images/photo2.jpg', '/images/photo3.jpg']}
 * />
 * ```
 */
export const CachedOptimizedImage = React.forwardRef<
  HTMLImageElement,
  CachedOptimizedImageProps
>(
  (
    {
      src,
      alt,
      blurDataUrl,
      showSkeleton = true,
      enableCache = true,
      enableServiceWorkerCache = true,
      prefetchUrls = [],
      cacheMetadata,
      onLoadComplete,
      onError,
      width,
      height,
      priority = 'auto',
      className,
      style,
      ...imgProps
    },
    ref
  ) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [displaySrc, setDisplaySrc] = useState(blurDataUrl || src);
    const [isCached, setIsCached] = useState(false);
    const cacheManager = getImageCacheManager();
    const { prefetchImages, isRegistered } = useServiceWorkerCache(
      enableServiceWorkerCache
    );

    /**
     * Load image from cache or network
     */
    const loadImage = useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Try to get from cache first
        if (enableCache) {
          const cached = await cacheManager.get(src);
          if (cached) {
            const blobUrl = URL.createObjectURL(cached);
            setDisplaySrc(blobUrl);
            setIsCached(true);
            setIsLoading(false);
            onLoadComplete?.();
            return;
          }
        }

        // Load from network
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error(`Failed to load image: ${response.statusText}`);
        }

        const blob = await response.blob();

        // Cache the image
        if (enableCache) {
          await cacheManager.set(src, blob, {
            ...cacheMetadata,
            loadedAt: new Date().toISOString(),
          });
        }

        const blobUrl = URL.createObjectURL(blob);
        setDisplaySrc(blobUrl);
        setIsLoading(false);
        onLoadComplete?.();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsLoading(false);
        onError?.(error);
        console.error('Failed to load image:', error);
      }
    }, [src, enableCache, cacheMetadata, onLoadComplete, onError, cacheManager]);

    /**
     * Handle image load
     */
    const handleLoad = useCallback(() => {
      if (displaySrc !== blurDataUrl) {
        setIsLoading(false);
      }
    }, [displaySrc, blurDataUrl]);

    /**
     * Handle image error
     */
    const handleError = useCallback(() => {
      const error = new Error('Image failed to load');
      setError(error);
      setIsLoading(false);
      onError?.(error);
    }, [onError]);

    /**
     * Load image on mount and when src changes
     */
    useEffect(() => {
      loadImage();
    }, [src, loadImage]);

    /**
     * Prefetch related images
     */
    useEffect(() => {
      if (prefetchUrls.length > 0 && isRegistered) {
        prefetchImages(prefetchUrls).catch((err) => {
          console.error('Failed to prefetch images:', err);
        });
      }
    }, [prefetchUrls, isRegistered, prefetchImages]);

    /**
     * Cleanup blob URLs
     */
    useEffect(() => {
      return () => {
        if (displaySrc && displaySrc.startsWith('blob:')) {
          URL.revokeObjectURL(displaySrc);
        }
      };
    }, [displaySrc]);

    // Calculate aspect ratio
    const aspectRatio = width && height ? width / height : undefined;

    return (
      <div
        className={`relative overflow-hidden bg-gray-100 ${className || ''}`}
        style={{
          aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
          ...style,
        }}
      >
        {/* Skeleton loader */}
        {showSkeleton && isLoading && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
        )}

        {/* Blur-up placeholder */}
        {blurDataUrl && isLoading && (
          <img
            src={blurDataUrl}
            alt={alt}
            className="absolute inset-0 w-full h-full object-cover blur-sm"
            aria-hidden="true"
          />
        )}

        {/* Main image */}
        <img
          ref={(node) => {
            if (ref) {
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref && 'current' in ref) {
                (ref as any).current = node;
              }
            }
            if (imgRef.current !== node) {
              (imgRef as any).current = node;
            }
          }}
          src={displaySrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          fetchPriority={priority === 'high' ? 'high' : 'low'}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          {...imgProps}
        />

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-600">Failed to load image</p>
              <button
                onClick={() => loadImage()}
                className="mt-2 px-3 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Cache indicator (development only) */}
        {process.env.NODE_ENV === 'development' && isCached && (
          <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-2 py-1 rounded opacity-75">
            Cached
          </div>
        )}
      </div>
    );
  }
);

CachedOptimizedImage.displayName = 'CachedOptimizedImage';

export default CachedOptimizedImage;
