# React Router v7 + tRPC + Drizzle App

## Stack
- **Framework**: React Router v7 (formerly Remix) + Vite
- **API**: tRPC (type-safe RPCs)
- **Database**: PostgreSQL + Drizzle ORM
- **UI**: React 18, Tailwind CSS, shadcn/ui
- **Real-time**: WebSocket + tRPC subscriptions
- **Auth**: Custom (bcrypt + sessions + Arctic OAuth)

** BE AWARE THAT OUR STACK IS SSR AND MIGHT INTRODUCE ISSUES RELATED

## ⚠️ FIRST PRIORITY: Dev Server on Port 3000

**Before doing ANY work, ensure the dev server is running correctly on port 3000.**

### Startup Check (RUN THIS FIRST)
```bash
# Check what's running on common ports
fuser 3000/tcp 3001/tcp 3002/tcp 5173/tcp 2>/dev/null || echo "No servers running"

# If port 3000 is free, start the dev server
fuser 3000/tcp 2>/dev/null && echo "✅ Dev server running on port 3000" || (cd /workspace && bun run dev)
```

### If Server is on Wrong Port (3001, 5173, etc.)
```bash
# Kill ALL dev servers and restart on correct port (fuser multi-port: ~40ms vs 300ms+ for 12 lsof calls)
fuser -k 3000/tcp 3001/tcp 5173/tcp 2>/dev/null || true
cd /workspace && bun run dev
```

### Rules
1. **Port 3000 is the ONLY exposed port** - other ports won't be accessible to users
2. **Only ONE dev server** should run at a time - multiple servers cause port conflicts
3. **Always verify** before browser testing - if server is on wrong port, tests will fail
4. **Don't start a new server** if one is already running on 3000 - HMR handles reloads


## Structure
```
app/
├── routes.ts              # Route config (add routes here first)
├── routes/                # Route modules (loaders, actions, components)
│   └── auth/              # OAuth routes (github, google)
├── components/ui/         # shadcn/ui components
├── server/
│   ├── trpc/routers/      # tRPC procedures
│   └── oauth.server.ts    # OAuth helpers (Arctic)
├── db/schema/             # Drizzle schemas (incl. auth.ts)
└── utils/                 # trpc.ts, auth.tsx, emitter.server.ts
```

## IMPORTANT: PRESET TEMPLATE ROUTES (LOGIC/NAVIGATION MUST BE UPDATED TO USERS CONTEXT)
- routes/home.tsx (landing page), login.tsx, signup.tsx (auth and redirects to dashboard), routes/dashboard.tsx  (placeholder template dashboard, should have subroutes once user is logged in such as dashboard/settings or dashboard/users)

## RULES FOR TEMPLATE ROUTES
- If using `dashboard.tsx` you must make sure the user is redirected to the correct place after login and that dashboard has subroutes nested using either Outlet or direct sub routes
- For Auth pay attention to which routes need to be protected by auth and not. If you use the dashboard.tsx then it should be protected by default any subroute.
 - home.tsx should be the marketing landing page entry point, unless the app is a single page application that gets right into the action
 - in home.tsx make sure you don't include the design system link routed it should be exactly what's necessary for the user's context

## Key Patterns

**Routes**: Define in `routes.ts`, implement in `routes/*.tsx`. Use `Route.LoaderArgs` types from `./+types/routeName`.

**Loaders**: Fetch data server-side before rendering. Use `callTrpc(request)` for type-safe data access. Access data via `loaderData` prop (React Router v7 pattern, not `useLoaderData` hook).

```tsx
import { callTrpc } from '~/utils/trpc.server';
import type { Route } from './+types/myRoute';

// Server-side data fetching via tRPC (no HTTP overhead)
export async function loader({ request, params }: Route.LoaderArgs) {
  const caller = await callTrpc(request);
  const todos = await caller.todo.getAll();
  return { todos, count: todos.length };
}

// Component receives loaderData as prop
export default function MyRoute({ loaderData }: Route.ComponentProps) {
  return <div>Loaded {loaderData.count} todos</div>;
}
```

Key loader patterns:
- Always use `callTrpc(request)` for data access (type-safe, no HTTP overhead)
- Throw `Response` or use `redirect()` for error/auth handling
- Return plain objects (automatically serialized)

**tRPC**: Define procedures in `server/trpc/routers/`, register in `root.ts`. Use `trpc.router.procedure.useQuery()` client-side.

**Database**: Schemas in `db/schema/`, queries via `db.select().from(table)`.

**SSR Safety**: Always use `enabled: isClient` for client-only queries/subscriptions, AVOID window and document in SSR routes

**Server-side tRPC**: Use `callTrpc(request)` for direct RPC in loaders (no HTTP overhead).

**Actions & Forms**: Use React Router's `action` function for form submissions. Define `export async function action({ request }: Route.ActionArgs)` in route files. Use `<Form method="post">` for progressive enhancement or `useFetcher()` for non-navigation submissions.

```tsx
// Route action
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  // Handle mutation, return data or redirect
  return { success: true };
}

// Component - navigating form
<Form method="post"><button name="intent" value="delete">Delete</button></Form>

// Component - non-navigating (fetcher)
const fetcher = useFetcher();
<fetcher.Form method="post">...</fetcher.Form>
```

**Navigation**: Use `useNavigate()` for programmatic navigation, `<Link to="/path">` for links, `redirect()` from loaders/actions.

**Auth**: Custom session-based auth (bcrypt + cookies) with Arctic OAuth.

**Routes**: `/login`, `/signup`, `/dashboard` (protected), `/auth/github`, `/auth/google`

**Flow**: Auth → `/dashboard`. Protected routes redirect to `/login` if not signed in.

## Test User (IMPORTANT)

A test user is seeded into the database for development and testing. **Use these credentials whenever you need to log in:**

```
Email:    test@test.com
Password: test123
```

The test user is created during `bun run db:seed` or `bun run db:reset`. If the database was reset, run one of these commands to recreate the test user.

```tsx
// Client-side (any component)
const { isSignedIn, user, signOut } = useAuth();

// Server-side (loaders) - use for protected routes
export async function loader({ request }: Route.LoaderArgs) {
  const caller = await callTrpc(request);
  const { user, isSignedIn } = await caller.auth.me();
  if (!isSignedIn) return redirect('/login');
  return { user };
}
```

**Files**:
- `db/schema/auth.ts` - users, sessions, oauth_accounts tables
- `server/oauth.server.ts` - Arctic OAuth + `handleOAuthCallback()`
- `routes/auth/` - OAuth routes (github, google)
- `utils/auth.tsx` - AuthProvider + useAuth hook

**OAuth env vars** (optional, OAuth buttons hidden if not set):
```
GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
```

**Add new OAuth provider**:
1. Add provider to `server/oauth.server.ts`
2. Create `routes/auth/[provider].tsx` + `[provider].callback.tsx`
3. Call `handleOAuthCallback(provider, id, { email, name, avatarUrl })`


## Commands
```bash
bun run dev        # Clean restart + start dev server (port 3000)
bun run dev:quick  # Quick start without cleanup
bun run clean      # Kill processes and clear caches only
bun run typecheck  # Fast tsgo only (use this one)
bun run typecheck:full  # Regenerate route types + tsgo (after route changes)
bun run typegen    # Just regenerate route types
bun run dev        # Start dev server (port 3000) - USE HMR, DON'T RESTART
bun run typecheck  # Type check (~2-3s first, ~1s after with cache)
bun run db:push    # Push schema to database
bun run db:reset   # Reset database (wipe + push + seed)
```

**Typecheck is expensive** — only run as a final step before testing, not after every edit. The dev server auto-regenerates route types, so `typecheck` (tsc only) is usually sufficient.

## Important Notes
- `home.tsx` is a placeholder - replace with actual entry point, dashboard.tsx and signup.tsx / login.tsx are all placeholders and need to be updated with the users app context.
- Bind servers to `0.0.0.0` and port `3000` only (not localhost) for Kubernetes access

# for Client only modules/functionality that dont work well with our SSR app - such as pigeon-map for rendering maps or certain analytics tracking frameworks for example use the following pattern:

You may have a file or dependency that uses module side effects in the browser. You can use *.client.ts on file names or nest files within .client directories to force them out of server bundles.

when using this pattern always lazy load the client side module such as this:

const MemorialMap = lazy(() =>
  import('~/components/MemorialMap.client').then(m => ({
    default: m.MemorialMap
  }))
);

then use in parent component with Suspense like this example:
export default function MemorialsPage({ loaderData }: Route.ComponentProps) {
  return (
    <div className="h-screen w-full overflow-hidden bg-background dark:bg-background">
      <Suspense fallback={<div className="h-full w-full flex items-center justify-center bg-background dark:bg-background"><div className="text-center"><p className="text-neutral-400 mb-2">Loading memorial map...</p></div></div>}>
        <MemorialMap />
      </Suspense>
    </div>
  );
}

---

## FamilyHub Design System

### Aesthetic & Philosophy
**FamilyHub** is a warm, inclusive family connection platform. Design should feel **welcoming, accessible, and human** — not corporate or clinical. The interface celebrates family moments with a palette inspired by sunset warmth, soft rose blushes, and calm teal accents.

**Core Principles:**
- **Warmth**: Use warm, inviting colors that feel like home
- **Accessibility**: High contrast, clear typography, easy navigation on all devices
- **Trust**: Clean, organized layouts that inspire confidence with family data
- **Inclusivity**: Works for grandparents to kids; responsive on phones, tablets, desktops
- **Delight**: Subtle animations and thoughtful details that surprise

### Color Palette

**Primary Colors:**
- **Warm Orange/Amber** (HSL: 25 84% 60%) - Main accent, buttons, CTAs. Feels energetic and welcoming
- **Soft Rose** (HSL: 350 80% 60%) - Secondary accent, highlights, hover states. Gentle and intimate
- **Calm Teal** (HSL: 180 60% 55%) - Tertiary accent, positive feedback, borders. Stable and peaceful

**Neutral Palette:**
- **Off-White** (HSL: 0 0% 98%) - Light backgrounds, cards
- **Warm Gray** (HSL: 30 8% 95%) - Subtle backgrounds, borders
- **Dark Slate** (HSL: 220 13% 20%) - Text, headings. Deep but not pure black

**Semantic Colors:**
- **Success**: Teal (180 60% 55%)
- **Warning**: Warm Orange (25 84% 60%)
- **Error**: Rose (350 80% 60%)
- **Info**: Calm Blue (200 70% 55%)

### Typography

- **Display Font**: Use warm, friendly sans-serif (e.g., Inter for clarity, or Poppins for friendliness)
- **Heading Scale**: h1 (2.5rem), h2 (2rem), h3 (1.5rem), h4 (1.25rem)
- **Body Font**: 1rem (16px), line-height 1.6 for readability
- **Small Text**: 0.875rem (14px) for captions, timestamps
- **Letter Spacing**: Tight (leading) for warmth, generous for breathing room

### Component Patterns

- **Buttons**: Rounded corners (0.375rem), hover state uses darker shade, active uses complementary color
- **Cards**: Subtle shadows, rounded corners (0.5rem), warm white background with teal or rose borders for emphasis
- **Forms**: Large tap targets (44px min), clear labels, warm background on focus
- **Navigation**: Sticky top bar with logo/title, warm background, warm orange highlights for active state
- **Messaging Board**: Soft cards for messages, threaded replies with subtle indentation and teal borders, timestamps in warm gray

### Spacing System
Use Tailwind's default spacing scale:
- **xs**: 0.25rem, **sm**: 0.5rem, **md**: 1rem, **lg**: 1.5rem, **xl**: 2rem, **2xl**: 3rem

### Dark Mode
When in dark mode, shift hues slightly:
- **Base Background**: Dark slate (220 13% 10%)
- **Card Background**: Dark slate (220 13% 15%)
- **Text**: Off-white (0 0% 98%)
- **Accents**: Keep warm orange, rose, teal but at adjusted brightness for contrast

---

## 🔧 Bug Investigation Protocol

**When asked to "debug", "investigate", or "fix" an issue:**

1. **Diagnose** the root cause thoroughly
2. **Immediately implement the fix** - NEVER stop at just diagnosis
3. **Verify** the fix works via browser/tests
4. Only report back **after the fix is confirmed working**

⚠️ **Do NOT produce debug summaries and stop** - always follow through with the actual fix.

```
❌ WRONG: Diagnose issue → Write "DEBUG FINDINGS" summary → Stop
✅ RIGHT: Diagnose issue → Make code changes to fix it → Verify fix → Report success
```
