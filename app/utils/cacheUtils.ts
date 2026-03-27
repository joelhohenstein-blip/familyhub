/**
 * Cache Utilities
 * 
 * Helper functions for cache management and monitoring
 */

import { getImageCacheManager } from './imageCacheManager';
import type { CacheStats } from './imageCacheManager';

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format timestamp to readable date
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Calculate cache hit rate percentage
 */
export function calculateHitRate(stats: CacheStats): number {
  return Math.round(stats.hitRate * 100);
}

/**
 * Get cache health status
 */
export function getCacheHealth(stats: CacheStats): 'good' | 'warning' | 'critical' {
  const hitRate = stats.hitRate;

  if (hitRate >= 0.8) return 'good';
  if (hitRate >= 0.5) return 'warning';
  return 'critical';
}

/**
 * Get cache health color
 */
export function getCacheHealthColor(
  health: 'good' | 'warning' | 'critical'
): string {
  switch (health) {
    case 'good':
      return 'text-green-600';
    case 'warning':
      return 'text-yellow-600';
    case 'critical':
      return 'text-red-600';
  }
}

/**
 * Get cache health background color
 */
export function getCacheHealthBgColor(
  health: 'good' | 'warning' | 'critical'
): string {
  switch (health) {
    case 'good':
      return 'bg-green-50';
    case 'warning':
      return 'bg-yellow-50';
    case 'critical':
      return 'bg-red-50';
  }
}

/**
 * Clear all caches (IndexedDB + Memory + Service Worker)
 */
export async function clearAllCaches(): Promise<void> {
  const cacheManager = getImageCacheManager();

  // Clear IndexedDB and memory cache
  await cacheManager.clear();

  // Clear Service Worker cache
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          if (cacheName.includes('image')) {
            await caches.delete(cacheName);
          }
        }
      }
    } catch (error) {
      console.error('Failed to clear Service Worker cache:', error);
    }
  }
}

/**
 * Get total cache size across all storage mechanisms
 */
export async function getTotalCacheSize(): Promise<number> {
  const cacheManager = getImageCacheManager();
  const stats = await cacheManager.getStats();
  return stats.totalSize;
}

/**
 * Get cache statistics
 */
export async function getCacheStatistics(): Promise<CacheStats> {
  const cacheManager = getImageCacheManager();
  return cacheManager.getStats();
}

/**
 * Estimate cache efficiency
 */
export async function estimateCacheEfficiency(): Promise<{
  efficiency: number;
  recommendation: string;
}> {
  const stats = await getCacheStatistics();
  const hitRate = stats.hitRate;
  const efficiency = Math.round(hitRate * 100);

  let recommendation = '';
  if (efficiency >= 80) {
    recommendation = 'Cache is performing excellently';
  } else if (efficiency >= 60) {
    recommendation = 'Cache is performing well';
  } else if (efficiency >= 40) {
    recommendation = 'Consider prefetching more images';
  } else {
    recommendation = 'Cache hit rate is low, enable prefetching';
  }

  return { efficiency, recommendation };
}

/**
 * Estimate storage quota usage
 */
export async function estimateStorageQuota(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
}> {
  if (!navigator.storage?.estimate) {
    return { usage: 0, quota: 0, percentage: 0 };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? Math.round((usage / quota) * 100) : 0;

    return { usage, quota, percentage };
  } catch (error) {
    console.error('Failed to estimate storage quota:', error);
    return { usage: 0, quota: 0, percentage: 0 };
  }
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) {
    return false;
  }

  try {
    return await navigator.storage.persist();
  } catch (error) {
    console.error('Failed to request persistent storage:', error);
    return false;
  }
}

/**
 * Check if storage is persistent
 */
export async function isStoragePersistent(): Promise<boolean> {
  if (!navigator.storage?.persisted) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch (error) {
    console.error('Failed to check persistent storage:', error);
    return false;
  }
}

/**
 * Get cache age in days
 */
export function getCacheAge(stats: CacheStats): number {
  if (stats.newestItem === 0) return 0;
  const ageMs = Date.now() - stats.oldestItem;
  return Math.ceil(ageMs / (1000 * 60 * 60 * 24));
}

/**
 * Estimate cache effectiveness
 */
export async function estimateCacheEffectiveness(): Promise<{
  score: number;
  factors: {
    hitRate: number;
    size: number;
    itemCount: number;
    age: number;
  };
}> {
  const stats = await getCacheStatistics();
  const hitRate = stats.hitRate * 100;
  const size = Math.min(stats.totalSize / (50 * 1024 * 1024), 1) * 100; // 50MB max
  const itemCount = Math.min(stats.itemCount / 500, 1) * 100; // 500 items max
  const age = Math.max(0, 100 - getCacheAge(stats) * 5); // Decay over time

  const score = Math.round((hitRate + size + itemCount + age) / 4);

  return {
    score,
    factors: {
      hitRate,
      size,
      itemCount,
      age,
    },
  };
}
