import { appRouter } from '../server/trpc/root';
import { createContext } from '../server/trpc/context';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/trpc/root';

/**
 * Direct procedure calls - most efficient for server-side usage
 * This bypasses HTTP and calls procedures directly
 */
export async function callTrpc(request: Request) {
  // Create the context
  const ctx = await createContext({ request });
  
  // Create a caller
  const caller = appRouter.createCaller(ctx);
  
  return caller;
}

/**
 * HTTP-based client for server-side usage
 * Use this when you need consistent behavior with client-side calls
 */
export function createServerHTTPClient(request: Request) {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const url = `${protocol}://${host}/api/trpc`;
  
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url,
        fetch: (input, init) => {
          const url = typeof input === 'string' ? new URL(input) : input;
          return fetch(url, init);
        },
      }),
    ],
  });
}

/**
 * Helper to get the optimal server-side client
 * Defaults to direct calls for better performance
 */
export async function getServerTRPC(request: Request, useHTTP = false) {
  if (useHTTP) {
    return createServerHTTPClient(request);
  } else {
    return await callTrpc(request);
  }
} 