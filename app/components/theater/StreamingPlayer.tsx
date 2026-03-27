import { useEffect, useRef, useState } from 'react';
import { type StreamingSource } from '~/db/schema/streaming';
import { trpc } from '~/utils/trpc';
import { Play, Pause, Volume2, AlertCircle } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface StreamingPlayerProps {
  source: StreamingSource;
}

export function StreamingPlayer({ source }: StreamingPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const loadTimeoutRef = useRef<NodeJS.Timeout>();
  const updateIntervalRef = useRef<NodeJS.Timeout>();

  // Fetch playback state on mount
  const playbackStateQuery = trpc.streaming.getPlaybackState.useQuery({
    sourceId: source.id,
  });

  useEffect(() => {
    if (playbackStateQuery.data) {
      setCurrentTime(parseFloat(playbackStateQuery.data.currentTime || '0'));
      setDuration(parseFloat(playbackStateQuery.data.duration || '0'));
    }
  }, [playbackStateQuery.data]);

  // Setup iframe load timeout
  useEffect(() => {
    setEmbedLoaded(false);
    setEmbedFailed(false);
    setIsLoading(true);

    loadTimeoutRef.current = setTimeout(() => {
      if (!embedLoaded && !embedFailed) {
        setEmbedFailed(true);
        setIsLoading(false);
      }
    }, 4000); // 4 second timeout

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [source.id, embedLoaded]);

  // Handle iframe load
  const handleIframeLoad = () => {
    setEmbedLoaded(true);
    setIsLoading(false);
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
  };

  // Save playback state periodically
  const updatePlaybackMutation = trpc.streaming.updatePlaybackState.useMutation();

  useEffect(() => {
    if (!isPlaying) return;

    updateIntervalRef.current = setInterval(() => {
      updatePlaybackMutation.mutate({
        sourceId: source.id,
        currentTime,
        duration,
      });
    }, 5000); // Save every 5 seconds

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isPlaying, currentTime, duration, source.id, updatePlaybackMutation]);

  const getEmbedUrl = () => {
    if (source.embedCode) {
      return source.embedCode;
    }

    // Construct embed URLs for known services
    if (source.url) {
      return source.url;
    }

    return null;
  };

  const embedUrl = getEmbedUrl();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(Math.min(time, duration));
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    handleSeek(percent * duration);
  };

  if (!embedUrl) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-8 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-yellow-500" />
        <h3 className="mb-2 text-lg font-semibold text-white">No Embed Available</h3>
        <p className="text-slate-400">
          This source does not have a valid embed URL or embed code configured.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Embed Container */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-700 bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center">
              <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-purple-500"></div>
              <p className="text-slate-300">Loading stream...</p>
            </div>
          </div>
        )}

        {embedFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
            <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
            <h4 className="mb-2 text-lg font-semibold text-white">Stream Failed to Load</h4>
            <p className="text-center text-slate-400">
              The stream may be temporarily unavailable or the embed URL is invalid.
              <br />
              Please try again later.
            </p>
          </div>
        )}

        {!embedFailed && embedUrl && (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className="h-full w-full"
            allowFullScreen
            onLoad={handleIframeLoad}
            title={source.name}
          />
        )}
      </div>

      {/* Controls */}
      <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-800 p-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div
            onClick={handleProgressBarClick}
            className="h-2 w-full cursor-pointer rounded-full bg-slate-700 transition-all hover:h-3"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePlayPause}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              size="sm"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Play
                </>
              )}
            </Button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-slate-400" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value))}
              className="w-20 cursor-pointer accent-purple-500"
            />
            <span className="w-8 text-right text-xs text-slate-400">{volume}%</span>
          </div>

          {/* Fullscreen Info */}
          <div className="text-xs text-slate-500">Double-click video for fullscreen</div>
        </div>
      </div>

      {/* Source Info */}
      <div className="rounded-lg bg-slate-800/50 p-3">
        <p className="text-sm text-slate-400">
          <span className="font-semibold text-white">Currently Playing:</span> {source.name}
        </p>
      </div>
    </div>
  );
}
