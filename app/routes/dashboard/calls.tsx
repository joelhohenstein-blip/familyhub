import { useLoaderData, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { trpc } from "~/utils/trpc";
import { Phone, Video, Users, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { redirect } from "react-router";
import type { Route } from "./+types/calls";
import { callTrpc } from "~/utils/trpc.server";
import { AppSidebar } from "~/components/app-sidebar";
import { SiteHeader } from "~/components/site-header";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";

// Loader for authentication check
export async function loader({ context, request }: Route.LoaderArgs) {
  const caller = await callTrpc(request);
  const { isSignedIn, user } = await caller.auth.me();

  if (!isSignedIn || !user?.id) {
    return redirect("/login");
  }

  // Get user's first family
  let familyId = "default-family-id";
  try {
    const result = await caller.families.getAll({});
    if (result.families.length > 0) {
      familyId = result.families[0].id;
    }
  } catch (error) {
    console.error("Error fetching families:", error);
  }

  return { user, familyId };
}

interface CallItem {
  id: string;
  roomName: string;
  status: "active" | "ended" | "pending";
  createdAt: Date;
  startedAt?: Date | null;
  endedAt?: Date | null;
  participantCount: number;
}

export default function CallsDashboard() {
  const navigate = useNavigate();
  const loaderData = useLoaderData<typeof loader>();
  const [calls, setCalls] = useState<CallItem[]>([]);
  const [isCreatingCall, setIsCreatingCall] = useState(false);

  // Start new call
  const startCallMutation = trpc.calls.startCall.useMutation({
    onSuccess: (data: any) => {
      navigate(`/dashboard/calls/${data.callId}`);
    },
    onError: (error: any) => {
      console.error("Error starting call:", error);
      alert("Failed to start call. Please try again.");
    },
  });

  const handleStartCall = async () => {
    setIsCreatingCall(true);
    try {
      // Use family ID from loader
      await startCallMutation.mutateAsync({ familyId: loaderData.familyId });
    } finally {
      setIsCreatingCall(false);
    }
  };

  // Mock data for demonstration
  useEffect(() => {
    // In a real app, this would come from the server
    setCalls([
      {
        id: "1",
        roomName: "Family Chat",
        status: "active",
        createdAt: new Date(Date.now() - 300000),
        startedAt: new Date(Date.now() - 300000),
        participantCount: 3,
      },
      {
        id: "2",
        roomName: "Weekly Check-in",
        status: "ended",
        createdAt: new Date(Date.now() - 86400000),
        startedAt: new Date(Date.now() - 86400000),
        endedAt: new Date(Date.now() - 82800000),
        participantCount: 5,
      },
    ]);
  }, []);

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "16rem",
        "--header-height": "3.5rem",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Video Calls" />
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Video className="w-8 h-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Video Calls</h1>
          </div>
          <p className="text-gray-400">
            Connect with your family members through secure video calls
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Start New Call Button */}
          <Button
            onClick={handleStartCall}
            disabled={isCreatingCall || startCallMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-6 rounded-lg flex items-center justify-center gap-2 transition-all"
          >
            <Phone className="w-5 h-5" />
            {isCreatingCall || startCallMutation.isPending
              ? "Starting..."
              : "Start New Call"}
          </Button>

          {/* Quick Stats */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-center gap-4">
            <Users className="w-8 h-8 text-green-400" />
            <div>
              <div className="text-sm text-gray-400">Active Calls</div>
              <div className="text-2xl font-bold text-white">
                {calls.filter((c) => c.status === "active").length}
              </div>
            </div>
          </div>

          {/* Total Calls */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-center gap-4">
            <Video className="w-8 h-8 text-purple-400" />
            <div>
              <div className="text-sm text-gray-400">Total Calls</div>
              <div className="text-2xl font-bold text-white">{calls.length}</div>
            </div>
          </div>
        </div>

        {/* Recent Calls List */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
            <h2 className="text-lg font-semibold text-white">Recent Calls</h2>
          </div>

          {calls.length === 0 ? (
            <div className="p-8 text-center">
              <Video className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
              <p className="text-gray-400">No calls yet. Start a new call to begin!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="px-6 py-4 hover:bg-slate-700/50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-white">{call.roomName}</h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          call.status === "active"
                            ? "bg-green-900/30 text-green-300"
                            : "bg-gray-900/30 text-gray-300"
                        }`}
                      >
                        {call.status === "active" ? "Live" : "Ended"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      <span>
                        {format(
                          new Date(call.createdAt),
                          "MMM d, yyyy h:mm a"
                        )}
                      </span>
                      {call.participantCount && (
                        <span className="ml-4">
                          {call.participantCount}{" "}
                          {call.participantCount === 1
                            ? "participant"
                            : "participants"}
                        </span>
                      )}
                    </div>
                  </div>

                  {call.status === "active" && (
                    <Button
                      onClick={() => navigate(`/dashboard/calls/${call.id}`)}
                      className="gap-2 bg-blue-600 hover:bg-blue-700 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Join
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
