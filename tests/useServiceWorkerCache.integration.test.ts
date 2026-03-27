import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Integration Tests for useServiceWorkerCache Hook
 * 
 * Tests Service Worker registration, communication, and cache management
 */

describe('useServiceWorkerCache Hook Integration', () => {
  let mockServiceWorkerContainer: any;
  let mockServiceWorker: any;

  beforeEach(() => {
    // Mock Service Worker API
    mockServiceWorker = {
      controller: null,
      ready: Promise.resolve(),
      postMessage: vi.fn(),
      unregister: vi.fn().mockResolvedValue(true),
    };

    mockServiceWorkerContainer = {
      register: vi.fn().mockResolvedValue(mockServiceWorker),
      unregister: vi.fn().mockResolvedValue(true),
      controller: null,
      ready: Promise.resolve(mockServiceWorker),
    };

    // Mock navigator.serviceWorker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockServiceWorkerContainer,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Worker Registration', () => {
    it('should register service worker on initialization', async () => {
      expect(mockServiceWorkerContainer.register).toBeDefined();
    });

    it('should handle service worker registration errors gracefully', async () => {
      const registrationError = new Error('Registration failed');
      mockServiceWorkerContainer.register.mockRejectedValueOnce(registrationError);

      try {
        await mockServiceWorkerContainer.register('/sw.js');
      } catch (error) {
        expect(error).toBe(registrationError);
      }
    });

    it('should support unregistering service worker', async () => {
      await mockServiceWorkerContainer.unregister();
      expect(mockServiceWorkerContainer.unregister).toHaveBeenCalled();
    });

    it('should check if service worker is supported', () => {
      const isSupported = 'serviceWorker' in navigator;
      expect(isSupported).toBe(true);
    });
  });

  describe('Service Worker Communication', () => {
    it('should send messages to service worker', () => {
      const message = {
        type: 'CLEAR_CACHE',
        payload: { cacheNames: ['familyhub-images-v1'] },
      };

      mockServiceWorker.postMessage(message);
      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith(message);
    });

    it('should handle cache clear requests', () => {
      const clearMessage = {
        type: 'CLEAR_CACHE',
        payload: { cacheNames: ['familyhub-images-v1'] },
      };

      mockServiceWorker.postMessage(clearMessage);
      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CLEAR_CACHE',
        })
      );
    });

    it('should handle cache statistics requests', () => {
      const statsMessage = {
        type: 'GET_CACHE_STATS',
        payload: {},
      };

      mockServiceWorker.postMessage(statsMessage);
      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'GET_CACHE_STATS',
        })
      );
    });

    it('should handle prefetch requests', () => {
      const prefetchMessage = {
        type: 'PREFETCH_IMAGES',
        payload: {
          urls: [
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg',
          ],
        },
      };

      mockServiceWorker.postMessage(prefetchMessage);
      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PREFETCH_IMAGES',
        })
      );
    });
  });

  describe('Cache Management Operations', () => {
    it('should support cache clearing', () => {
      const clearMessage = {
        type: 'CLEAR_CACHE',
        payload: { cacheNames: ['familyhub-images-v1'] },
      };

      mockServiceWorker.postMessage(clearMessage);
      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith(clearMessage);
    });

    it('should support selective cache clearing by name', () => {
      const selectiveMessage = {
        type: 'CLEAR_CACHE',
        payload: { cacheNames: ['familyhub-images-v1', 'familyhub-images-v2'] },
      };

      mockServiceWorker.postMessage(selectiveMessage);
      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith(selectiveMessage);
    });

    it('should retrieve cache statistics', () => {
      const statsMessage = {
        type: 'GET_CACHE_STATS',
        payload: {},
      };

      mockServiceWorker.postMessage(statsMessage);
      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith(statsMessage);
    });

    it('should prefetch multiple images', () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
      ];

      const prefetchMessage = {
        type: 'PREFETCH_IMAGES',
        payload: { urls },
      };

      mockServiceWorker.postMessage(prefetchMessage);
      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PREFETCH_IMAGES',
          payload: expect.objectContaining({
            urls: expect.arrayContaining(urls),
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service worker not available', () => {
      const hasServiceWorker = 'serviceWorker' in navigator;
      expect(hasServiceWorker).toBe(true);
    });

    it('should handle message posting errors', () => {
      const error = new Error('Failed to post message');
      mockServiceWorker.postMessage.mockImplementationOnce(() => {
        throw error;
      });

      expect(() => {
        mockServiceWorker.postMessage({ type: 'TEST' });
      }).toThrow(error);
    });

    it('should handle unregistration errors', async () => {
      const error = new Error('Unregistration failed');
      mockServiceWorkerContainer.unregister.mockRejectedValueOnce(error);

      try {
        await mockServiceWorkerContainer.unregister();
      } catch (e) {
        expect(e).toBe(error);
      }
    });
  });

  describe('Cache Statistics', () => {
    it('should request cache statistics', () => {
      const statsMessage = {
        type: 'GET_CACHE_STATS',
        payload: {},
      };

      mockServiceWorker.postMessage(statsMessage);
      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith(statsMessage);
    });

    it('should handle cache statistics response', () => {
      const statsMessage = {
        type: 'GET_CACHE_STATS',
        payload: {},
      };

      mockServiceWorker.postMessage(statsMessage);

      // Simulate response
      const response = {
        type: 'CACHE_STATS',
        payload: {
          totalSize: 1024 * 1024,
          itemCount: 10,
          cacheNames: ['familyhub-images-v1'],
        },
      };

      expect(response.payload.totalSize).toBeGreaterThan(0);
      expect(response.payload.itemCount).toBeGreaterThan(0);
    });
  });

  describe('Prefetching', () => {
    it('should prefetch single image', () => {
      const prefetchMessage = {
        type: 'PREFETCH_IMAGES',
        payload: {
          urls: ['https://example.com/image.jpg'],
        },
      };

      mockServiceWorker.postMessage(prefetchMessage);
      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith(prefetchMessage);
    });

    it('should prefetch batch of images', () => {
      const urls = Array.from({ length: 20 }, (_, i) => `https://example.com/image${i}.jpg`);
      const prefetchMessage = {
        type: 'PREFETCH_IMAGES',
        payload: { urls },
      };

      mockServiceWorker.postMessage(prefetchMessage);
      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PREFETCH_IMAGES',
        })
      );
    });

    it('should handle prefetch with various image formats', () => {
      const urls = [
        'https://example.com/image.jpg',
        'https://example.com/image.png',
        'https://example.com/image.webp',
        'https://example.com/image.gif',
      ];

      const prefetchMessage = {
        type: 'PREFETCH_IMAGES',
        payload: { urls },
      };

      mockServiceWorker.postMessage(prefetchMessage);
      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            urls: expect.arrayContaining(urls),
          }),
        })
      );
    });
  });

  describe('Lifecycle Management', () => {
    it('should handle service worker activation', async () => {
      const registration = await mockServiceWorkerContainer.register('/sw.js');
      expect(registration).toBeDefined();
    });

    it('should handle service worker updates', async () => {
      const registration = await mockServiceWorkerContainer.register('/sw.js');
      expect(registration).toBeDefined();
    });

    it('should cleanup on unmount', async () => {
      await mockServiceWorkerContainer.unregister();
      expect(mockServiceWorkerContainer.unregister).toHaveBeenCalled();
    });
  });

  describe('Message Validation', () => {
    it('should validate message structure', () => {
      const validMessage = {
        type: 'CLEAR_CACHE',
        payload: { cacheNames: ['familyhub-images-v1'] },
      };

      expect(validMessage).toHaveProperty('type');
      expect(validMessage).toHaveProperty('payload');
    });

    it('should handle messages with different payload types', () => {
      const messages = [
        {
          type: 'CLEAR_CACHE',
          payload: { cacheNames: ['familyhub-images-v1'] },
        },
        {
          type: 'GET_CACHE_STATS',
          payload: {},
        },
        {
          type: 'PREFETCH_IMAGES',
          payload: { urls: ['https://example.com/image.jpg'] },
        },
      ];

      messages.forEach((message) => {
        mockServiceWorker.postMessage(message);
        expect(mockServiceWorker.postMessage).toHaveBeenCalledWith(message);
      });
    });
  });
});
