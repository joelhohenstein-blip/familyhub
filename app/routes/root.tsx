import { Outlet } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { trpc, createTRPCClient } from '~/utils/trpc';
import { AuthProvider } from '~/utils/auth';
import { initializeGA4, initializeMixpanel } from '~/utils/analytics';
import { initializeSentry } from '~/utils/sentry';

// Create clients outside the component to avoid hydration mismatches
let queryClientInstance: QueryClient | null = null;
let trpcClientInstance: ReturnType<typeof createTRPCClient> | null = null;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server-side: create a new instance for each request
    return new QueryClient();
  }
  // Client-side: reuse the same instance
  if (!queryClientInstance) {
    queryClientInstance = new QueryClient();
  }
  return queryClientInstance;
}

function getTRPCClient() {
  // Always create on client side, return null on server
  if (typeof window === 'undefined') {
    return null;
  }
  // Client-side: reuse the same instance
  if (!trpcClientInstance) {
    trpcClientInstance = createTRPCClient();
  }
  return trpcClientInstance;
}

export default function Root() {
  const [queryClient] = useState(() => getQueryClient());
  const [trpcClient] = useState(() => {
    if (typeof window === 'undefined') {
      // Server-side: return a dummy client that won't be used
      return createTRPCClient();
    }
    return getTRPCClient() || createTRPCClient();
  });

  useEffect(() => {
    // Initialize analytics on mount (client-side only)
    if (typeof window !== 'undefined') {
      initializeSentry();
      initializeGA4();
      initializeMixpanel();
    }
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
