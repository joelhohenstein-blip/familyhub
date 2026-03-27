import { pgTable, uuid, varchar, text, timestamp, index, primaryKey } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash'), // Nullable for OAuth-only users
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  imageUrl: text('image_url'),
  subscriptionId: varchar('subscription_id', { length: 255 }),
  role: varchar('role', { length: 50 }).notNull().default('user'), // 'user' or 'admin'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Sessions table
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => [
  index('sessions_token_idx').on(table.token),
  index('sessions_user_id_idx').on(table.userId)
]);

// OAuth accounts table - links OAuth providers to users
export const oauthAccounts = pgTable('oauth_accounts', {
  provider: varchar('provider', { length: 50 }).notNull(), // 'github', 'google', 'apple'
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.provider, table.providerAccountId] }),
  index('oauth_accounts_user_id_idx').on(table.userId)
]);

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type OAuthAccount = typeof oauthAccounts.$inferSelect;
export type NewOAuthAccount = typeof oauthAccounts.$inferInsert;

// User without password hash (for client responses)
export type SafeUser = Omit<User, 'passwordHash'>;
