import { useLoaderData, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { CallRoom } from "~/components/calls/CallRoom";
import { trpc } from "~/utils/trpc";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { redirect } from "react-router";
import type { Route } from "./+types/$callId";
import { callTrpc } from "~/utils/trpc.server";

interface CallLoaderData {
  callId: string;
  user: any;
}

// Loader for authentication check
export async function loader({ request, params }: Route.LoaderArgs) {
  const caller = await callTrpc(request);
  const { isSignedIn, user } = await caller.auth.me();

  if (!isSignedIn || !user?.id) {
    return redirect("/login");
  }

  const callId = params.callId;
  if (!callId) {
    throw new Response("Call ID not found", { status: 404 });
  }

  return {
    callId,
    user,
  } as CallLoaderData;
}

export default function VideoCallRoom() {
  const navigate = useNavigate();
  const { callId, user } = useLoaderData<typeof loader>();
  const [isLoading, setIsLoading] = useState(true);
  const [callData, setCallData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Join call mutation
  const joinCallMutation = trpc.calls.joinCall.useMutation({
    onSuccess: (data: any) => {
      setCallData(data);
      setIsLoading(false);
    },
    onError: (error: any) => {
      console.error("Error joining call:", error);
      setError("Failed to join call. Please try again.");
      setIsLoading(false);
    },
  });

  // End call mutation
  const endCallMutation = trpc.calls.endCall.useMutation({
    onSuccess: () => {
      navigate("/dashboard/calls");
    },
  });

  // Update media state mutation
  const updateMediaMutation = trpc.calls.updateMediaState.useMutation({
    onError: (error: any) => {
      console.error("Error updating media state:", error);
    },
  });

  // Join the call on mount
  useEffect(() => {
    if (!callData) {
      joinCallMutation.mutate({ callId });
    }
  }, [callId, callData, joinCallMutation]);

  const handleCallEnd = () => {
    endCallMutation.mutate({ callId });
  };

  const handleMediaStateChange = (
    audioEnabled: boolean,
    videoEnabled: boolean
  ) => {
    updateMediaMutation.mutate({
      callId,
      audioEnabled,
      videoEnabled,
    });
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-2">Error</h2>
          <p className="text-red-200 mb-6">{error}</p>
          <Button
            onClick={() => navigate("/dashboard/calls")}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Back to Calls
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Loading video call...</p>
          <p className="text-gray-400 text-sm mt-2">
            Preparing your connection
          </p>
        </div>
      </div>
    );
  }

  // Call room
  if (callData) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        {/* Header */}
        <div className="bg-slate-800/50 border-b border-slate-700 px-4 md:px-8 py-3 flex items-center gap-4">
          <Button
            onClick={() => navigate("/dashboard/calls")}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-white">
              {callData.roomName}
            </h1>
            <p className="text-sm text-gray-400">Video Call</p>
          </div>
        </div>

        {/* Call Content */}
        <div className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden">
          <CallRoom
            roomName={callData.roomName}
            userName={user?.name || "User"}
            userEmail={user?.email || "user@example.com"}
            onCallEnd={handleCallEnd}
            onMediaStateChange={handleMediaStateChange}
          />
        </div>
      </div>
    );
  }

  return null;
}
