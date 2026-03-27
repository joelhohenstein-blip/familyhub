import { useEffect, useState, useCallback, useRef } from "react";
import { CallControlPanel } from "./CallControlPanel";
import { ConnectionMonitor, type ConnectionStatus } from "./ConnectionMonitor";
import { Loader2 } from "lucide-react";

interface CallRoomProps {
  roomName: string;
  userName: string;
  userEmail: string;
  onCallEnd: () => void;
  onMediaStateChange?: (audioEnabled: boolean, videoEnabled: boolean) => void;
}

export function CallRoom({
  roomName,
  userName,
  userEmail,
  onCallEnd,
  onMediaStateChange,
}: CallRoomProps) {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: "connected",
    message: "Connected to video call",
  });
  const iframeRef = useRef<HTMLDivElement>(null);
  const jitsiApi = useRef<any>(null);

  // Initialize Jitsi Meet API
  useEffect(() => {
    // Load Jitsi IFrame API script
    const script = document.createElement("script");
    script.src = "https://meet.jitsi/external_api.js";
    script.async = true;
    script.onload = () => {
      initializeJitsi();
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentElement) {
        script.parentElement.removeChild(script);
      }
    };
  }, []);

  // Initialize Jitsi
  const initializeJitsi = useCallback(() => {
    if ((window as any).JitsiMeetExternalAPI && iframeRef.current) {
      const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
      
      const options = {
        roomName: roomName,
        width: "100%",
        height: "100%",
        parentNode: iframeRef.current.parentElement,
        configOverwrite: {
          disableSimulcast: false,
          enableLipSync: true,
          startAudioOnly: false,
          startWithAudioMuted: !audioEnabled,
          startWithVideoMuted: !videoEnabled,
        },
        interfaceConfigOverwrite: {
          DEFAULT_LANGUAGE: "en",
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          MOBILE_APP_PROMO: false,
        },
        userInfo: {
          displayName: userName,
          email: userEmail,
        },
      };

      try {
        jitsiApi.current = new JitsiMeetExternalAPI("meet.jitsi", options);

        // Handle events
        jitsiApi.current.addEventListener("ready", () => {
          setConnectionStatus({
            status: "connected",
            message: "Connected to video call",
          });
        });

        jitsiApi.current.addEventListener("participantJoined", (event: any) => {
          console.log(`Participant joined: ${event.participantId}`);
        });

        jitsiApi.current.addEventListener("participantLeft", (event: any) => {
          console.log(`Participant left: ${event.participantId}`);
        });

        jitsiApi.current.addEventListener("videoConferenceLeft", () => {
          console.log("Video conference left");
          handleEndCall();
        });

        jitsiApi.current.addEventListener("audioMuted", () => {
          setAudioEnabled(false);
          onMediaStateChange?.(false, videoEnabled);
        });

        jitsiApi.current.addEventListener("audioUnmuted", () => {
          setAudioEnabled(true);
          onMediaStateChange?.(true, videoEnabled);
        });

        jitsiApi.current.addEventListener("videoMuted", () => {
          setVideoEnabled(false);
          onMediaStateChange?.(audioEnabled, false);
        });

        jitsiApi.current.addEventListener("videoUnmuted", () => {
          setVideoEnabled(true);
          onMediaStateChange?.(audioEnabled, true);
        });
      } catch (error) {
        console.error("Error initializing Jitsi:", error);
        setConnectionStatus({
          status: "error",
          message: "Failed to initialize video call",
        });
      }
    }
  }, [roomName, userName, userEmail, audioEnabled, videoEnabled, onMediaStateChange]);

  // Handle audio toggle
  const handleAudioToggle = useCallback(
    (enabled: boolean) => {
      setAudioEnabled(enabled);
      if (jitsiApi.current) {
        jitsiApi.current.executeCommand("toggleAudio");
      }
      onMediaStateChange?.(enabled, videoEnabled);
    },
    [videoEnabled, onMediaStateChange]
  );

  // Handle video toggle
  const handleVideoToggle = useCallback(
    (enabled: boolean) => {
      setVideoEnabled(enabled);
      if (jitsiApi.current) {
        jitsiApi.current.executeCommand("toggleVideo");
      }
      onMediaStateChange?.(audioEnabled, enabled);
    },
    [audioEnabled, onMediaStateChange]
  );

  // Handle end call
  const handleEndCall = useCallback(() => {
    if (jitsiApi.current) {
      jitsiApi.current.dispose();
      jitsiApi.current = null;
    }
    onCallEnd();
  }, [onCallEnd]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Connection Status Monitor */}
      <div className="flex-shrink-0">
        <ConnectionMonitor
          status={connectionStatus}
          onReconnect={() => {
            setConnectionStatus({
              status: "reconnecting",
              message: "Attempting to reconnect...",
            });
          }}
        />
      </div>

      {/* Jitsi Meet Container */}
      <div className="flex-1 rounded-lg overflow-hidden bg-black relative">
        <div
          ref={iframeRef}
          id="jitsi-container"
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      </div>

      {/* Control Panel */}
      <div className="flex-shrink-0">
        <CallControlPanel
          audioEnabled={audioEnabled}
          videoEnabled={videoEnabled}
          onAudioToggle={handleAudioToggle}
          onVideoToggle={handleVideoToggle}
          onEndCall={handleEndCall}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
