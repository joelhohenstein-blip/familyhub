import { useEffect, useState } from "react";
import { Mic, MicOff, Video, VideoOff, Phone, Settings } from "lucide-react";
import { Button } from "../ui/button";

interface CallControlPanelProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  onAudioToggle: (enabled: boolean) => void;
  onVideoToggle: (enabled: boolean) => void;
  onEndCall: () => void;
  onSettings?: () => void;
  isLoading?: boolean;
}

export function CallControlPanel({
  audioEnabled,
  videoEnabled,
  onAudioToggle,
  onVideoToggle,
  onEndCall,
  onSettings,
  isLoading = false,
}: CallControlPanelProps) {
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Space key for mute/unmute
      if (e.code === "Space") {
        e.preventDefault();
        onAudioToggle(!audioEnabled);
      }
      // C key for camera toggle
      if (e.code === "KeyC" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onVideoToggle(!videoEnabled);
      }
      // ? key for keyboard hints
      if (e.shiftKey && e.code === "Slash") {
        setShowKeyboardHints(!showKeyboardHints);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [audioEnabled, videoEnabled, onAudioToggle, onVideoToggle, showKeyboardHints]);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Main Controls */}
      <div className="flex gap-3 justify-center flex-wrap bg-black/50 p-4 rounded-lg backdrop-blur">
        {/* Audio Toggle */}
        <Button
          onClick={() => onAudioToggle(!audioEnabled)}
          disabled={isLoading}
          variant={audioEnabled ? "default" : "destructive"}
          size="lg"
          className="rounded-full w-14 h-14 p-0 flex items-center justify-center"
          title="Toggle microphone (Space)"
        >
          {audioEnabled ? (
            <Mic className="w-6 h-6" />
          ) : (
            <MicOff className="w-6 h-6" />
          )}
        </Button>

        {/* Video Toggle */}
        <Button
          onClick={() => onVideoToggle(!videoEnabled)}
          disabled={isLoading}
          variant={videoEnabled ? "default" : "destructive"}
          size="lg"
          className="rounded-full w-14 h-14 p-0 flex items-center justify-center"
          title="Toggle camera (C)"
        >
          {videoEnabled ? (
            <Video className="w-6 h-6" />
          ) : (
            <VideoOff className="w-6 h-6" />
          )}
        </Button>

        {/* Settings */}
        {onSettings && (
          <Button
            onClick={onSettings}
            disabled={isLoading}
            variant="outline"
            size="lg"
            className="rounded-full w-14 h-14 p-0 flex items-center justify-center"
            title="Settings"
          >
            <Settings className="w-6 h-6" />
          </Button>
        )}

        {/* End Call */}
        <Button
          onClick={onEndCall}
          disabled={isLoading}
          variant="destructive"
          size="lg"
          className="rounded-full w-14 h-14 p-0 flex items-center justify-center"
          title="End call"
        >
          <Phone className="w-6 h-6 rotate-225" />
        </Button>
      </div>

      {/* Keyboard Hints */}
      {showKeyboardHints && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-sm text-white">
          <div className="font-semibold mb-2">Keyboard Shortcuts:</div>
          <ul className="space-y-1 text-blue-100">
            <li>
              <kbd className="bg-blue-950 px-2 py-1 rounded text-xs mr-2">
                Space
              </kbd>
              Mute/Unmute
            </li>
            <li>
              <kbd className="bg-blue-950 px-2 py-1 rounded text-xs mr-2">C</kbd>
              Toggle Camera
            </li>
            <li>
              <kbd className="bg-blue-950 px-2 py-1 rounded text-xs mr-2">
                Shift+?
              </kbd>
              Help
            </li>
          </ul>
        </div>
      )}

      {/* Status Indicators */}
      <div className="flex gap-4 justify-center text-xs text-gray-300">
        <div className="flex items-center gap-1">
          <div
            className={`w-2 h-2 rounded-full ${
              audioEnabled ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span>{audioEnabled ? "Audio On" : "Audio Off"}</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className={`w-2 h-2 rounded-full ${
              videoEnabled ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span>{videoEnabled ? "Video On" : "Video Off"}</span>
        </div>
      </div>
    </div>
  );
}
