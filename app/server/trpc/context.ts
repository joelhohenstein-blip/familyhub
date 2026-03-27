import { inferAsyncReturnType } from '@trpc/server';
import { db } from '../../db/index.server';
import { users, sessions, type SafeUser } from '../../db/schema';
import { eq, and, gt } from 'drizzle-orm';

export const SESSION_COOKIE_NAME = 'session_token';

/**
 * Parse session cookie and get user from database
 */
async function getSessionUser(request: Request): Promise<{ user: SafeUser | null; sessionToken: string | null }> {
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...vals] = c.trim().split('=');
      return [key, vals.join('=')];
    })
  );

  const sessionToken = cookies[SESSION_COOKIE_NAME];
  if (!sessionToken) {
    return { user: null, sessionToken: null };
  }

  // Look up session and user
  const result = await db
    .select({
      user: {
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        imageUrl: users.imageUrl,
        subscriptionId: users.subscriptionId,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      },
      session: sessions,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.token, sessionToken),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (result.length === 0) {
    return { user: null, sessionToken };
  }

  return { user: result[0].user, sessionToken };
}

/**
 * Creates context for a tRPC request
 */
export async function createContext({
  request,
}: {
  request: Request;
}) {
  const { user, sessionToken } = await getSessionUser(request);

  return {
    request,
    db,
    user,
    sessionToken,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
