'use client';

import React from 'react';
import { Cloud, CloudRain, Sun, Wind, Droplets, CloudSnow, CloudDrizzle } from 'lucide-react';
import { getWeatherIconUrl, formatTemperature } from '../../utils/weatherApi';

interface WeatherCardProps {
  data: {
    temp: number;
    feelsLike: number;
    humidity: number;
    description: string;
    icon: string;
    windSpeed: number;
  };
  location: string;
  locale: string;
}

/**
 * Individual weather card component for displaying current conditions
 */
export default function WeatherCard({ data, location, locale }: WeatherCardProps) {
  const getWeatherIcon = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('rain')) {
      return <CloudRain className="w-16 h-16 text-blue-500" />;
    } else if (desc.includes('cloud')) {
      return <Cloud className="w-16 h-16 text-gray-500" />;
    } else if (desc.includes('clear') || desc.includes('sunny')) {
      return <Sun className="w-16 h-16 text-yellow-500" />;
    } else if (desc.includes('snow')) {
      return <CloudSnow className="w-16 h-16 text-blue-300" />;
    } else if (desc.includes('drizzle')) {
      return <CloudDrizzle className="w-16 h-16 text-cyan-500" />;
    }
    return <Cloud className="w-16 h-16 text-gray-400" />;
  };

  return (
    <div className="bg-white dark:bg-slate-700 rounded-xl p-6 shadow-md">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{location}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold text-gray-900 dark:text-white">
              {Math.round(data.temp)}
            </span>
            <span className="text-2xl text-gray-600 dark:text-gray-300">°C</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          {getWeatherIcon(data.description)}
          <p className="text-gray-700 dark:text-gray-300 mt-2 font-medium text-center">
            {data.description}
          </p>
        </div>
      </div>

      <div className="flex gap-4 text-sm">
        <div className="flex-1">
          <p className="text-gray-600 dark:text-gray-400 mb-1">Feels like</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {Math.round(data.feelsLike)}°C
          </p>
        </div>
        <div className="flex-1">
          <p className="text-gray-600 dark:text-gray-400 mb-1">Humidity</p>
          <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
            <Droplets className="w-4 h-4 text-blue-500" />
            {data.humidity}%
          </p>
        </div>
        <div className="flex-1">
          <p className="text-gray-600 dark:text-gray-400 mb-1">Wind</p>
          <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
            <Wind className="w-4 h-4 text-cyan-500" />
            {Math.round(data.windSpeed)} m/s
          </p>
        </div>
      </div>
    </div>
  );
}
