import { useEffect, useRef, useCallback } from 'react';
import { pusherClient } from '~/utils/pusher.client';
import type { Channel } from 'pusher-js';

type PusherEventHandler = (event: string, data: any) => void;

/**
 * Custom React hook for subscribing to Pusher channels
 * Handles authentication, lifecycle management, and event binding
 *
 * @param channelName - The Pusher channel to subscribe to (e.g., 'private-family-{familyId}')
 * @param familyId - The family ID (used for channel authentication)
 * @param onEvent - Callback function fired when events are received
 * @returns Object with connection state and methods
 */
export function usePusherChannel(
  channelName: string,
  familyId: string,
  onEvent: PusherEventHandler
) {
  const channelRef = useRef<Channel | null>(null);
  const handlersRef = useRef<Map<string, Function[]>>(new Map());

  const subscribeToChannel = useCallback(async () => {
    // Extract familyId from channel name if not provided
    const extractedFamilyId = channelName.replace('private-family-', '');

    // Subscribe to the channel
    const channel = pusherClient.subscribe(channelName);

    // Set up event listeners for all expected events
    const events = ['post-created', 'reply-created', 'post-deleted', 'media-added'];

    events.forEach((eventName) => {
      // Remove existing listeners if any
      channel.unbind(eventName);

      // Bind new listener
      const listener = (data: any) => {
        console.log(`Pusher event received: ${eventName}`, data);
        onEvent(eventName, data);
      };

      channel.bind(eventName, listener);

      // Store handler reference for cleanup
      if (!handlersRef.current.has(eventName)) {
        handlersRef.current.set(eventName, []);
      }
      handlersRef.current.get(eventName)?.push(listener);
    });

    // Listen for subscription errors
    channel.bind('pusher:subscription_error', (error: any) => {
      console.error('Pusher subscription error:', error);
    });

    channel.bind('pusher:subscription_succeeded', () => {
      console.log(`Successfully subscribed to ${channelName}`);
    });

    channelRef.current = channel;
  }, [channelName, onEvent]);

  // Subscribe to channel on mount
  useEffect(() => {
    subscribeToChannel();

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        // Unbind all event listeners
        const events = ['post-created', 'reply-created', 'post-deleted', 'media-added'];
        events.forEach((eventName) => {
          channelRef.current?.unbind(eventName);
          const handlers = handlersRef.current.get(eventName);
          if (handlers) {
            handlers.forEach((handler) => {
              channelRef.current?.unbind(eventName, handler as any);
            });
            handlersRef.current.delete(eventName);
          }
        });

        // Unsubscribe from channel
        pusherClient.unsubscribe(channelName);
        channelRef.current = null;
      }
    };
  }, [channelName, subscribeToChannel]);

  // Return utility functions
  return {
    isConnected: channelRef.current?.subscribed || false,
    channel: channelRef.current,
  };
}
