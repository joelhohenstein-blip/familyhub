import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { trpc } from "../../utils/trpc";
import { Loader2 } from "lucide-react";

type VideoQuality = "low" | "medium" | "high";

export function VideoCallsSection() {
  const getSettingsQuery = trpc.settings.getSettings.useQuery();
  const updateSettingsMutation = trpc.settings.updateSettings.useMutation();

  const [videoQuality, setVideoQuality] = useState<VideoQuality>("high");
  const [enableVideo, setEnableVideo] = useState(true);
  const [enableAudio, setEnableAudio] = useState(true);

  useEffect(() => {
    if (getSettingsQuery.data) {
      setVideoQuality((getSettingsQuery.data.videoCallQuality as VideoQuality) || "high");
      setEnableVideo(getSettingsQuery.data.videoEnabled ?? true);
      setEnableAudio(getSettingsQuery.data.audioEnabled ?? true);
    }
  }, [getSettingsQuery.data]);

  const handleSave = async () => {
    try {
      await updateSettingsMutation.mutateAsync({
        videoCallQuality: videoQuality,
        videoEnabled: enableVideo,
        audioEnabled: enableAudio,
      });
    } catch (error) {
      console.error("Failed to update settings:", error);
    }
  };

  if (getSettingsQuery.isLoading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <div className="p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Video Call Settings</h2>

        <div className="space-y-6">
          {/* Video Quality */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Video Quality
            </label>
            <select
              value={videoQuality}
              onChange={(e) => setVideoQuality(e.target.value as VideoQuality)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Low (480p)</option>
              <option value="medium">Medium (720p)</option>
              <option value="high">High (1080p)</option>
            </select>
          </div>

          {/* Audio/Video Toggles */}
          <div className="space-y-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableVideo}
                onChange={(e) => setEnableVideo(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">Enable video by default</span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableAudio}
                onChange={(e) => setEnableAudio(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">Enable audio by default</span>
            </label>
          </div>

          {/* Save Button */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={updateSettingsMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {updateSettingsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
