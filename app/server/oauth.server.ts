import { GitHub, Google } from 'arctic';
import crypto from 'crypto';
import { db } from '~/db/index.server';
import { users, sessions, oauthAccounts } from '~/db/schema';
import { eq, and } from 'drizzle-orm';

// Initialize OAuth providers (only if env vars are set)
export const github = process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
  ? new GitHub(
      process.env.GITHUB_CLIENT_ID,
      process.env.GITHUB_CLIENT_SECRET,
      process.env.GITHUB_REDIRECT_URI || null
    )
  : null;

export const google = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  ? new Google(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
    )
  : null;

const SESSION_COOKIE_NAME = 'session_token';
const SESSION_EXPIRY_DAYS = 7;

// Use SameSite=None; Secure for iframe support (requires HTTPS)
const sameSiteAttr = 'SameSite=None; Secure';

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function createSessionCookie(token: string): string {
  const maxAge = SESSION_EXPIRY_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; ${sameSiteAttr}; Max-Age=${maxAge}`;
}

interface OAuthUser {
  email: string;
  name?: string;
  avatarUrl?: string;
}

/**
 * Find or create user from OAuth, create session, return cookie
 */
export async function handleOAuthCallback(
  provider: 'github' | 'google' | 'apple',
  providerAccountId: string,
  oauthUser: OAuthUser
): Promise<string> {
  // Check if OAuth account already exists
  const existingOAuth = await db
    .select({ userId: oauthAccounts.userId })
    .from(oauthAccounts)
    .where(
      and(
        eq(oauthAccounts.provider, provider),
        eq(oauthAccounts.providerAccountId, providerAccountId)
      )
    )
    .limit(1);

  let userId: string;

  if (existingOAuth.length > 0) {
    // User already linked this OAuth account
    userId = existingOAuth[0].userId;
  } else {
    // Check if user with this email exists
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, oauthUser.email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      // Link OAuth to existing user
      userId = existingUser[0].id;
      await db.insert(oauthAccounts).values({
        provider,
        providerAccountId,
        userId,
      });
    } else {
      // Create new user
      const nameParts = oauthUser.name?.split(' ') || [];
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(' ') || null;

      const [newUser] = await db
        .insert(users)
        .values({
          email: oauthUser.email.toLowerCase(),
          firstName,
          lastName,
          imageUrl: oauthUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(oauthUser.email)}`,
        })
        .returning({ id: users.id });

      userId = newUser.id;

      // Link OAuth account
      await db.insert(oauthAccounts).values({
        provider,
        providerAccountId,
        userId,
      });
    }
  }

  // Create session
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  });

  return createSessionCookie(token);
}

// State cookie helpers
export function createStateCookie(state: string): string {
  return `oauth_state=${state}; Path=/; HttpOnly; ${sameSiteAttr}; Max-Age=600`;
}

export function createCodeVerifierCookie(verifier: string): string {
  return `oauth_code_verifier=${verifier}; Path=/; HttpOnly; ${sameSiteAttr}; Max-Age=600`;
}

export function clearOAuthCookies(): string[] {
  return [
    `oauth_state=; Path=/; HttpOnly; ${sameSiteAttr}; Max-Age=0`,
    `oauth_code_verifier=; Path=/; HttpOnly; ${sameSiteAttr}; Max-Age=0`,
  ];
}

export function parseCookies(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...vals] = c.trim().split('=');
      return [key, vals.join('=')];
    })
  );
}
