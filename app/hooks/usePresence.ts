import { useEffect, useState, useCallback, useRef } from 'react';
import { trpc } from '~/utils/trpc';

export interface PresenceStatus {
  userId: string;
  userName: string;
  userEmail: string;
  status: 'online' | 'offline';
  lastSeenAt: Date;
}

export interface UsePresenceOptions {
  familyId: string;
  autoHeartbeat?: boolean;
  heartbeatInterval?: number; // in milliseconds
}

/**
 * Hook for managing user presence status in a family
 * 
 * Features:
 * - Tracks online/offline status for all family members
 * - Automatic heartbeat to keep user marked as online
 * - Real-time updates via subscription
 * - Automatic cleanup on unmount/logout
 * 
 * @param options - Configuration options
 * @returns Presence data and methods
 */
export const usePresence = (options: UsePresenceOptions) => {
  const { familyId, autoHeartbeat = true, heartbeatInterval = 30000 } = options;
  
  const [presenceList, setPresenceList] = useState<PresenceStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mutations
  const updatePresenceMutation = trpc.presence.updatePresence.useMutation();
  const heartbeatMutation = trpc.presence.heartbeat.useMutation();
  const setOfflineMutation = trpc.presence.setOffline.useMutation();

  // Queries and subscriptions
  const familyPresenceQuery = trpc.presence.getFamilyPresence.useQuery(
    { familyId },
    { enabled: !!familyId }
  );

  // Subscribe to presence updates
  const presenceSubscription = trpc.presence.onPresenceUpdate.useSubscription(
    { familyId },
    {
      enabled: !!familyId,
      onData: (data) => {
        // Update the presence list with new data
        setPresenceList((prev) => {
          const existing = prev.findIndex((p) => p.userId === data.userId);
          const updatedData: PresenceStatus = {
            userId: data.userId,
            userName: data.username,
            userEmail: '',
            status: data.status,
            lastSeenAt: new Date(data.lastSeenAt),
          };

          if (existing >= 0) {
            // Update existing
            const newList = [...prev];
            newList[existing] = updatedData;
            return newList;
          } else {
            // Add new
            return [...prev, updatedData];
          }
        });
      },
    }
  );

  // Initialize presence list from query
  useEffect(() => {
    if (familyPresenceQuery.data) {
      const presenceData = familyPresenceQuery.data.map((item: any) => {
        const userName = (item.userName)
          ? item.userName
          : `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Unknown';
        return {
          userId: item.userId,
          userName,
          userEmail: item.userEmail || '',
          status: (item.status as 'online' | 'offline') || 'offline',
          lastSeenAt: new Date(item.lastSeenAt),
        };
      });
      setPresenceList(presenceData);
      setIsLoading(false);
    }
  }, [familyPresenceQuery.data]);

  // Set user as online on mount
  useEffect(() => {
    const setOnline = async () => {
      try {
        await updatePresenceMutation.mutateAsync({
          familyId,
          status: 'online',
        });
      } catch (err) {
        console.error('Failed to set presence online:', err);
        setError(err instanceof Error ? err.message : 'Failed to set presence');
      }
    };

    setOnline();
  }, [familyId, updatePresenceMutation]);

  // Setup heartbeat to keep user online
  useEffect(() => {
    if (!autoHeartbeat) return;

    const startHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      heartbeatIntervalRef.current = setInterval(async () => {
        try {
          await heartbeatMutation.mutateAsync({ familyId });
        } catch (err) {
          console.error('Heartbeat failed:', err);
        }
      }, heartbeatInterval);
    };

    startHeartbeat();

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [familyId, autoHeartbeat, heartbeatInterval, heartbeatMutation]);

  // Set user as offline on unmount or page unload
  useEffect(() => {
    const handleBeforeUnload = async () => {
      try {
        await setOfflineMutation.mutateAsync({ familyId });
      } catch (err) {
        console.error('Failed to set presence offline:', err);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Mark as offline on unmount
      handleBeforeUnload();
    };
  }, [familyId, setOfflineMutation]);

  // Get presence status for a specific user
  const getUserPresence = useCallback(
    (userId: string): PresenceStatus | undefined => {
      return presenceList.find((p) => p.userId === userId);
    },
    [presenceList]
  );

  // Get all online users
  const getOnlineUsers = useCallback((): PresenceStatus[] => {
    return presenceList.filter((p) => p.status === 'online');
  }, [presenceList]);

  // Get all offline users
  const getOfflineUsers = useCallback((): PresenceStatus[] => {
    return presenceList.filter((p) => p.status === 'offline');
  }, [presenceList]);

  // Get count of online users
  const getOnlineCount = useCallback((): number => {
    return presenceList.filter((p) => p.status === 'online').length;
  }, [presenceList]);

  // Manually update presence status
  const updatePresence = useCallback(
    async (status: 'online' | 'offline') => {
      try {
        await updatePresenceMutation.mutateAsync({
          familyId,
          status,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update presence';
        setError(message);
        throw err;
      }
    },
    [familyId, updatePresenceMutation]
  );

  // Manually trigger heartbeat
  const triggerHeartbeat = useCallback(async () => {
    try {
      await heartbeatMutation.mutateAsync({ familyId });
    } catch (err) {
      console.error('Failed to trigger heartbeat:', err);
    }
  }, [familyId, heartbeatMutation]);

  return {
    // State
    presenceList,
    isLoading,
    error,
    
    // Methods
    getUserPresence,
    getOnlineUsers,
    getOfflineUsers,
    getOnlineCount,
    updatePresence,
    triggerHeartbeat,
  };
};
