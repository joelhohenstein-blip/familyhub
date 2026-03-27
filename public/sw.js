/**
 * Service Worker for Image Caching
 * 
 * Intercepts image requests and serves them from cache when available.
 * Implements cache-first strategy with network fallback.
 * 
 * Installation:
 * - Register in your app with: navigator.serviceWorker.register('/sw.js')
 * - Service Worker will automatically cache images on first request
 */

const CACHE_NAME = 'familyhub-images-v1';
const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.avif',
  '.svg',
];

/**
 * Check if URL is an image
 */
function isImageRequest(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    return IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

/**
 * Install event - set up cache
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

/**
 * Fetch event - intercept requests
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Only handle image requests
  if (!isImageRequest(request.url)) {
    return;
  }

  // Cache-first strategy for images
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((response) => {
        if (response) {
          console.log('[SW] Serving from cache:', request.url);
          return response;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Only cache successful responses
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type !== 'error'
            ) {
              // Clone the response before caching
              const responseToCache = networkResponse.clone();
              cache.put(request, responseToCache);
              console.log('[SW] Cached:', request.url);
            }
            return networkResponse;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed:', request.url, error);
            // Return a placeholder or error response
            return new Response('Image failed to load', {
              status: 408,
              statusText: 'Request Timeout',
              headers: new Headers({
                'Content-Type': 'text/plain',
              }),
            });
          });
      });
    })
  );
});

/**
 * Message event - handle commands from client
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  if (type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[SW] Cache cleared');
      event.ports[0].postMessage({ success: true });
    });
  }

  if (type === 'GET_CACHE_SIZE') {
    caches.open(CACHE_NAME).then((cache) => {
      cache.keys().then((requests) => {
        let totalSize = 0;
        const promises = requests.map((request) => {
          return cache.match(request).then((response) => {
            if (response) {
              return response.blob().then((blob) => {
                totalSize += blob.size;
              });
            }
          });
        });

        Promise.all(promises).then(() => {
          event.ports[0].postMessage({
            size: totalSize,
            itemCount: requests.length,
          });
        });
      });
    });
  }

  if (type === 'PREFETCH_IMAGES') {
    const { urls } = payload;
    caches.open(CACHE_NAME).then((cache) => {
      const promises = urls.map((url) => {
        return fetch(url)
          .then((response) => {
            if (response.ok) {
              cache.put(url, response.clone());
            }
          })
          .catch((error) => {
            console.error('[SW] Prefetch failed:', url, error);
          });
      });

      Promise.all(promises).then(() => {
        event.ports[0].postMessage({ success: true });
      });
    });
  }
});
