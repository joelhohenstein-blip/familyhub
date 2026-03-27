'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useWeatherData } from '../../hooks/useWeatherData';
import { Cloud, CloudRain, Sun, Wind, Droplets, MapPin, Loader2 } from 'lucide-react';
import LocationSelector from './LocationSelector';
import WeatherCard from './WeatherCard';
import ForecastCard from './ForecastCard';

/**
 * Main responsive weather widget component
 * Displays current conditions and forecast with geolocation support
 */
export default function WeatherWidget() {
  const { t } = useTranslation();
  const { location, error: geoError, loading: geoLoading, requestLocation } = useGeolocation();
  const [locale, setLocale] = useState('en');

  // Use default location (San Francisco) if geolocation is denied
  const effectiveLocation = location || {
    latitude: 37.7749,
    longitude: -122.4194,
  };

  // Detect browser locale on mount
  useEffect(() => {
    const browserLocale = navigator.language.split('-')[0];
    const supportedLocales = ['en', 'es', 'fr'];
    setLocale(supportedLocales.includes(browserLocale) ? browserLocale : 'en');
  }, []);

  const { 
    data: weatherData, 
    loading: weatherLoading, 
    error: weatherError, 
    cached: isCached,
    refetch 
  } = useWeatherData(
    effectiveLocation?.latitude ?? null,
    effectiveLocation?.longitude ?? null,
    locale
  );

  const isLoading = geoLoading || weatherLoading;
  const error = geoError || weatherError;

  // Auto-request location on mount if not already present
  useEffect(() => {
    if (!location && !geoError) {
      // Try geolocation, but use fallback location if permission denied
      requestLocation();
    }
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Widget Container */}
      <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl shadow-lg border border-blue-100 dark:border-slate-600 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 dark:from-blue-600 dark:via-cyan-500 dark:to-teal-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white text-xl font-bold flex items-center gap-2">
                <Sun className="w-6 h-6" />
                {t('weather.title')}
              </h2>
              {location && (
                <p className="text-blue-50 text-sm mt-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {weatherData?.location?.name || `${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°`}
                </p>
              )}
            </div>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('weather.loading')}
                </>
              ) : (
                t('weather.refresh')
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error State with Fallback */}
          {geoError && !location && (
            <div className="mb-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <p className="text-blue-800 dark:text-blue-200 text-sm">
                  {geoError} Using default location.
                </p>
              </div>
              <LocationSelector onLocationSelect={requestLocation} />
            </div>
          )}

          {/* Loading State */}
          {isLoading && !weatherData && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400">{t('weather.loading')}</p>
            </div>
          )}

          {/* Weather Data Display */}
          {weatherData && (
            <>
              {/* Current Weather */}
              <WeatherCard 
                data={weatherData.current}
                location={weatherData.location.name}
                locale={locale}
              />

              {/* Forecast */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                  {t('weather.forecast')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {weatherData.forecast.map((day: any, index: number) => (
                    <ForecastCard key={index} forecast={day} locale={locale} />
                  ))}
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-700 rounded-lg p-3 text-center">
                  <Wind className="w-6 h-6 mx-auto mb-2 text-cyan-500" />
                  <p className="text-xs text-gray-600 dark:text-gray-400">{t('weather.wind')}</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-white">
                    {Math.round(weatherData.current.windSpeed)} m/s
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-700 rounded-lg p-3 text-center">
                  <Droplets className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                  <p className="text-xs text-gray-600 dark:text-gray-400">{t('weather.humidity')}</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-white">
                    {weatherData.current.humidity}%
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-700 rounded-lg p-3 text-center">
                  <Sun className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                  <p className="text-xs text-gray-600 dark:text-gray-400">{t('weather.feelsLike')}</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-white">
                    {Math.round(weatherData.current.feelsLike)}°C
                  </p>
                </div>
              </div>

              {/* Cache indicator */}
              {isCached && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                  {t('weather.cachedData')}
                </p>
              )}
            </>
          )}

          {/* No Data State */}
          {!isLoading && !weatherData && !error && (
            <div className="text-center py-8">
              <Cloud className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">{t('weather.noData')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
