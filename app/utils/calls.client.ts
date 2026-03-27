/**
 * Generate a unique room name for a Jitsi call
 */
export function generateRoomName(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `room-${timestamp}-${random}`;
}

/**
 * Create a JWT token for Jitsi authentication
 * This is used for secure access to the Jitsi Meet instance
 * Note: For production, this should be generated server-side
 */
export function createCallToken(
  roomName: string,
  userId: string,
  userName: string
): string {
  const payload = {
    iss: process.env.JITSI_APP_ID || "jitsi",
    sub: process.env.JITSI_DOMAIN || "meet.jitsi",
    aud: "jitsi",
    room: roomName,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
    nbf: Math.floor(Date.now() / 1000),
    iat: Math.floor(Date.now() / 1000),
    name: userName,
    email: `${userId}@familyhub.local`,
    moderator: true,
  };

  // For development, return a base64-encoded payload
  // In production, this should be signed server-side with HS256
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

/**
 * Handle connection recovery with exponential backoff
 */
export class ConnectionRecovery {
  private maxRetries: number = 5;
  private baseDelay: number = 1000; // 1 second
  private maxDelay: number = 30000; // 30 seconds
  private retryCount: number = 0;

  async attemptReconnection(
    fn: () => Promise<void>
  ): Promise<{ success: boolean; error?: string }> {
    while (this.retryCount < this.maxRetries) {
      try {
        await fn();
        this.retryCount = 0;
        return { success: true };
      } catch (error) {
        this.retryCount++;
        if (this.retryCount >= this.maxRetries) {
          return {
            success: false,
            error: `Failed to reconnect after ${this.maxRetries} attempts`,
          };
        }

        const delay = Math.min(
          this.baseDelay * Math.pow(2, this.retryCount - 1),
          this.maxDelay
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return { success: false, error: "Max retries exceeded" };
  }

  reset(): void {
    this.retryCount = 0;
  }

  getRetryCount(): number {
    return this.retryCount;
  }
}

/**
 * Validate browser media permissions
 */
export async function checkMediaPermissions(): Promise<{
  audio: boolean;
  video: boolean;
}> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return { audio: false, video: false };
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasAudio = devices.some((device) => device.kind === "audioinput");
    const hasVideo = devices.some((device) => device.kind === "videoinput");

    return { audio: hasAudio, video: hasVideo };
  } catch (error) {
    console.error("Error checking media permissions:", error);
    return { audio: false, video: false };
  }
}

/**
 * Request user media permissions
 */
export async function requestMediaPermissions(
  audio: boolean = true,
  video: boolean = true
): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
      video: video
        ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
        : false,
    });
  } catch (error) {
    console.error("Error requesting media permissions:", error);
    return null;
  }
}
