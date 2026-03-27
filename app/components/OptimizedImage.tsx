'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  generateSrcset,
  generateWebpSrcset,
  generateAvifSrcset,
  calculateAspectRatio,
  formatAspectRatio,
} from '~/utils/imageOptimization';
import { IMAGE_OPTIMIZATION_CONFIG } from '~/lib/imageConfig';

export interface OptimizedImageProps {
  src: string;
  alt: string;
  srcset?: string;
  srcsetWebp?: string;
  srcsetAvif?: string;
  sizes?: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
  /** Enable intersection observer for lazy loading (default: true) */
  useIntersectionObserver?: boolean;
  /** Intersection observer root margin (default: '50px') */
  rootMargin?: string;
  /** Enable performance monitoring (default: true) */
  enableMonitoring?: boolean;
  /** Placeholder color while loading (default: '#f0f0f0') */
  placeholderColor?: string;
  /** Aspect ratio for container (e.g., '16/9', '4/3') */
  aspectRatio?: string;
  /** Low quality image placeholder (blur-up effect) */
  blurDataUrl?: string;
  /** Show skeleton loader while image loads (default: false) */
  showSkeleton?: boolean;
  /** Enable error fallback UI (default: true) */
  showErrorFallback?: boolean;
  /** Custom error fallback component */
  errorFallback?: React.ReactNode;
  /** Retry failed image loads (default: true) */
  enableRetry?: boolean;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Network-aware loading - adapt to connection speed (default: false) */
  networkAware?: boolean;
  /** Priority hint for image loading (default: 'auto') */
  priority?: 'high' | 'low' | 'auto';
}

/**
 * OptimizedImage Component
 * Production-grade responsive image component with advanced optimization
 * 
 * Features:
 * - AVIF, WebP, and JPEG format support with automatic fallbacks
 * - Intersection Observer-based lazy loading
 * - Responsive srcsets for multiple screen sizes
 * - Aspect ratio preservation
 * - Performance monitoring and error tracking
 * - Accessibility support (alt text, loading states)
 * - Graceful degradation for older browsers
 * 
 * Usage:
 * <OptimizedImage
 *   src="/image.jpg"
 *   alt="Product showcase"
 *   width={1200}
 *   height={800}
 *   aspectRatio="3/2"
 *   sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px"
 * />
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  srcset,
  srcsetWebp,
  srcsetAvif,
  sizes,
  width,
  height,
  className = '',
  loading = 'lazy',
  onLoad,
  onError,
  useIntersectionObserver = true,
  rootMargin = '50px',
  enableMonitoring = IMAGE_OPTIMIZATION_CONFIG.monitoring.enabled,
  placeholderColor = '#f0f0f0',
  aspectRatio,
  blurDataUrl,
  showSkeleton = false,
  showErrorFallback = true,
  errorFallback,
  enableRetry = true,
  maxRetries = 3,
  networkAware = false,
  priority = 'auto',
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [supportsAvif, setSupportsAvif] = useState(false);
  const [supportsWebp, setSupportsWebp] = useState(false);
  const [isLoaded, setIsLoaded] = useState(loading === 'eager');
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(loading === 'eager');
  const [showBlur, setShowBlur] = useState(!!blurDataUrl);
  const [retryCount, setRetryCount] = useState(0);
  const [effectiveConnection, setEffectiveConnection] = useState<'4g' | '3g' | '2g' | '4g'>('4g');
  const loadStartTimeRef = useRef<number>(Date.now());
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Check format support on mount and detect network connection
  useEffect(() => {
    const checkFormatSupport = async () => {
      try {
        // Check AVIF support
        const avifCanvas = document.createElement('canvas');
        avifCanvas.width = 1;
        avifCanvas.height = 1;
        const avifSupported = avifCanvas.toDataURL('image/avif').indexOf('image/avif') === 5;
        setSupportsAvif(avifSupported);

        // Check WebP support
        const webpCanvas = document.createElement('canvas');
        webpCanvas.width = 1;
        webpCanvas.height = 1;
        const webpSupported = webpCanvas.toDataURL('image/webp').indexOf('image/webp') === 5;
        setSupportsWebp(webpSupported);
      } catch (error) {
        console.warn('Format support detection failed:', error);
        setSupportsAvif(false);
        setSupportsWebp(false);
      }
    };

    // Detect network connection type for network-aware loading
    const detectNetworkConnection = () => {
      if (networkAware && typeof navigator !== 'undefined') {
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (connection) {
          const effectiveType = connection.effectiveType || '4g';
          setEffectiveConnection(effectiveType);
        }
      }
    };

    checkFormatSupport();
    detectNetworkConnection();

    // Listen for network changes
    if (networkAware && typeof window !== 'undefined') {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        connection.addEventListener('change', detectNetworkConnection);
        return () => connection.removeEventListener('change', detectNetworkConnection);
      }
    }
  }, [networkAware]);

  // Setup intersection observer for lazy loading
  useEffect(() => {
    if (!useIntersectionObserver || loading === 'eager' || !imgRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin,
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [useIntersectionObserver, loading, rootMargin]);

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
    setShowBlur(false);
    setRetryCount(0);

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    if (enableMonitoring && loadStartTimeRef.current) {
      const loadTime = Date.now() - loadStartTimeRef.current;
      if (typeof window !== 'undefined' && window.performance) {
        // Log to performance API if available
        try {
          const perfEntry = {
            name: `image-load-${src}`,
            duration: loadTime,
            entryType: 'measure',
          };
          if (window.performance.measure) {
            window.performance.measure(perfEntry.name, undefined, undefined);
          }
        } catch (e) {
          // Silently fail if performance API not available
        }
      }
    }

    onLoad?.();
  }, [src, enableMonitoring, onLoad]);

  // Handle image error with retry logic
  const handleError = useCallback(() => {
    if (enableRetry && retryCount < maxRetries) {
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, retryCount) * 1000;
      
      if (enableMonitoring) {
        console.warn(`Image failed to load: ${src}. Retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
      }

      retryTimeoutRef.current = setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setHasError(false);
        if (imgRef.current) {
          imgRef.current.src = src;
        }
      }, delay);
    } else {
      setHasError(true);
      setIsLoaded(false);

      if (enableMonitoring) {
        console.warn(`Image failed to load after ${retryCount} retries: ${src}`);
      }

      onError?.();
    }
  }, [src, enableMonitoring, onError, enableRetry, retryCount, maxRetries]);

  // Cleanup retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Calculate aspect ratio style
  const aspectRatioStyle = aspectRatio
    ? {
        aspectRatio,
        overflow: 'hidden',
      }
    : {};

  // Determine which srcsets to use based on format support
  const activeSrcsetAvif = supportsAvif && srcsetAvif ? srcsetAvif : undefined;
  const activeSrcsetWebp = supportsWebp && srcsetWebp ? srcsetWebp : undefined;

  // Determine if we should show lower quality formats on slow networks
  const shouldUseLowerQuality = networkAware && (effectiveConnection === '2g' || effectiveConnection === '3g');

  // Render error fallback
  if (hasError && showErrorFallback) {
    return (
      <div
        style={{
          ...aspectRatioStyle,
          backgroundColor: placeholderColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
        }}
      >
        {errorFallback ? (
          errorFallback
        ) : (
          <div style={{ textAlign: 'center', color: '#666' }}>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>Failed to load image</div>
            <div style={{ fontSize: '12px', color: '#999' }}>{alt}</div>
            {enableRetry && retryCount < maxRetries && (
              <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                Retrying...
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: !isLoaded ? placeholderColor : 'transparent',
        transition: 'background-color 0.3s ease-out',
        position: 'relative',
        ...aspectRatioStyle,
      }}
    >
      {/* Skeleton loader */}
      {showSkeleton && !isLoaded && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(90deg, ${placeholderColor} 25%, ${placeholderColor}cc 50%, ${placeholderColor} 75%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite',
            zIndex: 1,
          }}
        />
      )}

      {/* Blur-up placeholder */}
      {showBlur && blurDataUrl && (
        <img
          src={blurDataUrl}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(20px)',
            opacity: 0.7,
            zIndex: 0,
          }}
        />
      )}

      <picture>
        {/* AVIF source for cutting-edge browsers (best compression) */}
        {activeSrcsetAvif && !shouldUseLowerQuality && (
          <source srcSet={activeSrcsetAvif} sizes={sizes} type="image/avif" />
        )}

        {/* WebP source for modern browsers (good compression) */}
        {activeSrcsetWebp && (
          <source srcSet={activeSrcsetWebp} sizes={sizes} type="image/webp" />
        )}

        {/* JPEG/PNG fallback for older browsers */}
        {srcset && <source srcSet={srcset} sizes={sizes} />}

        {/* Fallback img tag for browsers without picture support */}
        <img
          ref={imgRef}
          src={isInView ? src : undefined}
          alt={alt}
          width={width}
          height={height}
          className={className}
          loading={loading}
          fetchPriority={priority === 'high' ? 'high' : priority === 'low' ? 'low' : 'auto'}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
            opacity: isLoaded ? 1 : 0.5,
            transition: 'opacity 0.3s ease-out',
            position: 'relative',
            zIndex: 2,
          }}
        />
      </picture>

      {/* CSS for skeleton animation */}
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: calc(200% + 200px) 0;
          }
        }
      `}</style>
    </div>
  );
};

export default OptimizedImage;

