import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { trpc } from "../../utils/trpc";
import { Loader2, Eye, EyeOff } from "lucide-react";

type ContentRating = "G" | "PG" | "PG-13" | "R";

export function StreamingTheaterSection() {
  const getSettingsQuery = trpc.settings.getSettings.useQuery();
  const updateSettingsMutation = trpc.settings.updateSettings.useMutation();

  const [enableStreaming, setEnableStreaming] = useState(true);
  const [streamingSources, setStreamingSources] = useState<string[]>([
    "pluto",
    "tubi",
    "roku",
    "freeview",
  ]);
  const [contentFilterAge, setContentFilterAge] = useState(13);
  const [parentalControlPin, setParentalControlPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    if (getSettingsQuery.data) {
      setEnableStreaming(true); // Always enable for now
      const sources = getSettingsQuery.data.streamingSourcesEnabled as Record<string, boolean> | null;
      if (sources) {
        setStreamingSources(Object.keys(sources).filter((key) => sources[key]));
      }
      setContentFilterAge(getSettingsQuery.data.contentFilterAge || 13);
      setParentalControlPin(getSettingsQuery.data.parentalControlPin || "");
    }
  }, [getSettingsQuery.data]);

  const handleSave = async () => {
    try {
      const sourcesObj = {
        pluto: streamingSources.includes("pluto"),
        tubi: streamingSources.includes("tubi"),
        roku: streamingSources.includes("roku"),
        freeview: streamingSources.includes("freeview"),
      };

      await updateSettingsMutation.mutateAsync({
        streamingSourcesEnabled: sourcesObj,
        contentFilterAge,
        parentalControlPin: parentalControlPin || null,
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

  const availableSources = [
    { id: "pluto", name: "Pluto TV" },
    { id: "tubi", name: "Tubi" },
    { id: "roku", name: "Roku Channel" },
    { id: "freeview", name: "Freeview" },
  ];

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <div className="p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Streaming Theater</h2>

        <div className="space-y-6">
          {/* Streaming Sources */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-3">
              Available Streaming Services
            </label>
            <div className="space-y-2">
              {availableSources.map((source) => (
                <label
                  key={source.id}
                  className="flex items-center space-x-3 cursor-pointer p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={streamingSources.includes(source.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setStreamingSources([...streamingSources, source.id]);
                      } else {
                        setStreamingSources(
                          streamingSources.filter((s) => s !== source.id)
                        );
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {source.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Content Age Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Minimum Content Age Filter
            </label>
            <select
              value={contentFilterAge}
              onChange={(e) => setContentFilterAge(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={0}>All Ages (G)</option>
              <option value={7}>7+ (PG)</option>
              <option value={13}>13+ (PG-13)</option>
              <option value={17}>17+ (R)</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Only content appropriate for this age or older will be available
            </p>
          </div>

          {/* Parental Control PIN */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Parental Control PIN (optional)
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                value={parentalControlPin}
                onChange={(e) => setParentalControlPin(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                placeholder="Enter 4-digit PIN"
                maxLength={4}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-700"
              >
                {showPin ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Require PIN to access restricted content
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
