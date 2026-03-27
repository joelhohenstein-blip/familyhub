import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Loader2, WifiOff } from "lucide-react";

export interface ConnectionStatus {
  status: "connected" | "disconnected" | "reconnecting" | "error";
  message: string;
  retryAttempt?: number;
  maxRetries?: number;
  nextRetryIn?: number; // milliseconds
}

interface ConnectionMonitorProps {
  status: ConnectionStatus;
  onReconnect?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export function ConnectionMonitor({
  status,
  onReconnect,
  autoHide = true,
  autoHideDelay = 3000,
}: ConnectionMonitorProps) {
  const [visible, setVisible] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Auto-hide successful connection messages
  useEffect(() => {
    if (
      autoHide &&
      status.status === "connected" &&
      visible
    ) {
      const timer = setTimeout(() => setVisible(false), autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [status.status, autoHide, autoHideDelay, visible]);

  // Show error and reconnecting statuses
  useEffect(() => {
    if (status.status === "error" || status.status === "disconnected") {
      setVisible(true);
    }
  }, [status.status]);

  // Handle countdown for retry timing
  useEffect(() => {
    if (status.nextRetryIn && status.status === "reconnecting") {
      setCountdown(Math.ceil(status.nextRetryIn / 1000));
      const interval = setInterval(() => {
        setCountdown((prev) => (prev && prev > 1 ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status.nextRetryIn, status.status]);

  if (!visible) return null;

  const statusConfig = {
    connected: {
      icon: CheckCircle,
      bgColor: "bg-green-900/50",
      borderColor: "border-green-700",
      textColor: "text-green-100",
      iconColor: "text-green-400",
    },
    disconnected: {
      icon: WifiOff,
      bgColor: "bg-red-900/50",
      borderColor: "border-red-700",
      textColor: "text-red-100",
      iconColor: "text-red-400",
    },
    reconnecting: {
      icon: Loader2,
      bgColor: "bg-yellow-900/50",
      borderColor: "border-yellow-700",
      textColor: "text-yellow-100",
      iconColor: "text-yellow-400",
    },
    error: {
      icon: AlertCircle,
      bgColor: "bg-red-900/50",
      borderColor: "border-red-700",
      textColor: "text-red-100",
      iconColor: "text-red-400",
    },
  };

  const config = statusConfig[status.status];
  const Icon = config.icon;
  const isAnimated = status.status === "reconnecting";

  return (
    <div
      className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4 backdrop-blur`}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5 ${
            isAnimated ? "animate-spin" : ""
          }`}
        />
        <div className="flex-1">
          <div className={`font-semibold ${config.textColor}`}>
            {status.status.charAt(0).toUpperCase() +
              status.status.slice(1)}
          </div>
          <div className={`text-sm ${config.textColor} opacity-90`}>
            {status.message}
          </div>

          {/* Retry Information */}
          {status.status === "reconnecting" && status.retryAttempt && (
            <div className={`text-xs ${config.textColor} opacity-75 mt-2`}>
              Attempt {status.retryAttempt} of {status.maxRetries}
              {countdown && ` - Retrying in ${countdown}s`}
            </div>
          )}

          {/* Manual Reconnect Button */}
          {status.status === "error" && onReconnect && (
            <button
              onClick={onReconnect}
              className="mt-2 text-xs bg-red-700 hover:bg-red-600 px-3 py-1 rounded transition-colors"
            >
              Try Again
            </button>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => setVisible(false)}
          className={`text-xs opacity-60 hover:opacity-100 transition-opacity ${config.textColor}`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
