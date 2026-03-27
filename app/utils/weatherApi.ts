import axios from 'axios';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = process.env.OPENWEATHER_API_BASE_URL || 'https://api.openweathermap.org/data/2.5';

if (!OPENWEATHER_API_KEY) {
  console.warn('⚠️ OPENWEATHER_API_KEY is not set in environment variables');
}

export interface WeatherData {
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    description: string;
    icon: string;
    windSpeed: number;
  };
  forecast: Array<{
    date: string;
    temp: number;
    tempMax: number;
    tempMin: number;
    description: string;
    icon: string;
    humidity: number;
  }>;
  location: {
    name: string;
    country: string;
    lat: number;
    lon: number;
  };
  cached?: boolean;
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  name: string;
  country: string;
}

/**
 * Fetch weather data for given coordinates
 */
export async function fetchWeatherByCoordinates(
  latitude: number,
  longitude: number,
  locale: string = 'en'
): Promise<WeatherData> {
  try {
    // Fetch current weather and forecast in one call
    const response = await axios.get(`${BASE_URL}/forecast`, {
      params: {
        lat: latitude,
        lon: longitude,
        appid: OPENWEATHER_API_KEY,
        units: 'metric',
        lang: mapLocaleToWeatherLang(locale),
      },
      timeout: 5000,
    });

    const data = response.data;

    // Get current conditions from first forecast item
    const current = data.list[0];
    const currentData = {
      temp: current.main.temp,
      feelsLike: current.main.feels_like,
      humidity: current.main.humidity,
      description: current.weather[0].main,
      icon: current.weather[0].icon,
      windSpeed: current.wind.speed,
    };

    // Get forecast for next 4 days (at 12:00 each day)
    const forecastData = [];
    const seenDates = new Set();

    for (const item of data.list) {
      const date = new Date(item.dt * 1000);
      const dateStr = date.toISOString().split('T')[0];

      // Get one forecast per day at noon
      if (!seenDates.has(dateStr) && item.dt_txt.includes('12:00:00')) {
        seenDates.add(dateStr);
        forecastData.push({
          date: dateStr,
          temp: item.main.temp,
          tempMax: item.main.temp_max,
          tempMin: item.main.temp_min,
          description: item.weather[0].main,
          icon: item.weather[0].icon,
          humidity: item.main.humidity,
        });

        if (forecastData.length >= 4) break;
      }
    }

    return {
      current: currentData,
      forecast: forecastData,
      location: {
        name: data.city.name,
        country: data.city.country,
        lat: data.city.coord.lat,
        lon: data.city.coord.lon,
      },
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Weather API error: ${error.message}`);
    }
    throw new Error('Failed to fetch weather data');
  }
}

/**
 * Geocode location name to coordinates
 */
export async function geocodeLocation(
  locationName: string,
  locale: string = 'en'
): Promise<GeocodeResult> {
  try {
    const response = await axios.get(`${BASE_URL}/weather`, {
      params: {
        q: locationName,
        appid: OPENWEATHER_API_KEY,
        units: 'metric',
        lang: mapLocaleToWeatherLang(locale),
      },
      timeout: 5000,
    });

    const data = response.data;
    return {
      lat: data.coord.lat,
      lon: data.coord.lon,
      name: data.name,
      country: data.sys.country,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Geocoding error: ${error.message}`);
    }
    throw new Error('Failed to geocode location');
  }
}

/**
 * Map browser locale to OpenWeather API language code
 */
function mapLocaleToWeatherLang(locale: string): string {
  const langMap: Record<string, string> = {
    en: 'en',
    es: 'es',
    fr: 'fr',
    de: 'de',
    it: 'it',
    pt: 'pt',
    ru: 'ru',
    ja: 'ja',
    zh: 'zh_cn',
  };

  const lang = locale.split('-')[0].toLowerCase();
  return langMap[lang] || 'en';
}

/**
 * Get weather icon URL from OpenWeather icon code
 */
export function getWeatherIconUrl(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

/**
 * Format temperature for display
 */
export function formatTemperature(temp: number): string {
  return `${Math.round(temp)}°C`;
}

/**
 * Format date for display
 */
export function formatWeatherDate(dateStr: string, locale: string = 'en'): string {
  const date = new Date(dateStr + 'T00:00:00Z');
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(date);
}
