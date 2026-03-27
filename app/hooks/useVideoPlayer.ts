import { useState, useCallback, useEffect, useRef } from 'react';
import { trpc } from '~/utils/trpc';

interface UseVideoPlayerReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  lastPosition: number | null;
  loading: boolean;
  error: Error | null;

  // Controls
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  requestFullscreen: () => void;
  exitFullscreen: () => void;
  
  // Data persistence
  savePosition: () => Promise<void>;
  loadLastPosition: () => void;
}

/**
 * Custom hook for managing HTML5 video player state
 * Automatically persists watch position to database
 */
export function useVideoPlayer(
  videoUrl: string,
  userId: string,
  mediaId: string
): UseVideoPlayerReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [lastPosition, setLastPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // tRPC mutations and queries
  const updateWatchPositionMutation = trpc.media.updateWatchPosition.useMutation();
  const getWatchHistoryQuery = trpc.media.getWatchHistory.useQuery(
    { mediaId },
    { enabled: !!mediaId }
  );

  // Load last watched position on mount
  useEffect(() => {
    if (getWatchHistoryQuery.data?.lastPosition) {
      setLastPosition(getWatchHistoryQuery.data.lastPosition);
      if (videoRef.current) {
        videoRef.current.currentTime = getWatchHistoryQuery.data.lastPosition;
      }
    }
  }, [getWatchHistoryQuery.data]);

  // Save position to database
  const savePosition = useCallback(async () => {
    if (currentTime > 0 && currentTime <= duration) {
      try {
        await updateWatchPositionMutation.mutateAsync({
          mediaId,
          position: Math.round(currentTime),
        });
        setLastPosition(Math.round(currentTime));
      } catch (err) {
        console.error('Failed to save video position:', err);
        // Don't throw - position saving is non-critical
      }
    }
  }, [currentTime, duration, mediaId, updateWatchPositionMutation]);

  // Handle video metadata loaded
  const handleLoadedMetadata = useCallback((e: Event) => {
    const video = e.target as HTMLVideoElement;
    if (video) {
      setDuration(video.duration);
      setLoading(false);
    }
  }, []);

  // Handle time update
  const handleTimeUpdate = useCallback((e: Event) => {
    const video = e.target as HTMLVideoElement;
    if (video) {
      setCurrentTime(video.currentTime);

      // Debounce position saving (every 5 seconds)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        savePosition();
      }, 5000);
    }
  }, [savePosition]);

  // Handle play
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  // Handle pause
  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Handle video ended
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    // Save final position
    savePosition();
  }, [savePosition]);

  // Handle error
  const handleError = useCallback((e: Event) => {
    const video = e.target as HTMLVideoElement;
    const errorMsg = `Video error: ${video.error?.message || 'Unknown error'}`;
    setError(new Error(errorMsg));
    setLoading(false);
  }, []);

  // Handle loading
  const handleLoadStart = useCallback(() => {
    setLoading(true);
  }, []);

  // Attach event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
    };
  }, [
    handleLoadedMetadata,
    handleTimeUpdate,
    handlePlay,
    handlePause,
    handleEnded,
    handleError,
    handleLoadStart,
  ]);

  // Control methods
  const play = useCallback(() => {
    videoRef.current?.play().catch((err) => {
      console.error('Play error:', err);
    });
  }, []);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const setVideoCurrentTime = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
      setCurrentTime(videoRef.current.currentTime);
      // Save position immediately on seek
      savePosition();
    }
  }, [duration]);

  const setVideoVolume = useCallback((vol: number) => {
    const clampedVolume = Math.max(0, Math.min(1, vol));
    setVolume(clampedVolume);
    if (videoRef.current) {
      videoRef.current.volume = clampedVolume;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  }, [isMuted]);

  const requestFullscreen = useCallback(() => {
    if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen().catch((err) => {
        console.error('Fullscreen request failed:', err);
      });
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.error('Exit fullscreen failed:', err);
      });
    }
  }, []);

  // Load last position (manual trigger)
  const loadLastPosition = useCallback(() => {
    getWatchHistoryQuery.refetch();
  }, [getWatchHistoryQuery]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Save final position on unmount
      savePosition();
    };
  }, [savePosition]);

  return {
    videoRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    lastPosition,
    loading,
    error,
    play,
    pause,
    togglePlay,
    setCurrentTime: setVideoCurrentTime,
    setVolume: setVideoVolume,
    toggleMute,
    requestFullscreen,
    exitFullscreen,
    savePosition,
    loadLastPosition,
  };
}
