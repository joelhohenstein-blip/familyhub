import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { trpc } from "../../utils/trpc";
import { Loader2 } from "lucide-react";

export function MediaGallerySection() {
  const getSettingsQuery = trpc.settings.getSettings.useQuery();
  const updateSettingsMutation = trpc.settings.updateSettings.useMutation();

  const [maxUploadSize, setMaxUploadSize] = useState(52428800); // 50MB
  const [mediaRetentionDays, setMediaRetentionDays] = useState(365);

  useEffect(() => {
    if (getSettingsQuery.data) {
      setMaxUploadSize(getSettingsQuery.data.mediaUploadSizeLimit ?? 52428800);
      setMediaRetentionDays(getSettingsQuery.data.mediaRetentionDays ?? 365);
    }
  }, [getSettingsQuery.data]);

  const handleSave = async () => {
    try {
      await updateSettingsMutation.mutateAsync({
        mediaUploadSizeLimit: maxUploadSize,
        mediaRetentionDays,
      });
    } catch (error) {
      console.error("Failed to update settings:", error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
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
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Media Gallery Settings</h2>

        <div className="space-y-6">
          {/* Max Upload Size */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Maximum Upload Size
            </label>
            <select
              value={maxUploadSize}
              onChange={(e) => setMaxUploadSize(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={1048576}>1 MB</option>
              <option value={5242880}>5 MB</option>
              <option value={10485760}>10 MB</option>
              <option value={52428800}>50 MB</option>
              <option value={104857600}>100 MB</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Current limit: {formatBytes(maxUploadSize)}
            </p>
          </div>

          {/* Supported Formats Info */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-3">
              Supported File Formats
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg">
              {["JPG", "PNG", "GIF", "WEBP", "MP4", "WEBM", "MOV", "AVI"].map((format) => (
                <div key={format} className="text-sm font-medium text-slate-700">
                  .{format}
                </div>
              ))}
            </div>
          </div>

          {/* Media Retention */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Media Retention Period (days)
            </label>
            <input
              type="number"
              value={mediaRetentionDays}
              onChange={(e) => setMediaRetentionDays(parseInt(e.target.value) || 365)}
              min="7"
              max="3650"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              Media will be automatically deleted after this period (7-3650 days)
            </p>
          </div>

          {/* Save Button */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
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
