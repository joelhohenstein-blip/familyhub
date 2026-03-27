import { useState, useEffect, useCallback } from 'react';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeolocationState {
  location: Location | null;
  error: string | null;
  loading: boolean;
  isSupported: boolean;
}

/**
 * Custom hook for browser geolocation API with permission handling
 * Provides automatic geolocation detection or manual location entry fallback
 */
export function useGeolocation(): GeolocationState & {
  requestLocation: () => void;
  clearLocation: () => void;
} {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: false,
    isSupported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
  });

  // Check session storage for cached location
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('user_location');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setState((prev) => ({
            ...prev,
            location: parsed,
          }));
        } catch (e) {
          // Invalid cached location, ignore
        }
      }
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!state.isSupported) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        // Cache in session storage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('user_location', JSON.stringify(location));
        }

        setState((prev) => ({
          ...prev,
          location,
          loading: false,
          error: null,
        }));
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }

        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [state.isSupported]);

  const clearLocation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      location: null,
      error: null,
    }));

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('user_location');
    }
  }, []);

  return {
    ...state,
    requestLocation,
    clearLocation,
  };
}
