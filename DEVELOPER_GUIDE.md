# Developer Guide

**Last Updated:** 2024
**Status:** Production Ready
**Target Audience:** Backend & Frontend Developers

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Development Environment](#development-environment)
4. [Coding Patterns & Standards](#coding-patterns--standards)
5. [Working with tRPC](#working-with-trpc)
6. [Database Development](#database-development)
7. [Testing](#testing)
8. [Debugging](#debugging)
9. [Performance Optimization](#performance-optimization)
10. [Common Tasks](#common-tasks)
11. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- Node.js 18+ or Bun 1.0+
- PostgreSQL 14+
- Git

### Initial Setup

```bash
# Clone the repository
git clone <repo-url>
cd family-hub

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your local database URL and API keys

# Set up database
bun run db:push
bun run db:seed

# Start development server
bun run dev
```

The app will be available at `http://localhost:3000`

### Quick Commands Reference

```bash
bun run dev              # Start dev server with HMR
bun run dev:quick        # Quick start (skip clean)
bun run build            # Build for production
bun run typecheck        # Type check without emitting
bun run test             # Run tests in watch mode
bun run test:run         # Run tests once
bun run db:push          # Apply schema changes to database
bun run db:seed          # Seed database with sample data
bun run db:reset         # Wipe, migrate, and seed database
```

---

## Project Structure

```
family-hub/
├── app/
│   ├── components/           # React components
│   │   ├── auth/            # Authentication components
│   │   ├── families/        # Family management UI
│   │   ├── messages/        # Messaging UI
│   │   ├── gallery/         # Photo gallery UI
│   │   ├── calendar/        # Calendar UI
│   │   ├── shopping/        # Shopping list UI
│   │   ├── calls/           # Video call UI
│   │   └── shared/          # Shared/reusable components
│   ├── routes/              # React Router routes
│   │   ├── _auth/           # Auth routes (login, signup)
│   │   ├── _app/            # App routes (protected)
│   │   └── index.tsx        # Root route
│   ├── db/
│   │   ├── schema/          # Drizzle ORM schema definitions
│   │   ├── migrate.ts       # Migration runner
│   │   ├── seed-data.ts     # Database seeding
│   │   └── wipe.ts          # Database cleanup
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   ├── styles/              # Global styles
│   └── root.tsx             # Root component
├── server/
│   ├── trpc/
│   │   ├── root.ts          # tRPC router setup
│   │   ├── routers/         # Feature routers
│   │   │   ├── auth.ts
│   │   │   ├── families.ts
│   │   │   ├── messages.ts
│   │   │   ├── gallery.ts
│   │   │   ├── calendar.ts
│   │   │   ├── shopping.ts
│   │   │   ├── calls.ts
│   │   │   └── ...
│   │   └── middleware.ts    # Auth & logging middleware
│   ├── auth/                # Authentication logic
│   ├── email/               # Email service
│   └── index.ts             # Server entry point
├── test-utils/              # Testing utilities
├── scripts/                 # Build & deployment scripts
├── public/                  # Static assets
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example
```

### Key Directories Explained

**`app/components/`** - React components organized by feature. Each feature folder contains:
- `index.tsx` - Main component
- `*.tsx` - Sub-components
- `*.css` - Component styles

**`app/routes/`** - React Router file-based routing. Routes are automatically generated from file structure.

**`app/db/schema/`** - Drizzle ORM table definitions. One file per table/feature.

**`server/trpc/routers/`** - tRPC procedure definitions. One router per feature domain.

---

## Development Environment

### Starting the Dev Server

```bash
bun run dev
```

This command:
1. Cleans up previous builds
2. Starts React Router dev server on port 3000
3. Enables Hot Module Replacement (HMR)
4. Watches for file changes

**HMR is automatic** — save a file and the browser updates within ~1 second. No manual refresh needed.

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Application
NODE_ENV=development
APP_PORT=3000
PREDEV_DEPLOYMENT_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/family_hub

# Authentication
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Email Service
RESEND_API_KEY=your_resend_api_key

# Calendar Integration
GOOGLE_CALENDAR_CLIENT_ID=your_google_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_google_client_secret

# Video Calls
DAILY_API_KEY=your_daily_api_key

# Storage
AWS_S3_BUCKET=your_bucket_name
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Monitoring
SENTRY_DSN=your_sentry_dsn
```

### Port Configuration

- **3000** - Main app (React Router)
- **5432** - PostgreSQL (local)
- **6379** - Redis (if using caching)

If port 3000 is in use:
```bash
# Kill the process using port 3000
fuser -k 3000/tcp

# Then restart
bun run dev
```

---

## Coding Patterns & Standards

### TypeScript

**Strict mode is enabled.** All code must be fully typed.

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User | null> {
  // ...
}

// ❌ Bad
function getUser(id) {
  // Missing types
}
```

### React Components

Use functional components with hooks. Organize by feature.

```typescript
// ✅ Good - Feature-organized component
// app/components/messages/MessageList.tsx
import { useState, useEffect } from 'react';
import { trpc } from '~/utils/trpc';

interface MessageListProps {
  conversationId: string;
}

export function MessageList({ conversationId }: MessageListProps) {
  const { data: messages, isLoading } = trpc.messages.list.useQuery({
    conversationId,
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="message-list">
      {messages?.map((msg) => (
        <div key={msg.id} className="message">
          {msg.content}
        </div>
      ))}
    </div>
  );
}
```

### Error Handling

Always handle errors gracefully:

```typescript
// ✅ Good
try {
  const result = await trpc.families.create.mutate(data);
  return result;
} catch (error) {
  if (error instanceof TRPCClientError) {
    console.error('API error:', error.message);
    // Show user-friendly error
  } else {
    console.error('Unexpected error:', error);
  }
  throw error;
}

// ❌ Bad
const result = await trpc.families.create.mutate(data);
return result;
```

### Naming Conventions

- **Files**: `PascalCase` for components, `camelCase` for utilities
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase`
- **CSS Classes**: `kebab-case`

```typescript
// ✅ Good
const MAX_MESSAGE_LENGTH = 1000;
interface UserProfile { /* ... */ }
function formatDate(date: Date): string { /* ... */ }
const UserCard = () => { /* ... */ };

// ❌ Bad
const max_message_length = 1000;
interface userProfile { /* ... */ }
function FormatDate() { /* ... */ };
```

---

## Working with tRPC

### Understanding tRPC

tRPC provides end-to-end type safety for API calls. Define procedures on the server, call them from the client with full TypeScript support.

### Creating a New Router

1. **Create the router file** (`server/trpc/routers/feature.ts`):

```typescript
import { router, publicProcedure, protectedProcedure } from '../root';
import { z } from 'zod';
import { db } from '~/db';
import { features } from '~/db/schema';

export const featureRouter = router({
  // Public procedure (no auth required)
  list: publicProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      return db.select().from(features).limit(input.limit);
    }),

  // Protected procedure (auth required)
  create: protectedProcedure
    .input(z.object({ name: z.string(), description: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return db.insert(features).values({
        ...input,
        userId: ctx.user.id,
      });
    }),
});
```

2. **Register the router** in `server/trpc/root.ts`:

```typescript
import { featureRouter } from './routers/feature';

export const appRouter = router({
  feature: featureRouter,
  // ... other routers
});
```

3. **Use in React components**:

```typescript
import { trpc } from '~/utils/trpc';

function MyComponent() {
  // Query
  const { data, isLoading } = trpc.feature.list.useQuery({ limit: 20 });

  // Mutation
  const createMutation = trpc.feature.create.useMutation();

  const handleCreate = async () => {
    await createMutation.mutateAsync({
      name: 'New Feature',
      description: 'Description',
    });
  };

  return (
    <div>
      {isLoading ? 'Loading...' : data?.map(f => <div key={f.id}>{f.name}</div>)}
      <button onClick={handleCreate}>Create</button>
    </div>
  );
}
```

### Input Validation

Always validate inputs with Zod:

```typescript
const createSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
  tags: z.array(z.string()).optional(),
});

export const userRouter = router({
  create: protectedProcedure
    .input(createSchema)
    .mutation(async ({ input, ctx }) => {
      // input is fully typed and validated
      return db.insert(users).values({
        ...input,
        userId: ctx.user.id,
      });
    }),
});
```

### Error Handling in tRPC

```typescript
import { TRPCError } from '@trpc/server';

export const userRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, input.id),
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return user;
    }),
});
```

---

## Database Development

### Understanding Drizzle ORM

Drizzle is a TypeScript ORM with excellent type safety. Schema is defined in TypeScript.

### Creating a New Table

1. **Create schema file** (`app/db/schema/features.ts`):

```typescript
import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const features = pgTable('features', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

2. **Apply migration**:

```bash
bun run db:push
```

This generates and applies the migration automatically.

### Querying Data

```typescript
import { db } from '~/db';
import { features, users } from '~/db/schema';
import { eq, and } from 'drizzle-orm';

// Simple select
const allFeatures = await db.select().from(features);

// With where clause
const userFeatures = await db
  .select()
  .from(features)
  .where(eq(features.userId, userId));

// With joins
const featuresWithUsers = await db
  .select()
  .from(features)
  .innerJoin(users, eq(features.userId, users.id));

// With aggregation
const count = await db
  .select({ count: count() })
  .from(features)
  .where(eq(features.userId, userId));
```

### Inserting Data

```typescript
const newFeature = await db.insert(features).values({
  userId: 'user-123',
  name: 'New Feature',
  description: 'Description',
}).returning();
```

### Updating Data

```typescript
const updated = await db
  .update(features)
  .set({ name: 'Updated Name' })
  .where(eq(features.id, featureId))
  .returning();
```

### Deleting Data

```typescript
await db.delete(features).where(eq(features.id, featureId));
```

### Transactions

```typescript
await db.transaction(async (tx) => {
  // All operations in this block are atomic
  await tx.insert(features).values({ /* ... */ });
  await tx.update(users).set({ /* ... */ });
  // If any operation fails, all are rolled back
});
```

---

## Testing

### Running Tests

```bash
bun run test              # Watch mode
bun run test:run          # Run once
bun run test:ui           # UI mode
```

### Writing Tests

Use Vitest + React Testing Library:

```typescript
// app/components/MessageList.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageList } from './MessageList';

describe('MessageList', () => {
  it('renders messages', () => {
    const messages = [
      { id: '1', content: 'Hello' },
      { id: '2', content: 'World' },
    ];

    render(<MessageList messages={messages} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('World')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<MessageList isLoading={true} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

### Testing tRPC Procedures

```typescript
// server/trpc/routers/feature.test.ts
import { describe, it, expect } from 'vitest';
import { featureRouter } from './feature';

describe('featureRouter', () => {
  it('lists features', async () => {
    const caller = featureRouter.createCaller({
      user: { id: 'user-123' },
    });

    const result = await caller.list({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });
});
```

---

## Debugging

### Browser DevTools

1. Open DevTools (F12)
2. **Console** - Check for errors and logs
3. **Network** - Inspect tRPC calls
4. **React DevTools** - Inspect component tree

### Server Logging

```typescript
import { logger } from '~/utils/logger';

logger.info('User created', { userId: user.id });
logger.error('Database error', { error });
logger.debug('Query params', { params });
```

### Database Debugging

```bash
# Open Drizzle Studio to inspect database
bunx drizzle-kit studio
```

Then visit `http://localhost:5555` to browse tables and data.

### Type Checking

```bash
# Full type check
bun run typecheck:full

# Quick type check
bun run typecheck
```

---

## Performance Optimization

### Code Splitting

Routes are automatically code-split. Use `React.lazy()` for components:

```typescript
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

export function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Database Query Optimization

```typescript
// ❌ Bad - N+1 query problem
const users = await db.select().from(users);
for (const user of users) {
  const posts = await db.select().from(posts).where(eq(posts.userId, user.id));
}

// ✅ Good - Single query with join
const usersWithPosts = await db
  .select()
  .from(users)
  .leftJoin(posts, eq(users.id, posts.userId));
```

### Caching

Use React Query for client-side caching:

```typescript
const { data, isLoading } = trpc.users.list.useQuery(
  { limit: 10 },
  {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  }
);
```

### Bundle Size

Check bundle size:

```bash
bun run build
# Check dist/ folder size
```

---

## Common Tasks

### Adding a New Feature

1. **Create database schema** (`app/db/schema/feature.ts`)
2. **Run migration** (`bun run db:push`)
3. **Create tRPC router** (`server/trpc/routers/feature.ts`)
4. **Register router** in `server/trpc/root.ts`
5. **Create React components** (`app/components/feature/`)
6. **Add routes** (`app/routes/feature.tsx`)
7. **Write tests**
8. **Test in browser**

### Modifying Database Schema

1. Edit the schema file in `app/db/schema/`
2. Run `bun run db:push`
3. Drizzle automatically generates and applies migrations

### Adding Authentication to a Route

```typescript
import { protectedProcedure } from '~/server/trpc/root';

export const featureRouter = router({
  create: protectedProcedure
    .input(createSchema)
    .mutation(async ({ input, ctx }) => {
      // ctx.user is guaranteed to exist
      return db.insert(features).values({
        ...input,
        userId: ctx.user.id,
      });
    }),
});
```

### Sending Emails

```typescript
import { sendEmail } from '~/server/email';

await sendEmail({
  to: user.email,
  subject: 'Welcome!',
  html: '<h1>Welcome to Family Hub</h1>',
});
```

---

## Troubleshooting

### Dev Server Won't Start

```bash
# Check if port 3000 is in use
fuser 3000/tcp

# Kill the process
fuser -k 3000/tcp

# Try again
bun run dev
```

### Type Errors After File Changes

```bash
# Full type check
bun run typecheck:full

# If still failing, clean and rebuild
bun run clean
bun run dev
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
psql -U postgres -d family_hub -c "SELECT 1"

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Reset database
bun run db:reset
```

### HMR Not Working

1. Check browser console for errors
2. Restart dev server: `bun run dev`
3. Clear browser cache (Ctrl+Shift+Delete)
4. Hard refresh (Ctrl+Shift+R)

### Tests Failing

```bash
# Run tests with verbose output
bun run test:run -- --reporter=verbose

# Run specific test file
bun run test:run -- MessageList.test.tsx
```

### Memory Issues

```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 bun run dev
```

---

## Resources

- [React Router Documentation](https://reactrouter.com)
- [tRPC Documentation](https://trpc.io)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [React Documentation](https://react.dev)
- [Vitest Documentation](https://vitest.dev)

---

**Need help?** Check the troubleshooting section or review the API Documentation and Architecture guides.
