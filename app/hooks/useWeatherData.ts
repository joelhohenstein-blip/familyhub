import { useState, useEffect } from 'react';
import { trpc } from '../utils/trpc';
import type { WeatherData } from '../utils/weatherApi';

export interface WeatherState {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  cached: boolean;
}

/**
 * Custom hook for fetching and caching weather data using tRPC
 * Implements session-based caching to reduce API calls
 */
export function useWeatherData(
  latitude: number | null,
  longitude: number | null,
  locale: string = 'en'
) {
  const [sessionCached, setSessionCached] = useState(false);

  // Use tRPC query hook for fetching weather
  const {
    data: weatherData,
    isLoading: weatherLoading,
    error: weatherError,
    refetch: tRpcRefetch,
  } = trpc.weather.fetchWeather.useQuery(
    {
      latitude: latitude || 0,
      longitude: longitude || 0,
      locale,
    },
    {
      enabled: latitude !== null && longitude !== null,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  useEffect(() => {
    // Check session cache when coordinates are available
    if (latitude && longitude) {
      const cached = sessionStorage.getItem(
        `weather_${latitude}_${longitude}`
      );
      if (cached) {
        setSessionCached(true);
      }
    }
  }, [latitude, longitude]);

  const refetch = () => {
    // Clear session cache
    if (latitude && longitude) {
      sessionStorage.removeItem(`weather_${latitude}_${longitude}`);
    }
    setSessionCached(false);
    tRpcRefetch();
  };

  const error = weatherError?.message || null;

  return {
    data: weatherData || null,
    loading: weatherLoading,
    error,
    cached: sessionCached,
    refetch,
  };
}
