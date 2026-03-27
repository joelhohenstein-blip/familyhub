'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getImageMetadata,
  onNetworkChange,
  detectNetworkConnection,
} from '~/utils/imageMetadataCache';
import type { OptimizedImageProps } from '~/components/OptimizedImage';

export interface UseOptimizedImageOptions {
  /** Enable network-aware loading */
  networkAware?: boolean;
  /** Enable performance monitoring */
  enableMonitoring?: boolean;
  /** Enable retry on failure */
  enableRetry?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Show skeleton loader */
  showSkeleton?: boolean;
  /** Show error fallback */
  showErrorFallback?: boolean;
  /** Custom error fallback component */
  errorFallback?: React.ReactNode;
  /** Priority hint */
  priority?: 'high' | 'low' | 'auto';
}

export interface UseOptimizedImageResult {
  /** Props to spread on OptimizedImage component */
  imageProps: Partial<OptimizedImageProps>;
  /** Current effective network connection */
  effectiveConnection: '4g' | '3g' | '2g';
  /** Whether AVIF is supported */
  supportsAvif: boolean;
  /** Whether WebP is supported */
  supportsWebp: boolean;
  /** Whether on slow network */
  isSlowNetwork: boolean;
}

/**
 * Hook for optimized image loading with advanced features
 * 
 * Provides:
 * - Format support detection with caching
 * - Network-aware loading
 * - Automatic retry on failure
 * - Performance monitoring
 * - Skeleton loading states
 * 
 * @param options - Configuration options
 * @returns Object with image props and metadata
 * 
 * @example
 * const { imageProps, isSlowNetwork } = useOptimizedImage({
 *   networkAware: true,
 *   showSkeleton: true,
 * });
 * 
 * <OptimizedImage
 *   src="/image.jpg"
 *   alt="Product"
 *   {...imageProps}
 * />
 */
export function useOptimizedImage(
  options: UseOptimizedImageOptions = {}
): UseOptimizedImageResult {
  const {
    networkAware = false,
    enableMonitoring = true,
    enableRetry = true,
    maxRetries = 3,
    showSkeleton = false,
    showErrorFallback = true,
    errorFallback,
    priority = 'auto',
  } = options;

  const [metadata, setMetadata] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        supportsAvif: false,
        supportsWebp: false,
        effectiveConnection: '4g' as const,
      };
    }
    return getImageMetadata();
  });

  const [effectiveConnection, setEffectiveConnection] = useState<'4g' | '3g' | '2g'>(
    metadata.effectiveConnection
  );

  // Listen for network changes
  useEffect(() => {
    if (!networkAware) {
      return;
    }

    const cleanup = onNetworkChange((connection) => {
      setEffectiveConnection(connection);
      setMetadata((prev) => {
        if (!prev) {
          return {
            supportsAvif: false,
            supportsWebp: false,
            effectiveConnection: connection,
            timestamp: Date.now(),
          };
        }
        return {
          ...prev,
          effectiveConnection: connection,
          timestamp: Date.now(),
        };
      });
    });

    return cleanup;
  }, [networkAware]);

  const isSlowNetwork = effectiveConnection === '2g' || effectiveConnection === '3g';

  const imageProps: Partial<OptimizedImageProps> = {
    networkAware,
    enableMonitoring,
    enableRetry,
    maxRetries,
    showSkeleton,
    showErrorFallback,
    errorFallback,
    priority,
  };

  return {
    imageProps,
    effectiveConnection,
    supportsAvif: metadata.supportsAvif,
    supportsWebp: metadata.supportsWebp,
    isSlowNetwork,
  };
}

/**
 * Hook for generating blur-up placeholder data URL
 * 
 * Creates a low-quality image placeholder for blur-up effect
 * 
 * @param imageUrl - URL of the image
 * @param width - Desired width of placeholder (default: 10)
 * @param height - Desired height of placeholder (default: 10)
 * @returns Promise that resolves to data URL
 * 
 * @example
 * const blurUrl = await useBlurPlaceholder('/image.jpg');
 * <OptimizedImage src="/image.jpg" blurDataUrl={blurUrl} />
 */
export function useBlurPlaceholder(
  imageUrl: string,
  width: number = 10,
  height: number = 10
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.5));
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imageUrl}`));
    };

    img.src = imageUrl;
  });
}

/**
 * Hook for preloading images
 * 
 * Preloads images to improve perceived performance
 * 
 * @param urls - Array of image URLs to preload
 * @returns Object with loading state and error info
 * 
 * @example
 * const { isLoading, error } = usePreloadImages(['/img1.jpg', '/img2.jpg']);
 */
export function usePreloadImages(urls: string[]) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (urls.length === 0) {
      setIsLoading(false);
      return;
    }

    let loadedCount = 0;
    let hasError = false;

    const handleLoad = () => {
      loadedCount++;
      if (loadedCount === urls.length && !hasError) {
        setIsLoading(false);
      }
    };

    const handleError = (err: Error) => {
      hasError = true;
      setError(err);
      setIsLoading(false);
    };

    const images = urls.map((url) => {
      const img = new Image();
      img.onload = handleLoad;
      img.onerror = () => handleError(new Error(`Failed to preload: ${url}`));
      img.src = url;
      return img;
    });

    return () => {
      images.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [urls]);

  return { isLoading, error };
}
