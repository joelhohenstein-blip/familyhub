# Security Implementation Guide

Comprehensive security best practices, middleware setup, encryption, rate limiting, CORS, and CSP headers for the FamilyHub React Router application.

## Table of Contents

1. [Overview](#overview)
2. [Security Headers & CSP](#security-headers--csp)
3. [CORS Configuration](#cors-configuration)
4. [Rate Limiting](#rate-limiting)
5. [Encryption & Data Protection](#encryption--data-protection)
6. [Authentication & Authorization](#authentication--authorization)
7. [Input Validation & Sanitization](#input-validation--sanitization)
8. [Session Management](#session-management)
9. [API Security](#api-security)
10. [Database Security](#database-security)
11. [Dependency Management](#dependency-management)
12. [Monitoring & Logging](#monitoring--logging)

---

## Overview

Security is a multi-layered approach. This guide covers:

- **Transport Security**: HTTPS, secure headers
- **Application Security**: Input validation, output encoding
- **Access Control**: Authentication, authorization, CORS
- **Data Protection**: Encryption, secure storage
- **Rate Limiting**: DDoS protection, abuse prevention
- **Monitoring**: Logging, alerting, incident response

---

## Security Headers & CSP

### 1. Content Security Policy (CSP)

CSP prevents XSS attacks by controlling which resources can be loaded.

#### Implementation in Vite Config

```typescript
// vite.config.ts - Add middleware for CSP headers
import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';

export default defineConfig({
  plugins: [
    reactRouter(),
    {
      name: 'security-headers',
      configResolved(config) {
        // Middleware will be applied in server config
      },
      apply: 'serve',
      enforce: 'pre',
    },
  ],
  server: {
    middlewares: [
      (req, res, next) => {
        // Content Security Policy
        res.setHeader(
          'Content-Security-Policy',
          [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Vite HMR needs unsafe-eval in dev
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' ws: wss:", // WebSocket for HMR
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; ')
        );

        // Additional security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

        next();
      },
    ],
  },
});
```

#### Production CSP (stricter)

```typescript
// app/middleware/security.ts
export function getSecurityHeaders(isDev: boolean) {
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self'", // No unsafe-inline in production
    "style-src 'self' 'unsafe-inline'", // Tailwind needs this
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  if (isDev) {
    // Allow HMR in development
    cspDirectives[1] = "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
    cspDirectives[4] = "connect-src 'self' ws: wss:";
  }

  return {
    'Content-Security-Policy': cspDirectives.join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}
```

---

## CORS Configuration

### 1. Basic CORS Setup

```typescript
// app/middleware/cors.ts
import type { Request, Response, NextFunction } from 'express';

interface CORSOptions {
  origin?: string | string[] | RegExp | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export function corsMiddleware(options: CORSOptions = {}) {
  const {
    origin = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    credentials = true,
    maxAge = 86400,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const requestOrigin = req.headers.origin;

    // Check if origin is allowed
    const isOriginAllowed = Array.isArray(origin)
      ? origin.includes(requestOrigin || '')
      : origin instanceof RegExp
        ? origin.test(requestOrigin || '')
        : typeof origin === 'function'
          ? origin(requestOrigin || '')
          : origin === '*';

    if (isOriginAllowed) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
      res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      res.setHeader('Access-Control-Max-Age', maxAge.toString());

      if (credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  };
}
```

### 2. Environment-Based CORS

```typescript
// app/config/cors.ts
export const corsConfig = {
  development: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
  staging: {
    origin: ['https://staging.familyhub.app'],
    credentials: true,
  },
  production: {
    origin: ['https://familyhub.app', 'https://www.familyhub.app'],
    credentials: true,
  },
};

export function getCORSConfig() {
  const env = process.env.NODE_ENV || 'development';
  return corsConfig[env as keyof typeof corsConfig] || corsConfig.development;
}
```

---

## Rate Limiting

### 1. In-Memory Rate Limiter

```typescript
// app/middleware/rateLimiter.ts
interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

export class RateLimiter {
  private store: RateLimitStore = {};
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  private getKey(identifier: string): string {
    return `rate-limit:${identifier}`;
  }

  private cleanup(): void {
    const now = Date.now();
    Object.entries(this.store).forEach(([key, value]) => {
      if (value.resetTime < now) {
        delete this.store[key];
      }
    });
  }

  isLimited(identifier: string): boolean {
    const key = this.getKey(identifier);
    const now = Date.now();

    if (!this.store[key]) {
      this.store[key] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      return false;
    }

    const record = this.store[key];

    if (record.resetTime < now) {
      record.count = 1;
      record.resetTime = now + this.windowMs;
      return false;
    }

    record.count++;
    return record.count > this.maxRequests;
  }

  getRemainingRequests(identifier: string): number {
    const key = this.getKey(identifier);
    const record = this.store[key];

    if (!record) return this.maxRequests;
    if (record.resetTime < Date.now()) return this.maxRequests;

    return Math.max(0, this.maxRequests - record.count);
  }

  getResetTime(identifier: string): number {
    const key = this.getKey(identifier);
    return this.store[key]?.resetTime || Date.now();
  }
}

// Middleware wrapper
export function rateLimitMiddleware(
  windowMs: number = 15 * 60 * 1000,
  maxRequests: number = 100
) {
  const limiter = new RateLimiter(windowMs, maxRequests);

  return (req: Request, res: Response, next: NextFunction) => {
    // Use IP address or user ID as identifier
    const identifier = req.user?.id || req.ip || 'anonymous';

    if (limiter.isLimited(identifier)) {
      const resetTime = limiter.getResetTime(identifier);
      res.setHeader('Retry-After', Math.ceil((resetTime - Date.now()) / 1000));
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', resetTime.toString());

      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      });
    }

    const remaining = limiter.getRemainingRequests(identifier);
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', limiter.getResetTime(identifier).toString());

    next();
  };
}
```

### 2. Redis-Based Rate Limiter (Production)

```typescript
// app/middleware/redisRateLimiter.ts
import { createClient } from 'redis';

export class RedisRateLimiter {
  private client: ReturnType<typeof createClient>;
  private windowMs: number;
  private maxRequests: number;

  constructor(
    redisUrl: string = 'redis://localhost:6379',
    windowMs: number = 15 * 60 * 1000,
    maxRequests: number = 100
  ) {
    this.client = createClient({ url: redisUrl });
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async isLimited(identifier: string): Promise<boolean> {
    const key = `rate-limit:${identifier}`;
    const current = await this.client.incr(key);

    if (current === 1) {
      await this.client.expire(key, Math.ceil(this.windowMs / 1000));
    }

    return current > this.maxRequests;
  }

  async getRemainingRequests(identifier: string): Promise<number> {
    const key = `rate-limit:${identifier}`;
    const current = await this.client.get(key);
    const count = current ? parseInt(current, 10) : 0;
    return Math.max(0, this.maxRequests - count);
  }

  async getResetTime(identifier: string): Promise<number> {
    const key = `rate-limit:${identifier}`;
    const ttl = await this.client.ttl(key);
    return ttl > 0 ? Date.now() + ttl * 1000 : Date.now();
  }
}
```

---

## Encryption & Data Protection

### 1. Password Hashing

```typescript
// app/utils/password.ts
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  // Validate password strength
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one number');
  }

  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
```

### 2. Encryption for Sensitive Data

```typescript
// app/utils/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCODING = 'hex';

export class Encryptor {
  private key: Buffer;

  constructor(encryptionKey: string = process.env.ENCRYPTION_KEY || '') {
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    // Ensure key is 32 bytes for AES-256
    this.key = crypto
      .createHash('sha256')
      .update(encryptionKey)
      .digest();
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', ENCODING);
    encrypted += cipher.final(ENCODING);

    const authTag = cipher.getAuthTag();

    // Return IV + authTag + encrypted data
    return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted}`;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');

    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid ciphertext format');
    }

    const iv = Buffer.from(ivHex, ENCODING);
    const authTag = Buffer.from(authTagHex, ENCODING);

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// Usage
const encryptor = new Encryptor();

export function encryptSensitiveData(data: string): string {
  return encryptor.encrypt(data);
}

export function decryptSensitiveData(encrypted: string): string {
  return encryptor.decrypt(encrypted);
}
```

### 3. Secure Token Generation

```typescript
// app/utils/tokens.ts
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = '24h';

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function generateJWT(payload: Record<string, any>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    algorithm: 'HS256',
  });
}

export function verifyJWT(token: string): Record<string, any> | null {
  try {
    return jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as Record<string, any>;
  } catch (error) {
    return null;
  }
}

export function generateResetToken(): { token: string; expiresAt: Date } {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

  return { token, expiresAt };
}
```

---

## Authentication & Authorization

### 1. Auth Middleware

```typescript
// app/middleware/auth.ts
import type { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '~/utils/tokens';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'user' | 'moderator';
  };
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }

  const payload = verifyJWT(token);

  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = payload;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookies
  const cookies = parseCookies(req.headers.cookie || '');
  return cookies.authToken || null;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = decodeURIComponent(value);
      return acc;
    },
    {} as Record<string, string>
  );
}
```

### 2. Role-Based Access Control (RBAC)

```typescript
// app/utils/rbac.ts
export type Role = 'admin' | 'moderator' | 'user' | 'guest';

interface Permission {
  resource: string;
  action: string;
}

const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'update' },
    { resource: 'users', action: 'delete' },
    { resource: 'settings', action: 'manage' },
  ],
  moderator: [
    { resource: 'posts', action: 'read' },
    { resource: 'posts', action: 'delete' },
    { resource: 'users', action: 'read' },
  ],
  user: [
    { resource: 'posts', action: 'create' },
    { resource: 'posts', action: 'read' },
    { resource: 'posts', action: 'update' },
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'update' },
  ],
  guest: [{ resource: 'posts', action: 'read' }],
};

export function hasPermission(
  role: Role,
  resource: string,
  action: string
): boolean {
  const permissions = rolePermissions[role] || [];
  return permissions.some(
    (p) => p.resource === resource && p.action === action
  );
}

export function canAccess(
  userRole: Role,
  requiredRole: Role
): boolean {
  const roleHierarchy: Record<Role, number> = {
    admin: 4,
    moderator: 3,
    user: 2,
    guest: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
```

---

## Input Validation & Sanitization

### 1. Input Validation with Zod

```typescript
// app/schemas/validation.ts
import { z } from 'zod';

export const userRegistrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[!@#$%^&*]/, 'Password must contain special character'),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

export const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const postCreateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  tags: z.array(z.string()).max(10),
});

export const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['asc', 'desc']).default('desc'),
});

// Validation helper
export async function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; errors: string[] }> {
  try {
    const validated = await schema.parseAsync(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}
```

### 2. Output Sanitization

```typescript
// app/utils/sanitization.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title'],
    KEEP_CONTENT: true,
  });
}

export function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };

  Object.keys(sanitized).forEach((key) => {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = escapeHTML(sanitized[key]);
    }
  });

  return sanitized;
}
```

---

## Session Management

### 1. Secure Session Configuration

```typescript
// app/config/session.ts
import type { SessionOptions } from 'express-session';

export const sessionConfig: SessionOptions = {
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent JavaScript access
    sameSite: 'strict', // CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.COOKIE_DOMAIN,
  },
  name: 'sessionId', // Don't use default 'connect.sid'
};

export const cookieOptions = {
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000,
};
```

### 2. Session Validation

```typescript
// app/utils/session.ts
import type { Request, Response } from 'express';

export function validateSession(req: Request): boolean {
  if (!req.session || !req.session.userId) {
    return false;
  }

  // Check session expiry
  const sessionAge = Date.now() - (req.session.createdAt || 0);
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  if (sessionAge > maxAge) {
    req.session.destroy(() => {});
    return false;
  }

  // Regenerate session periodically
  if (sessionAge > 60 * 60 * 1000) {
    req.session.regenerate(() => {});
  }

  return true;
}

export function destroySession(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) reject(err);
      res.clearCookie('sessionId');
      resolve();
    });
  });
}
```

---

## API Security

### 1. API Request Validation

```typescript
// app/routes/api/users.ts
import { json } from '@react-router/node';
import type { Route } from './+types/users';
import { validateInput, userRegistrationSchema } from '~/schemas/validation';
import { authMiddleware, requireRole } from '~/middleware/auth';

export async function action({ request }: Route.ActionArgs) {
  // Validate request method
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  // Validate content type
  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return json({ error: 'Invalid content type' }, { status: 400 });
  }

  // Parse and validate body
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = await validateInput(userRegistrationSchema, body);
  if (!validation.success) {
    return json({ errors: validation.errors }, { status: 400 });
  }

  // Process validated data
  const { email, password, firstName, lastName } = validation.data;

  // ... create user

  return json({ success: true }, { status: 201 });
}
```

### 2. API Response Security

```typescript
// app/utils/apiResponse.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: Date.now(),
  };
}

export function createErrorResponse(error: string): ApiResponse<null> {
  return {
    success: false,
    error,
    timestamp: Date.now(),
  };
}

// Never expose sensitive information
export function sanitizeUserData(user: any) {
  const { password, resetToken, ...safe } = user;
  return safe;
}
```

---

## Database Security

### 1. SQL Injection Prevention

```typescript
// app/db/queries.ts
import { db } from '~/db';
import { users } from '~/db/schema';
import { eq } from 'drizzle-orm';

// ✅ SAFE: Using parameterized queries with Drizzle
export async function getUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

// ❌ UNSAFE: String concatenation (never do this)
// const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ SAFE: Using prepared statements
export async function getUserById(id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}
```

### 2. Data Encryption at Rest

```typescript
// app/db/schema.ts
import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { encryptSensitiveData, decryptSensitiveData } from '~/utils/encryption';

export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  // Encrypted fields
  phoneNumber: text('phone_number'), // Store encrypted
  ssn: text('ssn'), // Store encrypted
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Encryption hooks
export function encryptUserData(user: any) {
  return {
    ...user,
    phoneNumber: user.phoneNumber ? encryptSensitiveData(user.phoneNumber) : null,
    ssn: user.ssn ? encryptSensitiveData(user.ssn) : null,
  };
}

export function decryptUserData(user: any) {
  return {
    ...user,
    phoneNumber: user.phoneNumber ? decryptSensitiveData(user.phoneNumber) : null,
    ssn: user.ssn ? decryptSensitiveData(user.ssn) : null,
  };
}
```

---

## Dependency Management

### 1. Security Audit

```bash
# Check for vulnerabilities
bun audit

# Update dependencies safely
bun update --latest

# Lock dependencies
bun install --frozen-lockfile
```

### 2. Dependency Allowlist

```json
{
  "dependencyAllowlist": {
    "production": [
      "react",
      "react-dom",
      "@react-router/react",
      "zod",
      "bcryptjs",
      "jsonwebtoken",
      "isomorphic-dompurify"
    ],
    "development": [
      "typescript",
      "vite",
      "@types/node"
    ]
  }
}
```

---

## Monitoring & Logging

### 1. Security Logging

```typescript
// app/utils/logger.ts
import fs from 'fs';
import path from 'path';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  ip?: string;
}

export class SecurityLogger {
  private logDir: string;

  constructor(logDir: string = './logs') {
    this.logDir = logDir;
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(entry: LogEntry): void {
    const logFile = path.join(
      this.logDir,
      `${entry.level.toLowerCase()}-${new Date().toISOString().split('T')[0]}.log`
    );

    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(logFile, logLine);

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${entry.level}] ${entry.message}`, entry.context);
    }
  }

  logAuthAttempt(email: string, success: boolean, ip: string): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: success ? LogLevel.INFO : LogLevel.WARN,
      message: `Authentication ${success ? 'successful' : 'failed'}`,
      context: { email, success },
      ip,
    });
  }

  logUnauthorizedAccess(userId: string, resource: string, ip: string): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message: 'Unauthorized access attempt',
      context: { resource },
      userId,
      ip,
    });
  }

  logSecurityEvent(event: string, context: Record<string, any>, ip: string): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.CRITICAL,
      message: `Security event: ${event}`,
      context,
      ip,
    });
  }
}

export const logger = new SecurityLogger();
```

### 2. Monitoring Middleware

```typescript
// app/middleware/monitoring.ts
import type { Request, Response, NextFunction } from 'express';
import { logger } from '~/utils/logger';

export function monitoringMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();
  const ip = req.ip || 'unknown';

  // Log request
  logger.log({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message: `${req.method} ${req.path}`,
    context: {
      method: req.method,
      path: req.path,
      query: req.query,
    },
    ip,
  });

  // Monitor response
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Log slow requests
    if (duration > 1000) {
      logger.log({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        message: `Slow request: ${req.method} ${req.path}`,
        context: {
          duration,
          statusCode: res.statusCode,
        },
        ip,
      });
    }

    // Log errors
    if (res.statusCode >= 400) {
      logger.log({
        timestamp: new Date().toISOString(),
        level: res.statusCode >= 500 ? 'ERROR' : 'WARN',
        message: `${req.method} ${req.path} - ${res.statusCode}`,
        context: {
          statusCode: res.statusCode,
          duration,
        },
        ip,
      });
    }
  });

  next();
}
```

---

## Environment Variables

```bash
# .env.example

# Security
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ENCRYPTION_KEY=your-encryption-key-min-32-chars
SESSION_SECRET=your-session-secret-min-32-chars

# CORS
ALLOWED_ORIGINS=https://familyhub.app,https://www.familyhub.app
COOKIE_DOMAIN=familyhub.app

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/familyhub

# Redis (for rate limiting)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
LOG_DIR=./logs
```

---

## Security Checklist

- [ ] HTTPS enabled in production
- [ ] CSP headers configured
- [ ] CORS properly restricted
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Output sanitization for user content
- [ ] Passwords hashed with bcrypt
- [ ] Sensitive data encrypted
- [ ] JWT tokens with expiry
- [ ] Session management secure
- [ ] SQL injection prevention (parameterized queries)
- [ ] CSRF protection enabled
- [ ] Security headers set
- [ ] Dependency vulnerabilities audited
- [ ] Logging and monitoring in place
- [ ] Error messages don't leak information
- [ ] Database backups encrypted
- [ ] API rate limits per user/IP
- [ ] Admin endpoints protected
- [ ] Sensitive logs not exposed

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [React Security](https://react.dev/learn/security)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CORS Specification](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
