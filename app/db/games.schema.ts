import { pgTable, text, integer, timestamp, boolean, decimal, varchar, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './schema/auth';

/**
 * Games & Entertainment Schema
 * Supports multiplayer games, leaderboards, achievements, and social features
 */

// Games available in the platform
export const games = pgTable('games', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull(), // 'puzzle', 'trivia', 'board', 'card'
  thumbnail: varchar('thumbnail', { length: 500 }),
  minPlayers: integer('min_players').default(1).notNull(),
  maxPlayers: integer('max_players').default(4).notNull(),
  estimatedDuration: integer('estimated_duration').default(300), // seconds
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('games_category_idx').on(table.category),
]);

// Active game sessions/matches
export const gameSessions = pgTable('game_sessions', {
  id: text('id').primaryKey(),
  gameId: text('game_id').notNull().references(() => games.id),
  familyId: text('family_id').notNull(),
  createdBy: text('created_by').notNull().references(() => users.id),
  status: varchar('status', { length: 20 }).default('waiting').notNull(), // waiting, active, completed, cancelled
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  scores: text('scores').notNull(), // JSON: { userId: score }
  winner: text('winner'), // User ID of winner
  isPublic: boolean('is_public').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('game_sessions_family_idx').on(table.familyId),
  index('game_sessions_status_idx').on(table.status),
  index('game_sessions_created_by_idx').on(table.createdBy),
]);

// Players in a game session
export const gamePlayers = pgTable('game_players', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => gameSessions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  score: integer('score').default(0).notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, left, eliminated
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  leftAt: timestamp('left_at'),
}, (table) => [
  index('game_players_session_idx').on(table.sessionId),
  index('game_players_user_idx').on(table.userId),
]);

// User achievements and badges
export const achievements = pgTable('achievements', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 500 }),
  category: varchar('category', { length: 50 }).notNull(), // 'games', 'social', 'streak'
  requirement: text('requirement').notNull(), // JSON: condition to unlock
  points: integer('points').default(0).notNull(),
  isHidden: boolean('is_hidden').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('achievements_category_idx').on(table.category),
]);

// User earned achievements
export const userAchievements = pgTable('user_achievements', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  achievementId: text('achievement_id').notNull().references(() => achievements.id),
  unlockedAt: timestamp('unlocked_at').defaultNow().notNull(),
}, (table) => [
  index('user_achievements_user_idx').on(table.userId),
  index('user_achievements_achievement_idx').on(table.achievementId),
]);

// Game statistics per user
export const gameStats = pgTable('game_stats', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gameId: text('game_id').notNull().references(() => games.id),
  totalGames: integer('total_games').default(0).notNull(),
  wins: integer('wins').default(0).notNull(),
  losses: integer('losses').default(0).notNull(),
  draws: integer('draws').default(0).notNull(),
  highScore: integer('high_score').default(0).notNull(),
  averageScore: decimal('average_score', { precision: 5, scale: 2 }).default('0'),
  lastPlayedAt: timestamp('last_played_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('game_stats_user_idx').on(table.userId),
  index('game_stats_game_idx').on(table.gameId),
]);

// Leaderboards (cached for performance)
export const leaderboards = pgTable('leaderboards', {
  id: text('id').primaryKey(),
  gameId: text('game_id').notNull().references(() => games.id),
  familyId: text('family_id').notNull(),
  period: varchar('period', { length: 20 }).default('all-time').notNull(), // all-time, monthly, weekly
  userId: text('user_id').notNull().references(() => users.id),
  score: integer('score').notNull(),
  rank: integer('rank').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('leaderboards_game_idx').on(table.gameId),
  index('leaderboards_family_idx').on(table.familyId),
  index('leaderboards_period_idx').on(table.period),
]);

// Music playlist and sharing
export const musicPlaylists = pgTable('music_playlists', {
  id: text('id').primaryKey(),
  familyId: text('family_id').notNull(),
  createdBy: text('created_by').notNull().references(() => users.id),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isPublic: boolean('is_public').default(true).notNull(),
  thumbnail: varchar('thumbnail', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('music_playlists_family_idx').on(table.familyId),
  index('music_playlists_created_by_idx').on(table.createdBy),
]);

// Music tracks in playlist
export const musicTracks = pgTable('music_tracks', {
  id: text('id').primaryKey(),
  playlistId: text('playlist_id').notNull().references(() => musicPlaylists.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  artist: varchar('artist', { length: 200 }).notNull(),
  duration: integer('duration').notNull(), // seconds
  url: varchar('url', { length: 500 }).notNull(),
  order: integer('order').notNull(),
  addedBy: text('added_by').notNull().references(() => users.id),
  addedAt: timestamp('added_at').defaultNow().notNull(),
}, (table) => [
  index('music_tracks_playlist_idx').on(table.playlistId),
]);

// Watch party sessions
export const watchParties = pgTable('watch_parties', {
  id: text('id').primaryKey(),
  familyId: text('family_id').notNull(),
  createdBy: text('created_by').notNull().references(() => users.id),
  title: varchar('title', { length: 200 }).notNull(),
  contentUrl: varchar('content_url', { length: 500 }).notNull(),
  contentType: varchar('content_type', { length: 50 }).notNull(), // 'movie', 'show', 'stream'
  status: varchar('status', { length: 20 }).default('scheduled').notNull(), // scheduled, watching, completed
  scheduledAt: timestamp('scheduled_at').notNull(),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  currentTimestamp: integer('current_timestamp').default(0), // seconds
  isPublic: boolean('is_public').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('watch_parties_family_idx').on(table.familyId),
  index('watch_parties_status_idx').on(table.status),
]);

// Participants in watch party
export const watchPartyParticipants = pgTable('watch_party_participants', {
  id: text('id').primaryKey(),
  watchPartyId: text('watch_party_id').notNull().references(() => watchParties.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  leftAt: timestamp('left_at'),
  currentTimestamp: integer('current_timestamp').default(0), // seconds
}, (table) => [
  index('watch_party_participants_watch_party_idx').on(table.watchPartyId),
  index('watch_party_participants_user_idx').on(table.userId),
]);

// Content recommendations
export const recommendations = pgTable('recommendations', {
  id: text('id').primaryKey(),
  familyId: text('family_id').notNull(),
  createdBy: text('created_by').notNull().references(() => users.id),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  contentType: varchar('content_type', { length: 50 }).notNull(), // 'movie', 'show', 'game', 'music'
  contentUrl: varchar('content_url', { length: 500 }),
  rating: integer('rating'), // 1-5 stars
  reason: text('reason'), // Why it was recommended
  votes: integer('votes').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('recommendations_family_idx').on(table.familyId),
  index('recommendations_content_type_idx').on(table.contentType),
]);

// Relations
export const gamesRelations = relations(games, ({ many }) => ({
  sessions: many(gameSessions),
  stats: many(gameStats),
  leaderboards: many(leaderboards),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one, many }) => ({
  game: one(games, { fields: [gameSessions.gameId], references: [games.id] }),
  creator: one(users, { fields: [gameSessions.createdBy], references: [users.id] }),
  players: many(gamePlayers),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const musicPlaylistsRelations = relations(musicPlaylists, ({ one, many }) => ({
  creator: one(users, { fields: [musicPlaylists.createdBy], references: [users.id] }),
  tracks: many(musicTracks),
}));

export const watchPartiesRelations = relations(watchParties, ({ one, many }) => ({
  creator: one(users, { fields: [watchParties.createdBy], references: [users.id] }),
  participants: many(watchPartyParticipants),
}));
