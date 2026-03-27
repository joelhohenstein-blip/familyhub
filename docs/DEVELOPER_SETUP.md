# FamilyHub Developer Setup & Contribution Guide

**Last Updated:** February 2025  
**Status:** Production-Ready  
**Version:** 1.0.0

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Project Structure](#project-structure)
5. [Development Workflow](#development-workflow)
6. [Code Standards](#code-standards)
7. [Testing](#testing)
8. [Debugging](#debugging)
9. [Git Workflow](#git-workflow)
10. [Common Tasks](#common-tasks)
11. [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# 1. Clone repository
git clone <repository-url>
cd familyhub

# 2. Install dependencies
bun install

# 3. Setup environment
cp .env.example .env
# Edit .env with local values

# 4. Start services
docker-compose up -d postgres redis

# 5. Initialize database
bun run db:push

# 6. Start dev server
bun run dev

# 7. Open browser
# http://localhost:3000
```

---

## Prerequisites

### Required
- **Node.js**: 20.x or higher
  ```bash
  node --version  # Should be v20.x or higher
  ```

- **Bun**: Latest version (package manager & runtime)
  ```bash
  curl -fsSL https://bun.sh/install | bash
  bun --version
  ```

- **Docker & Docker Compose**: For database services
  ```bash
  docker --version
  docker-compose --version
  ```

- **Git**: For version control
  ```bash
  git --version
  ```

### Recommended
- **VS Code**: With extensions:
  - ESLint
  - Prettier
  - TypeScript Vue Plugin
  - Tailwind CSS IntelliSense
  - REST Client

- **Database Tools**:
  - DBeaver (database management)
  - Redis Commander (Redis inspection)
  - Postman (API testing)

---

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/familyhub.git
cd familyhub
```

### 2. Install Dependencies

```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install
```

### 3. Setup Environment Variables

```bash
# Copy example file
cp .env.example .env

# Edit with your values
nano .env  # or use your editor
```

**Required variables:**
```env
# Database
DATABASE_URL=postgresql://family_hub:password@localhost:5432/family_hub
DB_USER=family_hub
DB_PASSWORD=password
DB_NAME=family_hub
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379

# Application
NODE_ENV=development
PREDEV_DEPLOYMENT_URL=http://localhost:3000

# Clerk (get from https://clerk.com)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Jitsi (optional, defaults to meet.jitsi.net)
JITSI_DOMAIN=meet.jitsi.net
```

### 4. Start Database Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Verify services are running
docker-compose ps

# Expected output:
# NAME                COMMAND                  SERVICE      STATUS
# family-hub-db       "docker-entrypoint.s…"   postgres     Up 2 seconds
# family-hub-redis    "redis-server --appen…"  redis        Up 2 seconds
```

### 5. Initialize Database

```bash
# Run migrations
bun run db:push

# Seed sample data (optional)
bun run db:seed

# Verify database
docker-compose exec postgres psql -U family_hub family_hub -c "\dt"
```

### 6. Start Development Server

```bash
# Full clean start (recommended first time)
bun run dev

# Quick start (if you know everything is clean)
bun run dev:quick

# Expected output:
# ➜  Local:   http://localhost:3000/
# ➜  press h to show help
```

### 7. Verify Setup

```bash
# Type checking
bun run typecheck

# Run tests
bun run test:run

# Health check
bun run health-check
```

---

## Project Structure

```
familyhub/
├── app/                          # React Router application
│   ├── routes/                   # Page routes (file-based routing)
│   │   ├── home.tsx
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── messages/
│   │   ├── calendar/
│   │   ├── gallery/
│   │   └── settings/
│   ├── components/               # Reusable React components
│   │   ├── ui/                   # Base UI components
│   │   ├── layout/               # Layout components
│   │   ├── forms/                # Form components
│   │   └── features/             # Feature-specific components
│   ├── lib/                      # Utility functions
│   │   ├── api.ts                # tRPC client setup
│   │   ├── auth.ts               # Authentication helpers
│   │   ├── utils.ts              # General utilities
│   │   └── hooks/                # Custom React hooks
│   ├── styles/                   # Global styles
│   ├── root.tsx                  # Root layout
│   └── entry.server.tsx          # Server entry point
│
├── server/                       # Backend (tRPC)
│   ├── routers/                  # tRPC routers (53 total)
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── messages.ts
│   │   ├── conversations.ts
│   │   ├── calendar.ts
│   │   ├── tasks.ts
│   │   ├── shopping.ts
│   │   ├── gallery.ts
│   │   ├── billing.ts
│   │   ├── admin.ts
│   │   └── ... (43 more)
│   ├── middleware/               # tRPC middleware
│   ├── db/                       # Database layer
│   │   ├── schema.ts             # Drizzle schema
│   │   └── queries/              # Database queries
│   ├── services/                 # Business logic
│   ├── utils/                    # Server utilities
│   └── trpc.ts                   # tRPC setup
│
├── drizzle/                      # Database migrations
│   ├── migrations/
│   └── schema.ts
│
├── public/                       # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── scripts/                      # Utility scripts
│   ├── seed.ts                   # Database seeding
│   ├── backup.sh                 # Database backup
│   └── clean-restart.js          # Clean restart script
│
├── tests/                        # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/                         # Documentation
│   ├── DEPLOYMENT_GUIDE.md
│   ├── DEVELOPER_SETUP.md
│   ├── API_DOCUMENTATION.md
│   └── ...
│
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
├── docker-compose.yml            # Docker services
├── Dockerfile                    # Production Docker image
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript config
├── vite.config.ts                # Vite config
├── drizzle.config.ts             # Drizzle config
└── README.md                     # Project README
```

---

## Development Workflow

### Daily Workflow

```bash
# 1. Start of day: pull latest changes
git pull origin main

# 2. Install any new dependencies
bun install

# 3. Start services
docker-compose up -d postgres redis

# 4. Start dev server
bun run dev

# 5. Open http://localhost:3000 in browser
```

### Making Changes

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes to files
# Edit app/routes/*, app/components/*, server/routers/*, etc.

# 3. Type checking (incremental)
bun run typecheck

# 4. Run tests
bun run test

# 5. Commit changes
git add .
git commit -m "feat: add your feature"

# 6. Push to GitHub
git push origin feature/your-feature-name

# 7. Create Pull Request on GitHub
```

### Development Commands

```bash
# Type checking (incremental, fast)
bun run typecheck

# Full type checking with code generation
bun run typecheck:full

# Run tests
bun run test

# Run tests with UI
bun run test:ui

# Run tests once (CI mode)
bun run test:run

# Build for production
bun run build

# Preview production build
bun run prod

# Clean restart (clears cache, restarts)
bun run clean

# Health check
bun run health-check

# Smoke tests
bun run smoke-tests
```

### Database Operations

```bash
# Run migrations
bun run db:push

# Generate migration files
bun run drizzle:generate

# Apply migrations
bun run drizzle:push

# Seed database
bun run db:seed

# Reset database (WARNING: deletes all data)
bun run db:reset

# Open database studio
bun run db:studio
```

---

## Code Standards

### TypeScript

- **Strict mode**: All files must pass `bun run typecheck:full`
- **No `any` types**: Use proper typing
- **Explicit return types**: Functions should have explicit return types
- **Interfaces over types**: Prefer `interface` for object shapes

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  name: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ Bad
function getUser(id: string): any {
  // ...
}
```

### React Components

- **Functional components**: Use function declarations, not classes
- **Hooks**: Use React hooks for state and effects
- **Props typing**: Always type component props
- **Memoization**: Use `React.memo` for expensive components

```typescript
// ✅ Good
interface UserCardProps {
  user: User;
  onSelect: (id: string) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onSelect }) => {
  return (
    <div onClick={() => onSelect(user.id)}>
      {user.name}
    </div>
  );
};

// ❌ Bad
export const UserCard = ({ user, onSelect }) => {
  // ...
};
```

### Styling

- **Tailwind CSS**: Use Tailwind for styling
- **Component-scoped**: Keep styles close to components
- **Consistent spacing**: Use Tailwind's spacing scale
- **Dark mode**: Support dark mode with `dark:` prefix

```typescript
// ✅ Good
<div className="flex items-center gap-4 p-4 rounded-lg bg-white dark:bg-gray-900">
  <img src={user.avatar} className="w-12 h-12 rounded-full" />
  <div>
    <h3 className="font-semibold text-gray-900 dark:text-white">
      {user.name}
    </h3>
  </div>
</div>
```

### API Routes (tRPC)

- **Router organization**: Group related endpoints in routers
- **Input validation**: Use Zod for input validation
- **Error handling**: Use proper error codes
- **Documentation**: Add JSDoc comments

```typescript
// ✅ Good
export const userRouter = router({
  getProfile: publicProcedure
    .query(async ({ ctx }) => {
      // Get current user profile
      return ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.userId),
      });
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update user profile
      return ctx.db.update(users)
        .set(input)
        .where(eq(users.id, ctx.userId));
    }),
});
```

### File Naming

- **Components**: PascalCase (e.g., `UserCard.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Routes**: kebab-case (e.g., `user-profile.tsx`)
- **Tests**: Same name + `.test.ts` (e.g., `formatDate.test.ts`)

### Commit Messages

Follow conventional commits:

```
feat: add user profile page
fix: resolve message ordering bug
docs: update deployment guide
style: format code with prettier
refactor: simplify auth logic
test: add tests for user router
chore: update dependencies
```

---

## Testing

### Running Tests

```bash
# Run all tests
bun run test

# Run tests with UI
bun run test:ui

# Run tests once (CI mode)
bun run test:run

# Run specific test file
bun run test -- formatDate.test.ts

# Run tests matching pattern
bun run test -- --grep "User"

# Watch mode
bun run test -- --watch
```

### Writing Tests

```typescript
// tests/unit/formatDate.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from '~/lib/formatDate';

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2025-02-07');
    expect(formatDate(date)).toBe('Feb 7, 2025');
  });

  it('should handle invalid dates', () => {
    expect(formatDate(new Date('invalid'))).toBe('Invalid date');
  });
});
```

### Test Coverage

```bash
# Run tests with coverage
bun run test:run -- --coverage

# View coverage report
open coverage/index.html
```

---

## Debugging

### Browser DevTools

```bash
# 1. Open http://localhost:3000
# 2. Press F12 to open DevTools
# 3. Use Console, Network, Performance tabs
```

### Server Debugging

```bash
# Enable debug logging
DEBUG=familyhub:* bun run dev

# Enable specific module debugging
DEBUG=familyhub:auth bun run dev
```

### Database Debugging

```bash
# Open database studio
bun run db:studio

# Or use Adminer (web UI)
# http://localhost:8080
# User: family_hub
# Password: password
# Database: family_hub
```

### Redis Debugging

```bash
# Open Redis Commander
# http://localhost:8081

# Or use CLI
docker-compose exec redis redis-cli
> KEYS *
> GET key-name
> FLUSHALL  # Clear all data
```

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Dev Server",
      "runtimeExecutable": "bun",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

---

## Git Workflow

### Branch Naming

```
feature/user-profile          # New feature
fix/message-ordering          # Bug fix
docs/deployment-guide         # Documentation
refactor/auth-logic           # Code refactoring
test/user-router              # Tests
chore/update-deps             # Maintenance
```

### Creating a Pull Request

```bash
# 1. Create and switch to feature branch
git checkout -b feature/your-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add your feature"

# 3. Push to GitHub
git push origin feature/your-feature

# 4. Create PR on GitHub
# - Add description
# - Link related issues
# - Request reviewers

# 5. Address review comments
git add .
git commit -m "refactor: address review comments"
git push origin feature/your-feature

# 6. Merge when approved
# Use "Squash and merge" for clean history
```

### Keeping Branch Updated

```bash
# Fetch latest changes
git fetch origin

# Rebase on main
git rebase origin/main

# Or merge main into your branch
git merge origin/main

# Push updated branch
git push origin feature/your-feature --force-with-lease
```

---

## Common Tasks

### Adding a New Page

```bash
# 1. Create route file
touch app/routes/new-page.tsx

# 2. Add component
cat > app/routes/new-page.tsx << 'EOF'
import { useLoaderData } from 'react-router';

export default function NewPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">New Page</h1>
    </div>
  );
}
EOF

# 3. Type check
bun run typecheck

# 4. Test in browser
# http://localhost:3000/new-page
```

### Adding a New API Endpoint

```bash
# 1. Create router file
touch server/routers/newFeature.ts

# 2. Add endpoint
cat > server/routers/newFeature.ts << 'EOF'
import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

export const newFeatureRouter = router({
  getData: publicProcedure
    .query(async ({ ctx }) => {
      // Your logic here
      return { data: 'example' };
    }),
});
EOF

# 3. Register router in server/trpc.ts
# 4. Type check
bun run typecheck

# 5. Test with API client
```

### Adding a Database Table

```bash
# 1. Update schema in drizzle/schema.ts
# 2. Generate migration
bun run drizzle:generate

# 3. Review migration in drizzle/migrations/
# 4. Apply migration
bun run db:push

# 5. Update queries in server/db/queries/
```

### Running Database Migrations

```bash
# 1. Make schema changes in drizzle/schema.ts
# 2. Generate migration
bun run drizzle:generate

# 3. Review generated migration
cat drizzle/migrations/0001_*.sql

# 4. Apply migration
bun run db:push

# 5. Verify schema
bun run db:studio
```

---

## Troubleshooting

### Dev Server Won't Start

```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process using port
kill -9 <PID>

# Try clean restart
bun run clean
bun run dev
```

### Database Connection Error

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check connection string
echo $DATABASE_URL

# Test connection
docker-compose exec postgres psql -U family_hub family_hub -c "SELECT 1;"

# Restart database
docker-compose restart postgres
```

### Type Checking Errors

```bash
# Run full type check
bun run typecheck:full

# Check for any `any` types
grep -r "any" app/ server/ --include="*.ts" --include="*.tsx"

# Fix errors one by one
# Most common: missing type annotations, wrong imports
```

### Tests Failing

```bash
# Run tests with verbose output
bun run test -- --reporter=verbose

# Run specific test
bun run test -- formatDate.test.ts

# Check test file for issues
# Make sure mocks are set up correctly
```

### Hot Module Replacement (HMR) Not Working

```bash
# HMR should work automatically
# If not, check:

# 1. Browser console for errors
# 2. Dev server logs for issues
# 3. Try hard refresh (Ctrl+Shift+R)
# 4. Restart dev server if needed
```

### Redis Connection Issues

```bash
# Check if Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping

# Check Redis URL
echo $REDIS_URL

# Restart Redis
docker-compose restart redis
```

### Build Errors

```bash
# Clean build
rm -rf build/
bun run build

# Check for TypeScript errors
bun run typecheck:full

# Check for missing dependencies
bun install

# Try clean restart
bun run clean
bun run build
```

---

## IDE Setup

### VS Code Extensions

Install these extensions for best experience:

1. **ESLint** - Linting
2. **Prettier** - Code formatting
3. **TypeScript Vue Plugin** - TypeScript support
4. **Tailwind CSS IntelliSense** - Tailwind autocomplete
5. **REST Client** - API testing
6. **Thunder Client** - API client
7. **GitLens** - Git integration
8. **Vitest** - Test runner UI

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

---

## Performance Tips

### Development

- Use `bun run typecheck` (incremental) instead of `typecheck:full` during development
- Use `bun run dev:quick` if you know the database is clean
- Keep browser DevTools closed when not debugging (saves memory)
- Use React DevTools Profiler to find slow components

### Production

- Run `bun run build` to create optimized bundle
- Use `bun run prod` to preview production build
- Check bundle size: `bun run build` shows bundle stats
- Enable code splitting for large routes

---

## Resources

### Documentation
- [React Router Docs](https://reactrouter.com)
- [tRPC Docs](https://trpc.io)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [TypeScript Docs](https://www.typescriptlang.org)

### Tools
- [Vitest](https://vitest.dev) - Test runner
- [Prettier](https://prettier.io) - Code formatter
- [ESLint](https://eslint.org) - Linter
- [Zod](https://zod.dev) - Schema validation

### Community
- GitHub Issues - Report bugs
- GitHub Discussions - Ask questions
- Pull Requests - Contribute code

---

**Last Updated:** February 2025  
**Maintained By:** FamilyHub Team  
**Version:** 1.0.0
