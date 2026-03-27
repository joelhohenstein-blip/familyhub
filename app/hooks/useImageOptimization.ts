import { useCallback, useState } from 'react';

export interface ImageOptimizationResult {
  original: string;
  webp: {
    small: string;
    medium: string;
    large: string;
  };
  jpeg: {
    small: string;
    medium: string;
    large: string;
  };
  srcset: string;
  srcsetWebp: string;
}

/**
 * Hook for handling image optimization on the client side
 * Provides utilities for lazy loading and responsive image handling
 */
export function useImageOptimization() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optimizeImageUrl = useCallback((url: string, width: number = 1200): string => {
    // This would typically call a server endpoint that uses sharp
    // For now, return the original URL
    // In production, implement server-side optimization endpoint
    return url;
  }, []);

  const generateSrcSet = useCallback(
    (baseUrl: string, sizes: number[] = [480, 768, 1200]): string => {
      return sizes.map((size) => `${optimizeImageUrl(baseUrl, size)} ${size}w`).join(', ');
    },
    [optimizeImageUrl]
  );

  const checkWebPSupport = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
  }, []);

  return {
    loading,
    error,
    optimizeImageUrl,
    generateSrcSet,
    checkWebPSupport,
  };
}

export default useImageOptimization;
