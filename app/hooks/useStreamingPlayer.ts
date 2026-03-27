import { useState, useEffect, useRef, useCallback } from 'react';
import { trpc } from '~/utils/trpc';

interface UseStreamingPlayerOptions {
  sourceId: string;
  autoPlay?: boolean;
}

export function useStreamingPlayer({ sourceId, autoPlay = false }: UseStreamingPlayerOptions) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [volume, setVolume] = useState(80);

  const updateIntervalRef = useRef<NodeJS.Timeout>();

  // Fetch playback state
  const playbackStateQuery = trpc.streaming.getPlaybackState.useQuery({
    sourceId,
  });

  // Update playback state
  const updatePlaybackMutation = trpc.streaming.updatePlaybackState.useMutation();

  // Set initial playback state
  useEffect(() => {
    if (playbackStateQuery.data) {
      setCurrentTime(parseFloat(playbackStateQuery.data.currentTime || '0'));
      setDuration(parseFloat(playbackStateQuery.data.duration || '0'));
    }
  }, [playbackStateQuery.data]);

  // Auto-save playback state when playing
  useEffect(() => {
    if (!isPlaying) {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      return;
    }

    // Save immediately
    updatePlaybackMutation.mutate({
      sourceId,
      currentTime,
      duration,
    });

    // Save every 5 seconds while playing
    updateIntervalRef.current = setInterval(() => {
      updatePlaybackMutation.mutate({
        sourceId,
        currentTime,
        duration,
      });
    }, 5000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isPlaying, currentTime, duration, sourceId, updatePlaybackMutation]);

  // Handle play/pause
  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Handle seek
  const seek = useCallback((time: number) => {
    setCurrentTime(Math.max(0, Math.min(time, duration)));
  }, [duration]);

  // Handle time update
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  // Handle duration update
  const handleDurationChange = useCallback((newDuration: number) => {
    setDuration(newDuration);
  }, []);

  // Handle volume change
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(Math.max(0, Math.min(100, newVolume)));
  }, []);

  return {
    currentTime,
    duration,
    isPlaying,
    volume,
    loading: playbackStateQuery.isLoading,
    error: playbackStateQuery.error,
    togglePlayPause,
    seek,
    handleTimeUpdate,
    handleDurationChange,
    handleVolumeChange,
  };
}
