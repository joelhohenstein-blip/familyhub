import { z } from 'zod';
import { router, procedure } from '../trpc';
import { weatherCacheTable, userLocationTable } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { fetchWeatherByCoordinates, geocodeLocation, WeatherData } from '../../../utils/weatherApi';

// Validation schemas
export const fetchWeatherSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locale: z.string().default('en'),
});

export const saveLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationName: z.string().optional(),
  locale: z.string().default('en'),
});

export const getLocationSchema = z.object({
  userId: z.string(),
});

export const weatherRouter = router({
  /**
   * Fetch weather data for given coordinates with caching
   */
  fetchWeather: procedure
    .input(fetchWeatherSchema)
    .query(async ({ ctx, input }) => {
      try {
        // Check if user is authenticated
        if (!ctx.user?.id) {
          throw new Error('Unauthorized');
        }

        // Check cache first (5 minute cache)
        const cached = await ctx.db
          .select()
          .from(weatherCacheTable)
          .where(eq(weatherCacheTable.userId, ctx.user.id))
          .limit(1);

        const now = new Date();
        if (
          cached.length > 0 &&
          cached[0].expiresAt &&
          new Date(cached[0].expiresAt) > now
        ) {
          // Return cached data
          const cachedData = cached[0].weatherData
            ? JSON.parse(cached[0].weatherData)
            : null;
          return {
            ...cachedData,
            cached: true,
          };
        }

        // Fetch fresh data
        const weatherData = await fetchWeatherByCoordinates(
          input.latitude,
          input.longitude,
          input.locale
        );

        // Cache for 5 minutes
        const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

        // Update or insert cache
        await ctx.db
          .insert(weatherCacheTable)
          .values({
            userId: ctx.user.id,
            latitude: input.latitude,
            longitude: input.longitude,
            locationName: weatherData.location.name,
            currentTemp: weatherData.current.temp,
            humidity: weatherData.current.humidity,
            description: weatherData.current.description,
            feelsLike: weatherData.current.feelsLike,
            windSpeed: weatherData.current.windSpeed,
            weatherData: JSON.stringify(weatherData),
            expiresAt,
          })
          .onConflictDoUpdate({
            target: weatherCacheTable.userId,
            set: {
              latitude: input.latitude,
              longitude: input.longitude,
              locationName: weatherData.location.name,
              currentTemp: weatherData.current.temp,
              humidity: weatherData.current.humidity,
              description: weatherData.current.description,
              feelsLike: weatherData.current.feelsLike,
              windSpeed: weatherData.current.windSpeed,
              weatherData: JSON.stringify(weatherData),
              expiresAt,
              cachedAt: new Date(),
            },
          });

        return {
          ...weatherData,
          cached: false,
        };
      } catch (error) {
        console.error('Weather fetch error:', error);
        throw new Error('Failed to fetch weather data');
      }
    }),

  /**
   * Save user location preference
   */
  saveLocation: procedure
    .input(saveLocationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user?.id) {
          throw new Error('Unauthorized');
        }

        const [location] = await ctx.db
          .insert(userLocationTable)
          .values({
            userId: ctx.user.id,
            latitude: input.latitude,
            longitude: input.longitude,
            locationName: input.locationName || 'Custom Location',
            locale: input.locale,
            isDefault: 1,
          })
          .onConflictDoUpdate({
            target: userLocationTable.userId,
            set: {
              latitude: input.latitude,
              longitude: input.longitude,
              locationName: input.locationName || 'Custom Location',
              locale: input.locale,
              updatedAt: new Date(),
            },
          })
          .returning();

        return location;
      } catch (error) {
        console.error('Save location error:', error);
        throw new Error('Failed to save location');
      }
    }),

  /**
   * Get user's saved location
   */
  getLocation: procedure
    .input(getLocationSchema)
    .query(async ({ ctx, input }) => {
      try {
        const location = await ctx.db
          .select()
          .from(userLocationTable)
          .where(eq(userLocationTable.userId, input.userId))
          .limit(1);

        return location[0] || null;
      } catch (error) {
        console.error('Get location error:', error);
        throw new Error('Failed to get location');
      }
    }),

  /**
   * Get cached weather data
   */
  getWeatherCache: procedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user?.id) {
        throw new Error('Unauthorized');
      }

      const cached = await ctx.db
        .select()
        .from(weatherCacheTable)
        .where(eq(weatherCacheTable.userId, ctx.user.id))
        .limit(1);

      if (!cached.length) {
        return null;
      }

      const cache = cached[0];
      return {
        latitude: cache.latitude,
        longitude: cache.longitude,
        locationName: cache.locationName,
        temp: cache.currentTemp,
        humidity: cache.humidity,
        description: cache.description,
        feelsLike: cache.feelsLike,
        windSpeed: cache.windSpeed,
        data: cache.weatherData ? JSON.parse(cache.weatherData) : null,
        cachedAt: cache.cachedAt,
        isExpired:
          cache.expiresAt && new Date(cache.expiresAt) < new Date(),
      };
    } catch (error) {
      console.error('Get weather cache error:', error);
      throw new Error('Failed to get weather cache');
    }
  }),

  /**
   * Geocode a location name to coordinates
   */
  geocodeLocation: procedure
    .input(z.object({ locationName: z.string(), locale: z.string().default('en') }))
    .query(async ({ input }) => {
      try {
        const result = await geocodeLocation(input.locationName, input.locale);
        return result;
      } catch (error) {
        console.error('Geocode error:', error);
        throw new Error('Failed to geocode location');
      }
    }),
});
