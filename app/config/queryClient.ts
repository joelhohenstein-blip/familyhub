import { QueryClient } from '@tanstack/react-query';

/**
 * Default React Query configuration for FamilyHub
 * Balances between performance and freshness of data
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time before re-fetching (1 minute for most queries)
        staleTime: 1000 * 60,
        
        // Cache time before garbage collection (5 minutes)
        cacheTime: 1000 * 60 * 5,
        
        // Don't refetch when window regains focus for better UX
        refetchOnWindowFocus: false,
        
        // Don't refetch on reconnect for better UX
        refetchOnReconnect: false,
        
        // Retry failed requests 3 times
        retry: (failureCount, error: any) => {
          // Don't retry 4xx errors
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          
          return failureCount < 3;
        },
        
        // Retry delay increases exponentially
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      
      mutations: {
        // Retry mutations once
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
}

/**
 * Query key factory for type-safe query keys
 */
export const queryKeys = {
  messages: {
    all: ['messages'] as const,
    list: () => [...queryKeys.messages.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.messages.all, 'detail', id] as const,
  },
  conversations: {
    all: ['conversations'] as const,
    list: () => [...queryKeys.conversations.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.conversations.all, 'detail', id] as const,
  },
  media: {
    all: ['media'] as const,
    list: () => [...queryKeys.media.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.media.all, 'detail', id] as const,
  },
  families: {
    all: ['families'] as const,
    list: () => [...queryKeys.families.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.families.all, 'detail', id] as const,
    members: (familyId: string) => [...queryKeys.families.detail(familyId), 'members'] as const,
  },
  calls: {
    all: ['calls'] as const,
    list: () => [...queryKeys.calls.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.calls.all, 'detail', id] as const,
  },
  users: {
    all: ['users'] as const,
    me: () => [...queryKeys.users.all, 'me'] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
  },
} as const;
