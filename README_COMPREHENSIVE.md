# FamilyHub - Comprehensive Project Documentation

## 📚 Documentation Index

Welcome to FamilyHub! This comprehensive documentation covers everything you need to know about the project.

### Quick Navigation
1. [Project Overview](#project-overview)
2. [Getting Started](#getting-started)
3. [Architecture](#architecture)
4. [Development](#development)
5. [Deployment](#deployment)
6. [API Reference](#api-reference)
7. [Features](#features)
8. [Troubleshooting](#troubleshooting)

---

## Project Overview

**FamilyHub** is a modern family communication and coordination platform that brings families together through:
- 💬 Threaded message board for group conversations
- 👥 Private 1-on-1 messaging with read receipts
- 🎥 Two-way video calls with Jitsi
- 📸 Shared media gallery with smart photo tagging
- 📅 Shared calendar with event management
- 🎬 Integrated streaming services (Pluto, Tubi, Roku, Freeview)
- 🎮 Games & entertainment features
- 🤖 AI-powered features (summaries, event suggestions, photo tagging)
- 🌍 Multi-language support (English, Spanish, French)
- ☀️ Real-time weather widget with geolocation

### Key Statistics
- **Tech Stack**: React Router v7, tRPC, Drizzle ORM, PostgreSQL, Tailwind CSS
- **Deployment**: Vercel (frontend) + Supabase (database)
- **Real-time**: Pusher WebSockets
- **Components**: 145+ React components
- **Routes**: 32+ pages
- **API Endpoints**: 50+ tRPC procedures
- **Test Coverage**: 70%+ goal
- **Type Safety**: 100% TypeScript

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or bun
- Git
- PostgreSQL (for local development)

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/familyhub.git
cd familyhub

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local

# 4. Start database (if using Docker)
docker-compose up -d postgres

# 5. Run migrations
npx drizzle-kit migrate

# 6. Start development server
npm run dev

# App available at: http://localhost:3000
```

### Environment Variables
See `.env.example` for all required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `PUSHER_*` - Real-time messaging credentials
- `OPENAI_API_KEY` - For AI features
- `AWS_*` - For S3 media storage

---

## Architecture

### System Design
```
┌─────────────────┐
│  React Client   │ (localhost:3000)
│  React Router   │
│  TypeScript     │
└────────┬────────┘
         │ HTTP/WebSocket
         ▼
┌─────────────────┐
│  Vercel Server  │ (production)
│  Node.js        │
│  tRPC Router    │
└────────┬────────┘
         │ SQL
         ▼
┌─────────────────┐
│  PostgreSQL DB  │ (Supabase)
│  Drizzle ORM    │
└─────────────────┘
```

### Directory Structure
```
/workspace
├── app/
│   ├── routes/            # Page components
│   ├── components/        # Reusable UI components (145+)
│   ├── server/
│   │   └── trpc/         # API routers
│   ├── utils/            # Helper functions
│   ├── hooks/            # React hooks
│   ├── config/           # Configuration files
│   ├── providers/        # Context providers
│   ├── db/               # Database schemas
│   └── locales/          # i18n translations
├── drizzle/              # Migrations
├── docs/                 # Additional documentation
├── public/               # Static assets
└── tests/                # Test files
```

### Technology Stack
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React Router v7 | SSR + routing |
| UI | shadcn/ui + Tailwind | Component library |
| State | React Query + tRPC | Server state |
| API | tRPC | Type-safe RPC |
| Database | PostgreSQL + Drizzle | Data persistence |
| Real-time | Pusher | WebSocket messaging |
| Auth | Custom JWT | Authentication |
| Validation | Zod | Schema validation |
| Testing | Vitest | Unit tests |
| Deployment | Vercel | Hosting |

---

## Development

### Available Scripts

```bash
npm run dev           # Start development server (HMR)
npm run build        # Production build
npm run preview      # Preview production build
npm run typecheck    # TypeScript type checking
npm run test         # Run tests
npm run test:watch   # Watch mode
npm run test:ui      # UI test runner
npm run lint         # Lint code (if configured)
npm run format       # Format code (if configured)
```

### Code Structure Guidelines

#### Components
```typescript
// app/components/MyComponent.tsx
import React from 'react';

interface MyComponentProps {
  title: string;
  onClick?: () => void;
}

/**
 * MyComponent - Brief description
 * 
 * Detailed description of what it does,
 * when to use it, and any special props.
 */
export const MyComponent = React.memo(function MyComponent({
  title,
  onClick,
}: MyComponentProps) {
  return (
    <div onClick={onClick}>
      {title}
    </div>
  );
});

MyComponent.displayName = 'MyComponent';
```

#### API Routes
```typescript
// app/server/trpc/routers/myRouter.ts
import { router, procedure } from '../trpc';
import { z } from 'zod';

export const myRouter = router({
  getItem: procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      // Implementation
    }),

  createItem: procedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Implementation
    }),
});
```

### Best Practices

1. **Type Safety**
   - Always use TypeScript
   - Use Zod for runtime validation
   - No `any` types

2. **Performance**
   - Use `React.memo` for list items
   - Use `useMemo` for expensive calculations
   - Use `useCallback` for event handlers
   - Implement code splitting for heavy routes

3. **Accessibility**
   - Add ARIA labels
   - Ensure keyboard navigation
   - Test with screen readers
   - Maintain color contrast ratios

4. **Testing**
   - Write tests for utilities
   - Test critical user flows
   - Aim for 70%+ coverage
   - Use descriptive test names

5. **Code Quality**
   - Keep components small (< 300 lines)
   - Extract reusable logic to hooks
   - Document complex functions
   - Use meaningful variable names

---

## Deployment

### Production Deployment Checklist
- [ ] All tests passing
- [ ] Build successful
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificate ready
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Health checks passing

### Deploy to Vercel
```bash
# Automatic: Push to main branch
git push origin main

# Manual: Using Vercel CLI
npm install -g vercel
vercel --prod
```

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed steps.

---

## API Reference

### Quick API Examples

**Send a Message:**
```typescript
await trpc.messages.create.mutate({
  content: "Hello family!",
  familyId: "fam-123"
});
```

**Get Messages:**
```typescript
const messages = await trpc.messages.list.query({
  familyId: "fam-123",
  limit: 25
});
```

**Start Video Call:**
```typescript
await trpc.calls.start.mutate({
  title: "Weekly Check-in",
  participantIds: ["user-1", "user-2"],
  familyId: "fam-123"
});
```

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete reference.

---

## Features

### Core Features ✅
- [x] Authentication & Onboarding
- [x] Family Management
- [x] Message Board (threaded)
- [x] 1-on-1 Chat
- [x] Video Calls (Jitsi)
- [x] Media Gallery
- [x] Calendar
- [x] Streaming Theater
- [x] Settings & Preferences
- [x] Admin Dashboard
- [x] Content Moderation
- [x] Real-time Updates (Pusher)
- [x] Multi-language Support
- [x] Weather Widget

### Advanced Features ✅
- [x] AI Chat Summaries
- [x] Smart Photo Tagging
- [x] Event Suggestions
- [x] Emoji Reactions
- [x] Message Pinning
- [x] Thread Archiving
- [x] Read Receipts
- [x] Typing Indicators
- [x] Online Presence
- [x] Parental Controls

### Upcoming Features
- [ ] Games & Entertainment Module
- [ ] Music Sharing
- [ ] Watch Parties
- [ ] Achievements & Badges
- [ ] Mobile App (iOS/Android)
- [ ] Dark Mode

---

## Performance Optimization

### Current Optimizations
- ✅ Code splitting by route
- ✅ Image lazy loading with OptimizedImage component
- ✅ React.memo for expensive components
- ✅ React Query caching (60s stale time)
- ✅ Skeleton loaders for all async data
- ✅ Page transition animations
- ✅ Bundle analysis tools

### Performance Metrics
- **Lighthouse Score**: 90+ (target)
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.5s
- **Bundle Size**: < 150KB (gzipped)

See [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md) for detailed guide.

---

## Testing

### Test Structure
```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── e2e/            # End-to-end tests
```

### Running Tests
```bash
npm run test              # All tests
npm run test:watch       # Watch mode
npm run test:ui          # UI test runner
npm run test:coverage    # With coverage
```

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for comprehensive testing documentation.

---

## Troubleshooting

### Common Issues

**Problem: Port 3000 already in use**
```bash
# Kill process on port 3000
fuser -k 3000/tcp

# Or use different port
npm run dev -- --port 3001
```

**Problem: Database connection error**
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

**Problem: Missing translations**
- Check all 3 locale files (en.json, es.json, fr.json)
- Keys must match exactly
- Use dot notation for nested keys

**Problem: Real-time not working**
- Verify Pusher credentials
- Check network tab for WebSocket connection
- See console for connection errors

### Getting Help

1. **Check Documentation**
   - [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
   - [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
   - [TESTING_GUIDE.md](./TESTING_GUIDE.md)
   - [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md)

2. **Search Codebase**
   ```bash
   grep -r "searchTerm" app/
   ```

3. **Review Error Logs**
   - Browser console (DevTools)
   - Server logs (terminal)
   - Error boundary messages

4. **Ask Coding Agent**
   - Describe the issue
   - Include error messages
   - Provide context

---

## Contributing

### Pull Request Process
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit: `git commit -m "feat: add my feature"`
3. Push to origin: `git push origin feature/my-feature`
4. Create Pull Request with description
5. Wait for CI checks and review
6. Merge after approval

### Code Style
- Follow TypeScript conventions
- Use descriptive names
- Comment complex logic
- Keep functions small
- Test your changes

---

## License & Legal

- **License**: [Add your license]
- **Terms of Service**: [Link to TOS]
- **Privacy Policy**: [Link to privacy]

---

## Resources & Links

### Documentation
- [tRPC Documentation](https://trpc.io)
- [React Router v7](https://reactrouter.com)
- [Drizzle ORM](https://orm.drizzle.team)
- [Vercel Docs](https://vercel.com/docs)

### Tools & Services
- [Supabase](https://supabase.com) - PostgreSQL hosting
- [Pusher](https://pusher.com) - Real-time messaging
- [Jitsi](https://jitsi.org) - Video conferencing
- [OpenAI API](https://openai.com/api) - AI features

### Community
- GitHub Issues: [Report bugs](https://github.com/your-org/familyhub/issues)
- Discussions: [Ask questions](https://github.com/your-org/familyhub/discussions)
- Email: support@familyhub.app

---

## Project Status

**Current Phase**: MVP Complete ✅

| Phase | Status | Est. Completion |
|-------|--------|-----------------|
| Core Features | ✅ Complete | Jan 2026 |
| Polish & Enhancement | 🔄 In Progress | Feb 2026 |
| Testing & QA | ⏳ Pending | Feb 2026 |
| Documentation | 🔄 In Progress | Feb 2026 |
| Deployment | ⏳ Pending | Mar 2026 |
| Games & Entertainment | 🔲 Not Started | Apr 2026 |

---

## Maintenance

### Regular Tasks
- **Daily**: Monitor error logs, check uptime
- **Weekly**: Review performance, check dependencies
- **Monthly**: Security audit, optimize queries
- **Quarterly**: Plan new features, plan scaling

### Support & Operations
- Error monitoring: Sentry
- Performance monitoring: New Relic
- Uptime monitoring: UptimeRobot
- Backups: Automated daily

---

**Last Updated**: February 2026
**Maintained By**: FamilyHub Team
**Questions?** Check the documentation or ask the coding agent!
