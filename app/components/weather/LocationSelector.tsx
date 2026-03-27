'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { geocodeLocation } from '../../utils/weatherApi';

interface LocationSelectorProps {
  onLocationSelect?: () => void;
}

type SearchMode = 'city' | 'zip';

/**
 * Component for geolocation detection UI and manual location fallback
 */
export default function LocationSelector({ onLocationSelect }: LocationSelectorProps) {
  const { t } = useTranslation();
  const [searchMode, setSearchMode] = useState<SearchMode>('city');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const handleManualLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError('');

    try {
      const result = await geocodeLocation(
        searchQuery,
        navigator.language.split('-')[0]
      );

      if (result) {
        // Save location to session storage
        sessionStorage.setItem(
          'user_location',
          JSON.stringify({
            latitude: result.lat,
            longitude: result.lon,
          })
        );

        // Trigger parent to refetch
        if (onLocationSelect) {
          onLocationSelect();
        }

        setSearchQuery('');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('weather.locationNotFound')
      );
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="w-full">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          {t('weather.enterLocation')}
        </h3>

        {/* Quick Info about the two options */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-xs bg-white dark:bg-slate-700 rounded p-2 border border-blue-100 dark:border-blue-800">
            <p className="font-medium text-gray-800 dark:text-gray-100">🏙️ City & State</p>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Best if you know your city name (works worldwide)</p>
          </div>
          <div className="text-xs bg-white dark:bg-slate-700 rounded p-2 border border-blue-100 dark:border-blue-800">
            <p className="font-medium text-gray-800 dark:text-gray-100">📮 Postal Code</p>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Best if you know your zip or postal code</p>
          </div>
        </div>

        <form onSubmit={handleManualLocation} className="space-y-3">
          {/* Mode Selector Tabs */}
          <div className="flex gap-2 border-b border-blue-200 dark:border-blue-700">
            <button
              type="button"
              onClick={() => {
                setSearchMode('city');
                setSearchQuery('');
                setError('');
              }}
              className={`pb-2 px-1 font-medium transition-colors ${
                searchMode === 'city'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
            >
              City & State/Country
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchMode('zip');
                setSearchQuery('');
                setError('');
              }}
              className={`pb-2 px-1 font-medium transition-colors ${
                searchMode === 'zip'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
            >
              Zip/Postal Code
            </button>
          </div>

          {/* Input Field */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                searchMode === 'city'
                  ? 'e.g., Los Angeles, CA or London, UK or Tokyo, Japan'
                  : 'e.g., 90210 (USA) or M5V 3A8 (Canada) or SW1A 1AA (UK)'
              }
              className="flex-1 px-4 py-2 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={searching}
            />
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {searching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('weather.searching')}
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  {t('weather.search')}
                </>
              )}
            </button>
          </div>

          {/* Help text */}
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {searchMode === 'city'
              ? '🌍 Works worldwide! Try "Paris, France", "Sydney, Australia", "Dubai, UAE", etc.'
              : '🌍 Works worldwide! Try any postal code format (US, Canada, UK, etc.)'}
          </p>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <p className="text-xs text-gray-600 dark:text-gray-400">
            {t('weather.orEnableLocation')}
          </p>
        </form>
      </div>
    </div>
  );
}
