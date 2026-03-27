import { pgTable, text, real, timestamp, integer, uuid } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './auth';

/**
 * Weather cache table - stores cached weather data per user
 */
export const weatherCacheTable = pgTable('weather_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  locationName: text('location_name'),
  currentTemp: real('current_temp'),
  humidity: integer('humidity'),
  description: text('description'),
  feelsLike: real('feels_like'),
  windSpeed: real('wind_speed'),
  weatherData: text('weather_data'), // JSON stringified forecast data
  cachedAt: timestamp('cached_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});

/**
 * User location preferences table - stores saved locations and preferences
 */
export const userLocationTable = pgTable('user_location', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  locationName: text('location_name'),
  isDefault: integer('is_default').default(1), // boolean as 0/1
  locale: text('locale').default('en'), // user's preferred locale
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const weatherCacheRelations = relations(weatherCacheTable, ({ one }) => ({
  user: one(users, {
    fields: [weatherCacheTable.userId],
    references: [users.id],
  }),
}));

export const userLocationRelations = relations(userLocationTable, ({ one }) => ({
  user: one(users, {
    fields: [userLocationTable.userId],
    references: [users.id],
  }),
}));
