'use client';

import React from 'react';
import { Cloud, CloudRain, Sun, CloudSnow, CloudDrizzle } from 'lucide-react';
import { formatWeatherDate } from '../../utils/weatherApi';

interface ForecastCardProps {
  forecast: {
    date: string;
    temp: number;
    tempMax: number;
    tempMin: number;
    description: string;
    icon: string;
    humidity: number;
  };
  locale: string;
}

/**
 * Forecast card component for displaying upcoming weather conditions
 */
export default function ForecastCard({ forecast, locale }: ForecastCardProps) {
  const getWeatherIcon = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('rain')) {
      return <CloudRain className="w-8 h-8 text-blue-500" />;
    } else if (desc.includes('cloud')) {
      return <Cloud className="w-8 h-8 text-gray-500" />;
    } else if (desc.includes('clear') || desc.includes('sunny')) {
      return <Sun className="w-8 h-8 text-yellow-500" />;
    } else if (desc.includes('snow')) {
      return <CloudSnow className="w-8 h-8 text-blue-300" />;
    } else if (desc.includes('drizzle')) {
      return <CloudDrizzle className="w-8 h-8 text-cyan-500" />;
    }
    return <Cloud className="w-8 h-8 text-gray-400" />;
  };

  return (
    <div className="bg-white dark:bg-slate-700 rounded-lg p-3 text-center shadow-sm hover:shadow-md transition-shadow">
      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-2">
        {formatWeatherDate(forecast.date, locale)}
      </p>

      <div className="flex justify-center mb-2">
        {getWeatherIcon(forecast.description)}
      </div>

      <div className="mb-2">
        <p className="text-lg font-bold text-gray-900 dark:text-white">
          {Math.round(forecast.temp)}°
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {Math.round(forecast.tempMax)}° / {Math.round(forecast.tempMin)}°
        </p>
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
        {forecast.description}
      </p>

      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
        💧 {forecast.humidity}%
      </p>
    </div>
  );
}
