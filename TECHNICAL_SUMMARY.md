# 🏗️ FamilyHub - TECHNICAL SUMMARY

Complete technical overview of the FamilyHub app architecture, stack, and implementation.

---

## 🛠️ TECH STACK

### **Frontend**
- **Framework:** React Router v7 (SSR) + Vite
- **UI Library:** shadcn/ui
- **Styling:** Tailwind CSS
- **State Management:** React Context (family, auth, presence)
- **Real-time:** Pusher (WebSocket subscriptions)

### **Backend**
- **API:** tRPC (type-safe RPC)
- **Server:** React Router Server-Side Rendering
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Auth:** Custom (bcrypt + sessions + Arctic OAuth)
- **Validation:** Zod

### **Infrastructure**
- **Hosting:** Vercel (recommended) or Railway
- **Database:** Railway, PlanetScale, or Supabase
- **Real-time:** Pusher
- **Video:** Jitsi (self-hosted or meet.jit.si)
- **Storage:** Vercel Blob or AWS S3

### **DevOps**
- **Package Manager:** Bun
- **Testing:** Vitest
- **Linting:** ESLint + Prettier
- **Type Checking:** TypeScript

---

## 📁 PROJECT STRUCTURE

```
/workspace
├── app/
│   ├── routes/                 # React Router routes
│   │   ├── auth/              # OAuth routes (GitHub, Google)
│   │   ├── dashboard/         # Protected dashboard routes
│   │   ├── home.tsx           # Landing page
│   │   ├── login.tsx          # Login page
│   │   └── signup.tsx         # Signup page
│   │
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── branding/          # FamilyLogo, FamilySwitcher
│   │   ├── message-board/     # Message board features
│   │   ├── media-gallery/     # Photo/video gallery
│   │   ├── shopping-list/     # Shopping list components
│   │   ├── video-call/        # Video call UI
│   │   └── ...                # Other feature components
│   │
│   ├── server/
│   │   ├── trpc/routers/      # tRPC procedures
│   │   │   ├── auth.router.ts
│   │   │   ├── family.router.ts
│   │   │   ├── member.router.ts
│   │   │   ├── messages.router.ts
│   │   │   ├── media.router.ts
│   │   │   └── ...
│   │   └── oauth.server.ts    # OAuth helpers (Arctic)
│   │
│   ├── db/
│   │   ├── schema/            # Drizzle schemas
│   │   │   ├── users.ts
│   │   │   ├── families.ts
│   │   │   ├── members.ts
│   │   │   ├── messages.ts
│   │   │   ├── media.ts
│   │   │   └── ...
│   │   └── migrations/        # Database migrations
│   │
│   ├── utils/
│   │   ├── trpc.ts           # tRPC client setup
│   │   ├── trpc.server.ts    # Server-side tRPC
│   │   ├── auth.tsx          # Auth utilities
│   │   ├── familyContext.tsx # Family context provider
│   │   ├── mediaValidation.ts # File validation
│   │   └── ...
│   │
│   ├── locales/              # i18n translations
│   │   ├── en.json
│   │   ├── es.json
│   │   └── fr.json
│   │
│   ├── hooks/
│   │   ├── useFamily.ts      # Family context hook
│   │   ├── useAuth.ts        # Auth context hook
│   │   └── ...
│   │
│   └── root.tsx              # Root layout + tRPC setup
│
├── public/
│   ├── family-logo.svg       # Custom family logo
│   └── favicon.ico
│
├── vite.config.ts            # Vite config
├── drizzle.config.ts         # Drizzle config
├── tsconfig.json             # TypeScript config
├── tailwind.config.ts        # Tailwind config
└── package.json              # Dependencies
```

---

## 🔐 AUTHENTICATION FLOW

```
User → Signup/Login → Email + Password (bcrypt hashed)
                   ↓
                Create Session
                   ↓
           Set Secure Cookie
                   ↓
      Middleware validates on each request
                   ↓
           Access Protected Routes
```

**OAuth Support:**
- GitHub (via Arctic)
- Google (via Arctic)
- Custom email/password

---

## 👥 MULTI-TENANT ARCHITECTURE

**Key Principle:** All data is isolated by `familyId`

### **Database Isolation:**
```sql
-- Every table includes familyId foreign key
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  familyId UUID NOT NULL REFERENCES families(id),
  userId UUID NOT NULL REFERENCES users(id),
  content TEXT,
  -- ...
);

-- Queries always filter by familyId
SELECT * FROM messages WHERE familyId = ? AND id = ?
```

### **Access Control:**
```typescript
// tRPC middleware validates family membership
export const familyProcedure = baseProcedure
  .use(async (opts) => {
    const user = opts.ctx.user; // from session
    const { familyId } = opts.input;
    
    // Verify user is member of family
    const member = await db.query.familyMembers.findFirst({
      where: (fm) => and(
        eq(fm.userId, user.id),
        eq(fm.familyId, familyId)
      )
    });
    
    if (!member) throw new Error('Not a family member');
    return opts.next({ ctx: { familyId, member } });
  });
```

---

## 🌐 INTERNATIONALIZATION (i18n)

### **How it Works:**

1. **Browser Language Detection** (on first load)
   ```typescript
   const browserLang = navigator.language.split('-')[0];
   const supportedLang = ['en', 'es', 'fr'].includes(browserLang)
     ? browserLang
     : 'en';
   localStorage.setItem('language', supportedLang);
   ```

2. **Language Files** (`app/locales/*.json`)
   ```json
   {
     "dashboard.welcome": "Welcome to FamilyHub",
     "shopping.title": "Shopping Lists",
     "messages.threadReply": "Reply in thread"
   }
   ```

3. **Translation Hook** (`useTranslation()`)
   ```typescript
   const { t } = useTranslation();
   return <h1>{t('dashboard.welcome')}</h1>;
   ```

**Supported Languages:**
- English (en)
- Spanish (es)
- French (fr)

---

## 🔔 REAL-TIME FEATURES

### **Pusher Integration**

**Presence (online/offline status):**
```typescript
// Subscribe to family presence
const presence = usePusher()
  .subscribe(`presence-family-${familyId}`)
  .on('subscribe', () => setIsOnline(true))
  .on('unsubscribe', () => setIsOnline(false));
```

**Typing Indicators:**
```typescript
// Emit when user starts typing
presence.trigger('client-typing', {
  userId: user.id,
  isTyping: true
});
```

**Real-time Updates:**
```typescript
// New messages appear live
messages.on('message-created', (message) => {
  setMessages(prev => [...prev, message]);
});
```

---

## 📊 KEY FEATURES IMPLEMENTATION

### **1. Message Board (Threaded)**
- **DB Tables:** messages, messageReplies, messageModeration
- **Real-time:** Pusher subscriptions
- **Features:** Nested replies, pinning, archiving, emoji reactions
- **File:** `app/components/message-board/`

### **2. Media Gallery**
- **DB Tables:** media, mediaModeration
- **Upload:** Vercel Blob / AWS S3
- **Features:** Photo/video upload, sorting, tags, AI tagging (future)
- **File:** `app/components/media-gallery/`

### **3. Shopping Lists**
- **DB Tables:** shoppingLists, shoppingListItems, listAssignments
- **Real-time:** Pusher updates
- **Features:** Categories, checkboxes, item assignment, sharing
- **File:** `app/components/shopping-list/`

### **4. Video Calls (Jitsi)**
- **Provider:** Jitsi (meet.jit.si or self-hosted)
- **Features:** 1-on-1 and group calls, screen sharing
- **File:** `app/components/video-call/`

### **5. Calendar**
- **DB Tables:** calendarEvents
- **Integration:** Shopping lists, announcements
- **Features:** Event creation, visibility control, reminders
- **File:** `app/components/calendar/`

---

## 🔄 tRPC ROUTER STRUCTURE

### **Base Procedure (with auth):**
```typescript
const authenticatedProcedure = baseProcedure.use(
  async (opts) => {
    const user = opts.ctx.user;
    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
    return opts.next({ ctx: { userId: user.id } });
  }
);
```

### **Router Pattern:**
```typescript
export const familiesRouter = router({
  // Queries
  getAll: authenticatedProcedure
    .query(async ({ ctx }) => {
      return db.query.families.findMany({
        where: (f) => eq(f.userId, ctx.userId)
      });
    }),

  // Mutations
  create: authenticatedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return db.insert(families)
        .values({ id: uuid(), userId: ctx.userId, surname: input.name })
        .returning();
    })
});
```

---

## 📱 RESPONSIVE DESIGN

### **Mobile-first Approach:**
```css
/* Mobile (default) */
.dashboard { padding: 1rem; }

/* Tablet */
@media (min-width: 768px) {
  .dashboard { padding: 2rem; }
}

/* Desktop */
@media (min-width: 1024px) {
  .dashboard { display: grid; grid-template-columns: 1fr 1fr; }
}
```

### **Breakpoints:**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

---

## 🚀 DEPLOYMENT CHECKLIST

### **Before Deploying:**
- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Tests passing
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Logo/assets in public folder
- [ ] .env.example documented

### **After Deploying:**
- [ ] Test login flow
- [ ] Test core features
- [ ] Verify database connection
- [ ] Check real-time features (Pusher)
- [ ] Monitor error logs

---

## 🛡️ SECURITY CONSIDERATIONS

1. **Password Hashing:** bcrypt with salt rounds = 10
2. **Sessions:** Secure HTTPOnly cookies
3. **CSRF Protection:** Built into tRPC
4. **SQL Injection:** Protected by Drizzle ORM
5. **Input Validation:** Zod schemas on all inputs
6. **Rate Limiting:** Can add at Vercel level
7. **Data Isolation:** Family-based access control
8. **OAuth:** Via Arctic (trusted provider)

---

## 📈 PERFORMANCE OPTIMIZATIONS

1. **Code Splitting:** React Router lazy loading
2. **Image Optimization:** Next.js Image (or Vercel Blob)
3. **Database Indexes:** On familyId, userId
4. **Caching:** Vercel edge caching
5. **Bundle Size:** Tree-shaking, minification
6. **Real-time Efficiency:** Pusher presence instead of polling

---

## 🐛 DEBUGGING

### **Common Issues & Solutions:**

**Database Connection Error:**
```
Check: DATABASE_URL in .env
Run: npm run db:push (local) or migrations on production
```

**Pusher Real-time Not Working:**
```
Check: PUSHER_* env vars set
Test: Open Pusher dashboard, verify subscriptions
```

**Logo Not Displaying:**
```
Check: /public/family-logo.svg exists
Check: File is committed to git
Clear: Browser cache (Ctrl+Shift+Delete)
```

**OAuth Failing:**
```
Check: Client ID/Secret correct
Check: Redirect URL matches OAuth provider settings
Check: HTTPS in production (automatic on Vercel)
```

---

## 📚 USEFUL COMMANDS

```bash
# Development
bun run dev              # Start dev server
bun run build            # Build for production
bun run preview          # Preview production build

# Database
bun run db:push         # Push schema changes
bun run db:migrate      # Run migrations
bun run db:studio       # Open Drizzle Studio

# Testing
bun run test            # Run tests
bun run test:watch      # Watch mode

# Linting
bun run lint            # Run ESLint
bun run format          # Format with Prettier
```

---

## 🔗 IMPORTANT LINKS

- **Vercel Docs:** https://vercel.com/docs
- **React Router:** https://remix.run/docs/en/main
- **tRPC:** https://trpc.io/docs
- **Drizzle:** https://orm.drizzle.team/docs
- **Tailwind:** https://tailwindcss.com/docs
- **shadcn/ui:** https://ui.shadcn.com

---

## 💬 SUPPORT

For technical questions, refer to this document. For changes/bugs, contact me directly.

**FamilyHub is production-ready. Good luck! 🚀**
