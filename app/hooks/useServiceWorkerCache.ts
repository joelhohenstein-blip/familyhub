/**
 * Service Worker Cache Hook
 * 
 * Manages Service Worker registration and communication for image caching.
 * Provides methods to:
 * - Register/unregister Service Worker
 * - Clear cache
 * - Get cache statistics
 * - Prefetch images
 * 
 * @module useServiceWorkerCache
 */

import { useEffect, useState, useCallback } from 'react';

/**
 * Service Worker cache statistics
 */
export interface SWCacheStats {
  size: number;
  itemCount: number;
  isSupported: boolean;
  isRegistered: boolean;
}

/**
 * Service Worker registration state
 */
interface SWState {
  isSupported: boolean;
  isRegistered: boolean;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

/**
 * Hook for managing Service Worker cache
 * 
 * @param enabled - Whether to enable Service Worker (default: true)
 * @returns Object with cache management methods and state
 * 
 * @example
 * ```tsx
 * const { isRegistered, clearCache, getCacheStats } = useServiceWorkerCache();
 * 
 * useEffect(() => {
 *   if (isRegistered) {
 *     getCacheStats().then(stats => console.log(stats));
 *   }
 * }, [isRegistered]);
 * ```
 */
export function useServiceWorkerCache(enabled: boolean = true) {
  const [state, setState] = useState<SWState>({
    isSupported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    isRegistered: false,
    registration: null,
    error: null,
  });

  const [stats, setStats] = useState<SWCacheStats>({
    size: 0,
    itemCount: 0,
    isSupported: state.isSupported,
    isRegistered: false,
  });

  /**
   * Register Service Worker
   */
  const register = useCallback(async () => {
    if (!state.isSupported || !enabled) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      setState((prev) => ({
        ...prev,
        isRegistered: true,
        registration,
        error: null,
      }));

      setStats((prev) => ({
        ...prev,
        isRegistered: true,
      }));

      console.log('[SW] Service Worker registered successfully');
      return registration;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState((prev) => ({
        ...prev,
        error: err,
      }));
      console.error('[SW] Service Worker registration failed:', err);
    }
  }, [state.isSupported, enabled]);

  /**
   * Unregister Service Worker
   */
  const unregister = useCallback(async () => {
    if (!state.registration) {
      return;
    }

    try {
      await state.registration.unregister();
      setState((prev) => ({
        ...prev,
        isRegistered: false,
        registration: null,
      }));
      console.log('[SW] Service Worker unregistered');
    } catch (error) {
      console.error('[SW] Failed to unregister Service Worker:', error);
    }
  }, [state.registration]);

  /**
   * Clear Service Worker cache
   */
  const clearCache = useCallback(async (): Promise<boolean> => {
    if (!state.isRegistered || !navigator.serviceWorker.controller) {
      return false;
    }

    return new Promise((resolve) => {
      const channel = new MessageChannel();

      channel.port1.onmessage = (event) => {
        if (event.data.success) {
          setStats((prev) => ({
            ...prev,
            size: 0,
            itemCount: 0,
          }));
          console.log('[SW] Cache cleared');
          resolve(true);
        } else {
          resolve(false);
        }
      };

      navigator.serviceWorker.controller?.postMessage(
        { type: 'CLEAR_CACHE' },
        [channel.port2]
      );
    });
  }, [state.isRegistered]);

  /**
   * Get cache statistics from Service Worker
   */
  const getCacheStats = useCallback(async (): Promise<SWCacheStats> => {
    if (!state.isRegistered || !navigator.serviceWorker.controller) {
      return stats;
    }

    return new Promise((resolve) => {
      const channel = new MessageChannel();

      channel.port1.onmessage = (event) => {
        const newStats: SWCacheStats = {
          size: event.data.size || 0,
          itemCount: event.data.itemCount || 0,
          isSupported: state.isSupported,
          isRegistered: state.isRegistered,
        };
        setStats(newStats);
        resolve(newStats);
      };

      navigator.serviceWorker.controller?.postMessage(
        { type: 'GET_CACHE_SIZE' },
        [channel.port2]
      );
    });
  }, [state.isRegistered, state.isSupported, stats]);

  /**
   * Prefetch images via Service Worker
   */
  const prefetchImages = useCallback(
    async (urls: string[]): Promise<boolean> => {
      if (!state.isRegistered || !navigator.serviceWorker.controller) {
        return false;
      }

      return new Promise((resolve) => {
        const channel = new MessageChannel();

        channel.port1.onmessage = (event) => {
          resolve(event.data.success || false);
        };

        navigator.serviceWorker.controller?.postMessage(
          { type: 'PREFETCH_IMAGES', payload: { urls } },
          [channel.port2]
        );
      });
    },
    [state.isRegistered]
  );

  /**
   * Update Service Worker
   */
  const update = useCallback(async () => {
    if (!state.registration) {
      return;
    }

    try {
      await state.registration.update();
      console.log('[SW] Service Worker updated');
    } catch (error) {
      console.error('[SW] Failed to update Service Worker:', error);
    }
  }, [state.registration]);

  /**
   * Auto-register on mount
   */
  useEffect(() => {
    if (enabled && state.isSupported && !state.isRegistered) {
      register();
    }
  }, [enabled, state.isSupported, state.isRegistered, register]);

  /**
   * Listen for Service Worker updates
   */
  useEffect(() => {
    if (!state.registration) {
      return;
    }

    const handleUpdate = () => {
      console.log('[SW] New Service Worker available');
      // Optionally notify user about update
    };

    state.registration.addEventListener('updatefound', handleUpdate);

    return () => {
      state.registration?.removeEventListener('updatefound', handleUpdate);
    };
  }, [state.registration]);

  return {
    // State
    isSupported: state.isSupported,
    isRegistered: state.isRegistered,
    error: state.error,
    stats,

    // Methods
    register,
    unregister,
    clearCache,
    getCacheStats,
    prefetchImages,
    update,
  };
}

/**
 * Hook for monitoring cache size
 * 
 * @param interval - Update interval in milliseconds (default: 5000)
 * @returns Current cache stats
 * 
 * @example
 * ```tsx
 * const stats = useCacheMonitor(5000);
 * console.log(`Cache size: ${stats.size} bytes`);
 * ```
 */
export function useCacheMonitor(interval: number = 5000) {
  const { getCacheStats, isRegistered } = useServiceWorkerCache();
  const [stats, setStats] = useState<SWCacheStats>({
    size: 0,
    itemCount: 0,
    isSupported: true,
    isRegistered: false,
  });

  useEffect(() => {
    if (!isRegistered) {
      return;
    }

    // Get initial stats
    getCacheStats().then(setStats);

    // Set up interval
    const timer = setInterval(() => {
      getCacheStats().then(setStats);
    }, interval);

    return () => clearInterval(timer);
  }, [isRegistered, interval, getCacheStats]);

  return stats;
}

/**
 * Hook for prefetching images
 * 
 * @param urls - Array of image URLs to prefetch
 * @param enabled - Whether to enable prefetching (default: true)
 * @returns Loading and error state
 * 
 * @example
 * ```tsx
 * const { isLoading, error } = usePrefetchImages([
 *   '/images/photo1.jpg',
 *   '/images/photo2.jpg'
 * ]);
 * ```
 */
export function usePrefetchImages(urls: string[], enabled: boolean = true) {
  const { prefetchImages, isRegistered } = useServiceWorkerCache();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !isRegistered || urls.length === 0) {
      return;
    }

    setIsLoading(true);
    setError(null);

    prefetchImages(urls)
      .then((success) => {
        if (!success) {
          setError(new Error('Failed to prefetch images'));
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [urls, enabled, isRegistered, prefetchImages]);

  return { isLoading, error };
}
