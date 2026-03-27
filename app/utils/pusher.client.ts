import PusherJS from 'pusher-js';

/**
 * Client-side Pusher instance for subscribing to real-time events
 * Uses the public key from runtime config
 */

let pusherInstance: PusherJS | null = null;

export async function initializePusher(): Promise<PusherJS> {
  if (pusherInstance) {
    return pusherInstance;
  }

  // Fetch Pusher config from server
  let pusherKey = '';
  let pusherCluster = 'mt1';

  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const config = await response.json();
      pusherKey = config.pusher?.key || '';
      pusherCluster = config.pusher?.cluster || 'mt1';
    }
  } catch (error) {
    console.warn('Failed to fetch Pusher config from server:', error);
  }

  return createPusherInstance(pusherKey, pusherCluster);
}

function createPusherInstance(pusherKey: string, pusherCluster: string): PusherJS {
  // Check for window config (fallback for server-side rendering)
  const key = pusherKey || (window as any).__PUSHER_KEY__ || '';
  const cluster = pusherCluster || (window as any).__PUSHER_CLUSTER__ || 'mt1';

  if (!key) {
    console.warn(
      'Pusher client credentials not configured. Real-time updates will be disabled.'
    );
    // Return a dummy instance that won't throw errors
    return new PusherJS('dummy-key', {
      cluster: 'mt1',
      disableStats: true,
    });
  }

  const config: any = {
    cluster: cluster,
    // Use TLS for secure connections
    encrypted: true,
    // Custom authorizer for private channel authentication
    authorizer: async (channel: any, options: any) => {
      // This will be called when subscribing to private channels
      // Return { auth, channel_data } or throw for auth failure
      try {
        const response = await fetch('/api/pusher-auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            socket_id: pusherInstance!.connection.socket_id,
            channel_name: channel.name,
            // Extract familyId from channel name (format: private-family-{familyId})
            familyId: channel.name.replace('private-family-', ''),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to authorize Pusher channel');
        }

        return await response.json();
      } catch (error) {
        console.error('Pusher channel authorization failed:', error);
        throw error;
      }
    },
  };

  // Enable connection state change logging in development
  if (process.env.NODE_ENV === 'development') {
    config.enableLogging = true;
  }

  pusherInstance = new PusherJS(key, config);

  // Set up global connection event handlers
  pusherInstance.connection.bind('connected', () => {
    console.log('Pusher connected');
  });

  pusherInstance.connection.bind('disconnected', () => {
    console.log('Pusher disconnected');
  });

  pusherInstance.connection.bind('error', (error: any) => {
    console.error('Pusher connection error:', error);
  });

  return pusherInstance;
}

// Initialize on first import - will fetch config from server
let pusherClientPromise: Promise<PusherJS> | null = null;

export function getPusherClientAsync(): Promise<PusherJS> {
  if (!pusherClientPromise) {
    pusherClientPromise = initializePusher();
  }
  return pusherClientPromise;
}

// Synchronous getter for existing code - returns dummy if not initialized
export const pusherClient: PusherJS = (() => {
  if (typeof window === 'undefined') {
    return new (require('pusher-js'))('dummy-key', {
      cluster: 'mt1',
      disableStats: true,
    });
  }
  
  // Return a dummy instance initially, will be replaced when async init completes
  const dummy = new PusherJS('dummy-key', {
    cluster: 'mt1',
    disableStats: true,
  });
  
  // Start async initialization in background
  initializePusher();
  
  return dummy;
})();

/**
 * Safe cleanup for Pusher connection
 */
export function disconnectPusher() {
  if (pusherInstance) {
    pusherInstance.disconnect();
    pusherInstance = null;
  }
}
