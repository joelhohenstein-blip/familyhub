import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { trpc } from "~/utils/trpc";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { AlertCircle, CheckCircle, Circle, Zap } from "lucide-react";

export function IntegrationsConfigPanel() {
  const [webSocketEnabled, setWebSocketEnabled] = useState(true);
  const [jitsiEnabled, setJitsiEnabled] = useState(true);
  const [jitsiServerUrl, setJitsiServerUrl] = useState(
    "https://meet.jit.si"
  );
  const [weatherEnabled, setWeatherEnabled] = useState(true);
  const [i18nEnabled, setI18nEnabled] = useState(true);
  const [i18nDefaultLocale, setI18nDefaultLocale] = useState("en-US");

  // Fetch integration settings
  const { data: settings } = trpc.integrations.getIntegrationSettings.useQuery(
    undefined,
    {
      onSuccess: (data) => {
        setWebSocketEnabled(data?.webSocketEnabled ?? true);
        setJitsiEnabled(data?.jitsiEnabled ?? true);
        setJitsiServerUrl(data?.jitsiServerUrl || "https://meet.jit.si");
        setWeatherEnabled(data?.weatherEnabled ?? true);
        setI18nEnabled(data?.i18nEnabled ?? true);
        setI18nDefaultLocale(data?.i18nDefaultLocale || "en-US");
      },
    }
  );

  // WebSocket health check
  const { data: wsHealth, refetch: refetchWsHealth } = trpc.integrations.checkWebSocketHealth.useQuery(
    undefined,
    {
      enabled: webSocketEnabled,
    }
  );

  // Update WebSocket settings
  const updateWebSocketMutation = trpc.integrations.updateWebSocketSettings.useMutation();

  // Update Jitsi settings
  const updateJitsiMutation = trpc.integrations.updateJitsiSettings.useMutation();

  // Update weather settings
  const updateWeatherMutation = trpc.integrations.updateWeatherSettings.useMutation();

  // Update i18n settings
  const updateI18nMutation = trpc.integrations.updateI18nSettings.useMutation();

  const handleWebSocketToggle = async (enabled: boolean) => {
    setWebSocketEnabled(enabled);
    try {
      await updateWebSocketMutation.mutateAsync({ enabled });
      refetchWsHealth();
    } catch (error) {
      console.error("Failed to update WebSocket settings:", error);
      setWebSocketEnabled(!enabled);
    }
  };

  const handleJitsiToggle = async (enabled: boolean) => {
    setJitsiEnabled(enabled);
    try {
      await updateJitsiMutation.mutateAsync({
        enabled,
        serverUrl: jitsiServerUrl,
      });
    } catch (error) {
      console.error("Failed to update Jitsi settings:", error);
      setJitsiEnabled(!enabled);
    }
  };

  const handleWeatherToggle = async (enabled: boolean) => {
    setWeatherEnabled(enabled);
    try {
      await updateWeatherMutation.mutateAsync({
        enabled,
        dataSource: "geolocation",
        localeDetection: true,
      });
    } catch (error) {
      console.error("Failed to update weather settings:", error);
      setWeatherEnabled(!enabled);
    }
  };

  const handleI18nToggle = async (enabled: boolean) => {
    setI18nEnabled(enabled);
    try {
      await updateI18nMutation.mutateAsync({
        enabled,
        defaultLocale: i18nDefaultLocale,
        browserDetection: true,
      });
    } catch (error) {
      console.error("Failed to update i18n settings:", error);
      setI18nEnabled(!enabled);
    }
  };

  const getHealthIcon = (status?: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "degraded":
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case "offline":
        return <Circle className="w-5 h-5 text-red-600" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>WebSocket Real-time Updates</CardTitle>
          <CardDescription>
            Enable/disable real-time communication for live events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="websocket-toggle" className="text-base">
              WebSocket Real-time Updates
            </Label>
            <Switch
              id="websocket-toggle"
              checked={webSocketEnabled}
              onCheckedChange={handleWebSocketToggle}
              disabled={updateWebSocketMutation.isPending}
            />
          </div>

          {webSocketEnabled && wsHealth && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                {getHealthIcon(wsHealth.status || undefined)}
                <span className="font-semibold">
                  Status: {(wsHealth.status || "unknown").toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-700">{wsHealth.message || "No message"}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetchWsHealth()}
              >
                Refresh Health Check
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jitsi Video Bridge</CardTitle>
          <CardDescription>
            Configure video conferencing settings for family calls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="jitsi-toggle" className="text-base">
              Jitsi Video Conferencing
            </Label>
            <Switch
              id="jitsi-toggle"
              checked={jitsiEnabled}
              onCheckedChange={handleJitsiToggle}
              disabled={updateJitsiMutation.isPending}
            />
          </div>

          {jitsiEnabled && (
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="jitsi-url" className="text-sm">
                  Jitsi Server URL
                </Label>
                <Input
                  id="jitsi-url"
                  type="url"
                  value={jitsiServerUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJitsiServerUrl(e.target.value)}
                  placeholder="https://meet.jit.si"
                />
              </div>
              <p className="text-xs text-gray-600">
                Current server: {jitsiServerUrl}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weather Widget</CardTitle>
          <CardDescription>
            Enable/disable local weather display with automatic locale detection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="weather-toggle" className="text-base">
              Weather Widget
            </Label>
            <Switch
              id="weather-toggle"
              checked={weatherEnabled}
              onCheckedChange={handleWeatherToggle}
              disabled={updateWeatherMutation.isPending}
            />
          </div>

          {weatherEnabled && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Zap className="w-4 h-4" />
                <span>Browser locale auto-detection is enabled</span>
              </div>
              <p className="text-xs text-blue-600">
                Users' local weather will be displayed based on their browser
                location settings
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Internationalization (i18n)</CardTitle>
          <CardDescription>
            Configure language settings and browser language detection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="i18n-toggle" className="text-base">
              Internationalization
            </Label>
            <Switch
              id="i18n-toggle"
              checked={i18nEnabled}
              onCheckedChange={handleI18nToggle}
              disabled={updateI18nMutation.isPending}
            />
          </div>

          {i18nEnabled && (
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="default-locale" className="text-sm">
                  Default Locale
                </Label>
                <Input
                  id="default-locale"
                  value={i18nDefaultLocale}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setI18nDefaultLocale(e.target.value)}
                  placeholder="en-US"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded">
                <CheckCircle className="w-4 h-4" />
                <span>Browser language detection is enabled</span>
              </div>
              <p className="text-xs text-gray-600">
                Users will see content in their browser's preferred language when
                available, falling back to: {i18nDefaultLocale}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm">Integration Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>WebSocket</span>
            <span className="font-semibold">
              {webSocketEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Jitsi</span>
            <span className="font-semibold">
              {jitsiEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Weather</span>
            <span className="font-semibold">
              {weatherEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>i18n</span>
            <span className="font-semibold">
              {i18nEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
