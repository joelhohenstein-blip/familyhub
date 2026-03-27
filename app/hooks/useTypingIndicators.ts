import { useEffect, useState, useCallback, useRef } from 'react';
import { trpc } from '~/utils/trpc';

export interface Typer {
  userId: string;
  userName: string;
  startedAt: Date;
}

export interface UseTypingIndicatorsOptions {
  conversationId: string;
  debounceMs?: number; // Delay before sending "stopped typing" event
  refreshIntervalMs?: number; // Poll interval to refresh typers list
}

/**
 * Hook for managing typing indicators in conversations
 * 
 * Features:
 * - Track when users are actively typing
 * - Real-time typing updates via subscription
 * - Automatic debouncing to avoid excessive updates
 * - Auto-expiration after inactivity (server-side)
 * - Support for 1-on-1 and group conversations
 * 
 * @param options - Configuration options
 * @returns Typing state and methods
 */
export const useTypingIndicators = (options: UseTypingIndicatorsOptions) => {
  const { conversationId, debounceMs = 500, refreshIntervalMs = 2000 } = options;

  const [typers, setTypers] = useState<Typer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLocallyTypingRef = useRef(false);

  // Mutations
  const setTypingMutation = trpc.typingIndicators.setTyping.useMutation();
  const clearTypingMutation = trpc.typingIndicators.clearTyping.useMutation();

  // Queries
  const getTypersQuery = trpc.typingIndicators.getTypers.useQuery(
    { conversationId },
    { enabled: !!conversationId, refetchInterval: refreshIntervalMs }
  );

  // Subscribe to typing updates
  const typingSubscription = trpc.typingIndicators.onTypingUpdate.useSubscription(
    { conversationId },
    {
      enabled: !!conversationId,
      onData: (data) => {
        setTypers((prev) => {
          if (data.isTyping) {
            // Add or update typer
            const existing = prev.findIndex((t) => t.userId === data.userId);
            const newTyper: Typer = {
              userId: data.userId,
              userName: data.username,
              startedAt: new Date(data.timestamp),
            };

            if (existing >= 0) {
              const newList = [...prev];
              newList[existing] = newTyper;
              return newList;
            } else {
              return [...prev, newTyper];
            }
          } else {
            // Remove typer
            return prev.filter((t) => t.userId !== data.userId);
          }
        });
      },
    }
  );

  // Update typers list from query
  useEffect(() => {
    if (getTypersQuery.data) {
      const newTypers = getTypersQuery.data.map((item) => {
        const userName = (item as any).userName
          ? (item as any).userName
          : `${(item as any).firstName || ''} ${(item as any).lastName || ''}`.trim() || 'Unknown';
        return {
          userId: item.userId,
          userName,
          startedAt: new Date(item.startedAt),
        };
      });
      setTypers(newTypers);
      setIsLoading(false);
    }
  }, [getTypersQuery.data]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      // Clear typing status on unmount
      if (isLocallyTypingRef.current) {
        clearTyping();
      }
    };
  }, []);

  /**
   * Signal that the user is typing
   * Debounced to avoid excessive server calls
   */
  const setIsTyping = useCallback(async () => {
    try {
      // Clear existing timeout to reset debounce
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Send typing status to server (only if not already sent)
      if (!isLocallyTypingRef.current) {
        isLocallyTypingRef.current = true;
        await setTypingMutation.mutateAsync({
          conversationId,
          isTyping: true,
        });
      }

      // Set timeout to send "stopped typing" after debounce
      typingTimeoutRef.current = setTimeout(async () => {
        try {
          isLocallyTypingRef.current = false;
          await setTypingMutation.mutateAsync({
            conversationId,
            isTyping: false,
          });
        } catch (err) {
          console.error('Failed to send stopped typing:', err);
        }
      }, debounceMs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set typing status';
      setError(message);
      isLocallyTypingRef.current = false;
    }
  }, [conversationId, debounceMs, setTypingMutation]);

  /**
   * Signal that the user stopped typing
   * Called when user leaves the input field or submits
   */
  const clearTyping = useCallback(async () => {
    try {
      // Clear timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      // Send stopped typing status
      if (isLocallyTypingRef.current) {
        isLocallyTypingRef.current = false;
        await clearTypingMutation.mutateAsync({ conversationId });
      }
    } catch (err) {
      console.error('Failed to clear typing:', err);
    }
  }, [conversationId, clearTypingMutation]);

  /**
   * Get formatted typing message
   * e.g., "John is typing..." or "John and Jane are typing..."
   */
  const getTypingMessage = useCallback((): string => {
    if (typers.length === 0) {
      return '';
    }

    if (typers.length === 1) {
      return `${typers[0].userName} is typing...`;
    }

    if (typers.length === 2) {
      return `${typers[0].userName} and ${typers[1].userName} are typing...`;
    }

    return `${typers.length} people are typing...`;
  }, [typers]);

  /**
   * Check if a specific user is typing
   */
  const isUserTyping = useCallback(
    (userId: string): boolean => {
      return typers.some((t) => t.userId === userId);
    },
    [typers]
  );

  /**
   * Get count of active typers
   */
  const getTyperCount = useCallback((): number => {
    return typers.length;
  }, [typers]);

  return {
    // State
    typers,
    isLoading,
    error,

    // Methods
    setIsTyping,
    clearTyping,
    getTypingMessage,
    isUserTyping,
    getTyperCount,
  };
};
