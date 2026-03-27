import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, splitLink, createWSClient, wsLink } from '@trpc/client';
import type { AppRouter } from '../server/trpc/root';

// Store the original fetch before React Router can intercept it
// IMPORTANT: Capture fetch at module load time, before any interception
let originalFetch: typeof fetch | undefined;
if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
  originalFetch = globalThis.fetch.bind(globalThis);
  console.log('[tRPC] Captured native fetch at module load');
}

// Create the tRPC React hooks
export const trpc = createTRPCReact<AppRouter>();

// NOTE: For server-side usage in loaders/actions, use callTrpc() from '~/utils/trpc.server'
// It uses direct RPC calls (no HTTP overhead) - see trpc.server.ts

// No-op tRPC client for server-side rendering
// This prevents tRPC hooks from executing on the server
// The client will hydrate with the real client on the browser
export function createSSRClient() {
  // Return a no-op client that doesn't make any HTTP requests
  // This prevents hydration mismatches by ensuring the server
  // renders the same HTML as the client (without executing mutations/queries)
  return trpc.createClient({
    links: [
      // Use a no-op link that returns empty data
      (() => (runtime: any) => async (op: any) => {
        // Return empty result so hooks don't execute
        return { result: { data: undefined } } as any;
      }) as any,
    ],
  });
}

// Client-side tRPC client factory with WebSocket support
export function createTRPCClient() {
  // Only create on client side
  if (typeof window === 'undefined') {
    // Return a no-op client for server-side rendering
    return createSSRClient();
  }

  const host = window.location.host;
  const isHttps = window.location.protocol === 'https:';
  
  // Use relative URL with explicit /api prefix to avoid React Router interception
  // IMPORTANT: Must use /api/trpc (without procedure path - tRPC handles routing)
  const httpUrl = '/api/trpc';
  
  // WebSocket URL - use ingress proxy path for external, direct for local dev
  const wsUrl = `${isHttps ? 'wss' : 'ws'}://${host}/api/ws`;
  
  const wsClient = createWSClient({
    url: wsUrl,
    onOpen() {
      console.log('✅ tRPC WebSocket connected');
    },
    onClose() {
      console.log('❌ tRPC WebSocket disconnected');
    },
  });
  
  return trpc.createClient({
    links: [
      splitLink({
        condition(op: any) {
          // Use WebSocket for subscriptions, HTTP for queries/mutations
          return op.type === 'subscription';
        },
        true: wsLink({
          client: wsClient,
        }),
        false: httpBatchLink({
          url: httpUrl,
          // Use the original fetch to bypass React Router's fetch interception
          fetch: (originalFetch || globalThis.fetch) as any,
        }),
      }),
    ],
  });
}