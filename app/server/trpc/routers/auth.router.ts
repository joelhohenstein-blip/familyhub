import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { router, procedure } from '../trpc';
import { users, sessions, type SafeUser } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { SESSION_COOKIE_NAME } from '../context';

const SALT_ROUNDS = 12;
const SESSION_EXPIRY_DAYS = 7;

// Use SameSite=None; Secure for iframe support in production (requires HTTPS)
// In development, use SameSite=Lax to allow cookies to be sent with requests
const sameSiteAttr = process.env.NODE_ENV === 'production' 
  ? 'SameSite=None; Secure' 
  : 'SameSite=Lax';

// Generate a secure random token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create session cookie header
function createSessionCookie(token: string, maxAge: number): string {
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; ${sameSiteAttr}; Max-Age=${maxAge}`;
}

// Clear session cookie header
function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; ${sameSiteAttr}; Max-Age=0`;
}

export const authRouter = router({
  // Get current session/user
  me: procedure.query(({ ctx }): { user: SafeUser | null; isSignedIn: boolean } => {
    return {
      user: ctx.user,
      isSignedIn: ctx.user !== null,
    };
  }),

  // Sign up a new user
  signup: procedure
    .input(z.object({
      email: z.string().email('Invalid email address'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if user already exists
      const existing = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An account with this email already exists',
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

      // Create user
      const [newUser] = await ctx.db
        .insert(users)
        .values({
          email: input.email.toLowerCase(),
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(input.email)}`,
        })
        .returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          imageUrl: users.imageUrl,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        });

      // Create session
      const token = generateSessionToken();
      const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      await ctx.db.insert(sessions).values({
        userId: newUser.id,
        token,
        expiresAt,
      });

      return {
        user: newUser,
        sessionCookie: createSessionCookie(token, SESSION_EXPIRY_DAYS * 24 * 60 * 60),
      };
    }),

  // Log in an existing user
  login: procedure
    .input(z.object({
      email: z.string().email('Invalid email address'),
      password: z.string().min(1, 'Password is required'),
    }))
    .mutation(async ({ input, ctx }) => {
      // Find user by email
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .limit(1);

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      // Verify password
      const isValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      // Create session
      const token = generateSessionToken();
      const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      await ctx.db.insert(sessions).values({
        userId: user.id,
        token,
        expiresAt,
      });

      // Return user without password hash
      const safeUser: SafeUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        subscriptionId: user.subscriptionId,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      return {
        user: safeUser,
        sessionCookie: createSessionCookie(token, SESSION_EXPIRY_DAYS * 24 * 60 * 60),
      };
    }),

  // Log out (invalidate session)
  logout: procedure.mutation(async ({ ctx }) => {
    if (ctx.sessionToken) {
      // Delete the session from database
      await ctx.db
        .delete(sessions)
        .where(eq(sessions.token, ctx.sessionToken));
    }

    return {
      success: true,
      sessionCookie: clearSessionCookie(),
    };
  }),
});
