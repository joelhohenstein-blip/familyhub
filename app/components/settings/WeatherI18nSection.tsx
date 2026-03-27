import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { trpc } from "../../utils/trpc";
import { Loader2 } from "lucide-react";

type Language = "en" | "es" | "fr";

export function WeatherI18nSection() {
  const getSettingsQuery = trpc.settings.getSettings.useQuery();
  const updateSettingsMutation = trpc.settings.updateSettings.useMutation();

  const [language, setLanguage] = useState<Language>("en");
  const [enableWeather, setEnableWeather] = useState(true);
  const [weatherCacheDuration, setWeatherCacheDuration] = useState(600);
  const [locationDetection, setLocationDetection] = useState(true);

  useEffect(() => {
    if (getSettingsQuery.data) {
      setLanguage((getSettingsQuery.data.language || "en") as Language);
      setEnableWeather(true); // Always show weather widget
      setWeatherCacheDuration(getSettingsQuery.data.weatherCacheDuration ?? 600);
      setLocationDetection(getSettingsQuery.data.locationDetectionEnabled ?? true);
    }
  }, [getSettingsQuery.data]);

  const handleSave = async () => {
    try {
      await updateSettingsMutation.mutateAsync({
        language,
        weatherCacheDuration,
        locationDetectionEnabled: locationDetection,
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
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Weather & Language</h2>

        <div className="space-y-6">
          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Interface Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="en">English</option>
              <option value="es">Español (Spanish)</option>
              <option value="fr">Français (French)</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Changes will apply after page refresh
            </p>
          </div>

          {/* Weather Settings */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="font-semibold text-slate-900 mb-4">Weather Widget</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Weather Cache Duration (seconds)
                </label>
                <input
                  type="number"
                  value={weatherCacheDuration}
                  onChange={(e) => setWeatherCacheDuration(parseInt(e.target.value) || 600)}
                  min="60"
                  max="3600"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 mt-1">
                  How often to refresh weather data (60-3600 seconds)
                </p>
              </div>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={locationDetection}
                  onChange={(e) => setLocationDetection(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">
                  Auto-detect location for weather
                </span>
              </label>
            </div>
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
