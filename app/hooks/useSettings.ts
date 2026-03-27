import { useState, useEffect } from "react";
import { trpc } from "../utils/trpc";

type SettingsData = any;

interface UseSettingsReturn {
  settings: SettingsData | null;
  loading: boolean;
  error: Error | null;
  updateSettings: (updates: Partial<SettingsData>) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const getSettingsQuery = trpc.settings.getSettings.useQuery();
  const updateSettingsMutation = trpc.settings.updateSettings.useMutation();

  useEffect(() => {
    if (getSettingsQuery.data) {
      setSettings(getSettingsQuery.data);
      setLoading(false);
    }
    if (getSettingsQuery.error) {
      const err = new Error("Failed to fetch settings");
      setError(err);
      setLoading(false);
    }
  }, [getSettingsQuery.data, getSettingsQuery.error]);

  const updateSettings = async (updates: Partial<SettingsData>) => {
    try {
      setLoading(true);
      // Optimistic update
      if (settings) {
        setSettings({ ...settings, ...updates });
      }
      const result = await updateSettingsMutation.mutateAsync(updates);
      setSettings(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update settings"));
      // Revert optimistic update on error
      if (getSettingsQuery.data) {
        setSettings(getSettingsQuery.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    try {
      setLoading(true);
      await getSettingsQuery.refetch();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to refresh settings"));
    } finally {
      setLoading(false);
    }
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    refresh,
  };
}
