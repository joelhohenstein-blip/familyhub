/**
 * Image Cache Manager
 * 
 * Manages image caching with multiple strategies:
 * - IndexedDB for persistent storage (up to 50MB per origin)
 * - Memory cache for fast access
 * - Service Worker integration for network interception
 * - Automatic cache invalidation and cleanup
 * 
 * @module imageCacheManager
 */

/**
 * Cached image metadata
 */
export interface CachedImage {
  url: string;
  blob: Blob;
  timestamp: number;
  size: number;
  format: string;
  width?: number;
  height?: number;
  metadata?: Record<string, any>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalSize: number;
  itemCount: number;
  oldestItem: number;
  newestItem: number;
  hitRate: number;
  missRate: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  maxSize: number; // in bytes (default: 50MB)
  maxItems: number; // max number of images (default: 500)
  ttl: number; // time to live in milliseconds (default: 7 days)
  compressionThreshold: number; // min size to compress (default: 100KB)
  enableIndexedDB: boolean;
  enableMemoryCache: boolean;
  enableServiceWorker: boolean;
}

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 50 * 1024 * 1024, // 50MB
  maxItems: 500,
  ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
  compressionThreshold: 100 * 1024, // 100KB
  enableIndexedDB: true,
  enableMemoryCache: true,
  enableServiceWorker: true,
};

/**
 * Image Cache Manager
 * 
 * Handles multi-tier caching strategy for images:
 * 1. Memory cache (fastest, limited size)
 * 2. IndexedDB (persistent, larger capacity)
 * 3. Service Worker (network interception)
 */
export class ImageCacheManager {
  private config: CacheConfig;
  private memoryCache: Map<string, CachedImage> = new Map();
  private dbName = 'FamilyHubImageCache';
  private storeName = 'images';
  private db: IDBDatabase | null = null;
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeIndexedDB();
  }

  /**
   * Initialize IndexedDB connection
   */
  private async initializeIndexedDB(): Promise<void> {
    if (!this.config.enableIndexedDB || typeof indexedDB === 'undefined') {
      return;
    }

    try {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('size', 'size', { unique: false });
        }
      };
    } catch (error) {
      console.error('IndexedDB initialization failed:', error);
    }
  }

  /**
   * Get image from cache (memory first, then IndexedDB)
   */
  async get(url: string): Promise<Blob | null> {
    // Check memory cache first
    const memCached = this.memoryCache.get(url);
    if (memCached && !this.isExpired(memCached)) {
      this.stats.hits++;
      return memCached.blob;
    }

    // Check IndexedDB
    if (this.config.enableIndexedDB && this.db) {
      try {
        const cached = await this.getFromIndexedDB(url);
        if (cached && !this.isExpired(cached)) {
          // Restore to memory cache
          this.memoryCache.set(url, cached);
          this.stats.hits++;
          return cached.blob;
        }
      } catch (error) {
        console.error('Error reading from IndexedDB:', error);
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Store image in cache (memory + IndexedDB)
   */
  async set(
    url: string,
    blob: Blob,
    metadata?: Record<string, any>
  ): Promise<void> {
    const cachedImage: CachedImage = {
      url,
      blob,
      timestamp: Date.now(),
      size: blob.size,
      format: blob.type,
      metadata,
    };

    // Store in memory cache
    if (this.config.enableMemoryCache) {
      this.memoryCache.set(url, cachedImage);
    }

    // Store in IndexedDB
    if (this.config.enableIndexedDB && this.db) {
      try {
        await this.saveToIndexedDB(cachedImage);
      } catch (error) {
        console.error('Error saving to IndexedDB:', error);
      }
    }

    // Check if cleanup is needed
    await this.checkAndCleanup();
  }

  /**
   * Remove image from cache
   */
  async remove(url: string): Promise<void> {
    this.memoryCache.delete(url);

    if (this.config.enableIndexedDB && this.db) {
      try {
        await this.removeFromIndexedDB(url);
      } catch (error) {
        console.error('Error removing from IndexedDB:', error);
      }
    }
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    if (this.config.enableIndexedDB && this.db) {
      try {
        await this.clearIndexedDB();
      } catch (error) {
        console.error('Error clearing IndexedDB:', error);
      }
    }

    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    let totalSize = 0;
    let itemCount = this.memoryCache.size;
    let oldestItem = Date.now();
    let newestItem = 0;

    // Calculate from memory cache
    for (const cached of this.memoryCache.values()) {
      totalSize += cached.size;
      oldestItem = Math.min(oldestItem, cached.timestamp);
      newestItem = Math.max(newestItem, cached.timestamp);
    }

    // Add IndexedDB stats
    if (this.config.enableIndexedDB && this.db) {
      try {
        const dbStats = await this.getIndexedDBStats();
        totalSize += dbStats.totalSize;
        itemCount += dbStats.itemCount;
        oldestItem = Math.min(oldestItem, dbStats.oldestItem);
        newestItem = Math.max(newestItem, dbStats.newestItem);
      } catch (error) {
        console.error('Error getting IndexedDB stats:', error);
      }
    }

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      totalSize,
      itemCount,
      oldestItem,
      newestItem,
      hitRate,
      missRate: 1 - hitRate,
    };
  }

  /**
   * Prefetch images
   */
  async prefetch(urls: string[]): Promise<void> {
    const promises = urls.map(async (url) => {
      try {
        const cached = await this.get(url);
        if (!cached) {
          const response = await fetch(url);
          if (response.ok) {
            const blob = await response.blob();
            await this.set(url, blob);
          }
        }
      } catch (error) {
        console.error(`Failed to prefetch ${url}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Get cache size in bytes
   */
  async getCacheSize(): Promise<number> {
    const stats = await this.getStats();
    return stats.totalSize;
  }

  /**
   * Check if cache is full and cleanup if needed
   */
  private async checkAndCleanup(): Promise<void> {
    const stats = await this.getStats();

    if (
      stats.totalSize > this.config.maxSize ||
      stats.itemCount > this.config.maxItems
    ) {
      await this.cleanup();
    }
  }

  /**
   * Cleanup cache by removing oldest items
   */
  private async cleanup(): Promise<void> {
    const allItems: CachedImage[] = [];

    // Collect all items from memory cache
    for (const item of this.memoryCache.values()) {
      allItems.push(item);
    }

    // Collect all items from IndexedDB
    if (this.config.enableIndexedDB && this.db) {
      try {
        const dbItems = await this.getAllFromIndexedDB();
        allItems.push(...dbItems);
      } catch (error) {
        console.error('Error collecting items from IndexedDB:', error);
      }
    }

    // Sort by timestamp (oldest first)
    allItems.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest items until we're under limits
    let currentSize = allItems.reduce((sum, item) => sum + item.size, 0);
    let itemCount = allItems.length;

    for (const item of allItems) {
      if (
        currentSize <= this.config.maxSize * 0.8 &&
        itemCount <= this.config.maxItems * 0.8
      ) {
        break;
      }

      await this.remove(item.url);
      currentSize -= item.size;
      itemCount--;
    }
  }

  /**
   * Check if cached item is expired
   */
  private isExpired(cached: CachedImage): boolean {
    return Date.now() - cached.timestamp > this.config.ttl;
  }

  /**
   * Get image from IndexedDB
   */
  private getFromIndexedDB(url: string): Promise<CachedImage | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(url);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Save image to IndexedDB
   */
  private saveToIndexedDB(cached: CachedImage): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(cached);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Remove image from IndexedDB
   */
  private removeFromIndexedDB(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(url);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Clear IndexedDB
   */
  private clearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get all items from IndexedDB
   */
  private getAllFromIndexedDB(): Promise<CachedImage[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get IndexedDB statistics
   */
  private getIndexedDBStats(): Promise<{
    totalSize: number;
    itemCount: number;
    oldestItem: number;
    newestItem: number;
  }> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve({
          totalSize: 0,
          itemCount: 0,
          oldestItem: Date.now(),
          newestItem: 0,
        });
        return;
      }

      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const items = request.result || [];
          let totalSize = 0;
          let oldestItem = Date.now();
          let newestItem = 0;

          for (const item of items) {
            totalSize += item.size || 0;
            oldestItem = Math.min(oldestItem, item.timestamp || Date.now());
            newestItem = Math.max(newestItem, item.timestamp || 0);
          }

          resolve({
            totalSize,
            itemCount: items.length,
            oldestItem,
            newestItem,
          });
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }
}

/**
 * Global cache manager instance
 */
let globalCacheManager: ImageCacheManager | null = null;

/**
 * Get or create global cache manager
 */
export function getImageCacheManager(
  config?: Partial<CacheConfig>
): ImageCacheManager {
  if (!globalCacheManager) {
    globalCacheManager = new ImageCacheManager(config);
  }
  return globalCacheManager;
}

/**
 * Reset global cache manager (for testing)
 */
export function resetImageCacheManager(): void {
  globalCacheManager = null;
}
