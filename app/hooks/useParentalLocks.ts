import { useCallback } from 'react';
import { trpc } from '~/utils/trpc';
import { type ParentalLock } from '~/db/schema/streaming';

export function useParentalLocks() {
  const locksQuery = trpc.streaming.getParentalLocks.useQuery();

  const locks = locksQuery.data || [];
  const loading = locksQuery.isLoading;
  const error = locksQuery.error;

  // Helper function to check if a source is accessible
  const canAccess = useCallback(
    (sourceId: string, userAge: number = 0): boolean => {
      // Check if there's a global lock
      const globalLock = locks.find((l) => l.isGlobalLock);
      if (globalLock && userAge < globalLock.minAgeRating) {
        return false;
      }

      // Check if there's a specific lock for this source
      const sourceLock = locks.find((l) => l.sourceId === sourceId);
      if (sourceLock && userAge < sourceLock.minAgeRating) {
        return false;
      }

      return true;
    },
    [locks]
  );

  // Helper function to get lock details for a source
  const getLockInfo = useCallback(
    (sourceId: string) => {
      const globalLock = locks.find((l) => l.isGlobalLock);
      const sourceLock = locks.find((l) => l.sourceId === sourceId);

      return {
        isLocked: !!globalLock || !!sourceLock,
        globalLock,
        sourceLock,
        minAgeRating: sourceLock?.minAgeRating || globalLock?.minAgeRating || 0,
      };
    },
    [locks]
  );

  return {
    locks,
    loading,
    error,
    canAccess,
    getLockInfo,
  };
}
