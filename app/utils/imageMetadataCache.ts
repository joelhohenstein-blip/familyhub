/**
 * Image Metadata Cache
 * 
 * Caches image format support detection and metadata to avoid
 * repeated checks and improve performance across page loads.
 */

export interface ImageMetadata {
  supportsAvif: boolean;
  supportsWebp: boolean;
  effectiveConnection: '4g' | '3g' | '2g';
  timestamp: number;
}

const CACHE_KEY = 'image-metadata-cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get cached image metadata
 * @returns Cached metadata or null if not found or expired
 */
export function getCachedImageMetadata(): ImageMetadata | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      return null;
    }

    const metadata: ImageMetadata = JSON.parse(cached);
    const age = Date.now() - metadata.timestamp;

    // Check if cache is expired
    if (age > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return metadata;
  } catch (error) {
    console.warn('Failed to read image metadata cache:', error);
    return null;
  }
}

/**
 * Cache image metadata
 * @param metadata - Metadata to cache
 */
export function cacheImageMetadata(metadata: Omit<ImageMetadata, 'timestamp'>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const cacheData: ImageMetadata = {
      ...metadata,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to cache image metadata:', error);
  }
}

/**
 * Clear image metadata cache
 */
export function clearImageMetadataCache(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.warn('Failed to clear image metadata cache:', error);
  }
}

/**
 * Detect format support with caching
 * @returns Object with format support flags
 */
export function detectFormatSupport(): { supportsAvif: boolean; supportsWebp: boolean } {
  if (typeof window === 'undefined') {
    return { supportsAvif: false, supportsWebp: false };
  }

  try {
    // Check AVIF support
    const avifCanvas = document.createElement('canvas');
    avifCanvas.width = 1;
    avifCanvas.height = 1;
    const supportsAvif = avifCanvas.toDataURL('image/avif').indexOf('image/avif') === 5;

    // Check WebP support
    const webpCanvas = document.createElement('canvas');
    webpCanvas.width = 1;
    webpCanvas.height = 1;
    const supportsWebp = webpCanvas.toDataURL('image/webp').indexOf('image/webp') === 5;

    return { supportsAvif, supportsWebp };
  } catch (error) {
    console.warn('Format support detection failed:', error);
    return { supportsAvif: false, supportsWebp: false };
  }
}

/**
 * Detect effective network connection type
 * @returns Effective connection type
 */
export function detectNetworkConnection(): '4g' | '3g' | '2g' {
  if (typeof navigator === 'undefined') {
    return '4g';
  }

  try {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection && connection.effectiveType) {
      return connection.effectiveType;
    }
  } catch (error) {
    console.warn('Network detection failed:', error);
  }

  return '4g';
}

/**
 * Get or detect image metadata with caching
 * @returns Image metadata
 */
export function getImageMetadata(): ImageMetadata {
  // Try to get from cache first
  const cached = getCachedImageMetadata();
  if (cached) {
    return cached;
  }

  // Detect and cache
  const { supportsAvif, supportsWebp } = detectFormatSupport();
  const effectiveConnection = detectNetworkConnection();

  const metadata = {
    supportsAvif,
    supportsWebp,
    effectiveConnection,
  };

  cacheImageMetadata(metadata);
  return { ...metadata, timestamp: Date.now() };
}

/**
 * Listen for network changes and update cache
 * @param callback - Function to call when network changes
 * @returns Cleanup function
 */
export function onNetworkChange(callback: (connection: '4g' | '3g' | '2g') => void): () => void {
  if (typeof navigator === 'undefined') {
    return () => {};
  }

  const connection = (navigator as any).connection || 
                    (navigator as any).mozConnection || 
                    (navigator as any).webkitConnection;

  if (!connection) {
    return () => {};
  }

  const handleChange = () => {
    const newConnection = detectNetworkConnection();
    callback(newConnection);

    // Update cache
    const cached = getCachedImageMetadata();
    if (cached) {
      cacheImageMetadata({
        supportsAvif: cached.supportsAvif,
        supportsWebp: cached.supportsWebp,
        effectiveConnection: newConnection,
      });
    }
  };

  connection.addEventListener('change', handleChange);

  return () => {
    connection.removeEventListener('change', handleChange);
  };
}
