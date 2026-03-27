# FamilyHub Performance Optimization Guide

## Overview
This document outlines performance optimizations implemented in FamilyHub to ensure fast, responsive user experience.

---

## 1. Component Optimization

### React.memo for Expensive Components
Use `React.memo()` to prevent unnecessary re-renders:

```tsx
const ExpensiveComponent = React.memo(function Component(props) {
  // Component logic
  return <div>{props.children}</div>;
}, (prevProps, nextProps) => {
  // Custom comparison logic if needed
  return prevProps.id === nextProps.id;
});
```

**Apply to:**
- `MessageCard` - Rendered in lists of 100+
- `ConversationItem` - Rendered in scrollable lists
- `MediaThumbnail` - Rendered in grids
- `UserAvatar` - Rendered repeatedly

### useMemo for Expensive Calculations
```tsx
const sortedMessages = useMemo(() => {
  return messages.sort((a, b) => b.timestamp - a.timestamp);
}, [messages]);
```

**Apply to:**
- Message filtering/sorting
- Large array transformations
- Heavy computations

### useCallback for Function Stability
```tsx
const handleDelete = useCallback((id: string) => {
  deleteMessage(id);
}, [deleteMessage]);
```

---

## 2. Image Optimization

### Use OptimizedImage Component
```tsx
import { OptimizedImage } from '~/components/OptimizedImage';

<OptimizedImage
  src={imageUrl}
  alt="Family photo"
  fallback={placeholderUrl}
  containerClassName="w-full h-64"
/>
```

**Features:**
- Lazy loading with Intersection Observer
- Blur-up effect while loading
- Error handling with fallback
- Automatic srcset support

### Image Best Practices
- Keep images under 500KB
- Use WebP format when possible
- Compress using ImageOptim or similar
- Add CDN caching headers

---

## 3. Code Splitting

### Route-based Code Splitting
React Router automatically code-splits by route. No additional config needed.

### Component-level Code Splitting
```tsx
import { lazy, Suspense } from 'react';
import { PageSkeleton } from '~/components/LoadingSkeletons';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

export function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

---

## 4. React Query Optimization

### Query Configuration
Configured in `/app/config/queryClient.ts`:
- `staleTime: 60s` - Data stays fresh for 1 minute
- `gcTime: 300s` - Cache kept for 5 minutes
- `retry: 3` - Automatic retry with exponential backoff
- Automatic request deduplication

### Using Query Keys
```tsx
import { queryKeys } from '~/config/queryClient';

const { data } = useQuery({
  queryKey: queryKeys.messages.list(),
  queryFn: () => trpc.messages.list.query(),
});
```

Benefits:
- Type-safe query invalidation
- Consistent cache structure
- Easy prefetching

---

## 5. Bundle Size Optimization

### Current Bundle Size Targets
- Main bundle: < 150KB (gzipped)
- Initial JS: < 300KB (gzipped)

### Monitoring
```bash
npm run build
npm run analyze  # If available
```

### Optimization Strategies
- Remove unused dependencies
- Use tree-shaking compatible packages
- Lazy load heavy dependencies
- Defer non-critical features

---

## 6. Network Optimization

### Request Batching
tRPC automatically batches multiple requests within 5ms window.

### Pagination
```tsx
const { data: messages, fetchNextPage } = useInfiniteQuery({
  queryKey: queryKeys.messages.list(),
  queryFn: ({ pageParam = 0 }) => 
    trpc.messages.list.query({ skip: pageParam, take: 25 }),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

### Optimistic Updates
```tsx
const { mutate } = useMutation({
  mutationFn: (newMessage) => trpc.messages.create.mutate(newMessage),
  onMutate: async (newMessage) => {
    // Optimistically update UI
    queryClient.setQueryData(queryKeys.messages.list(), (old) => [
      ...old,
      newMessage,
    ]);
  },
});
```

---

## 7. Loading States

### Using Loading Skeletons
```tsx
import { MessageCardSkeleton } from '~/components/LoadingSkeletons';

function MessageList() {
  const { data: messages, isLoading } = useQuery({...});
  
  if (isLoading) {
    return (
      <>
        <MessageCardSkeleton />
        <MessageCardSkeleton />
      </>
    );
  }
  
  return messages.map(msg => <MessageCard key={msg.id} message={msg} />);
}
```

---

## 8. Animations & Transitions

### Page Transitions
All pages wrapped in `<PageTransition>` component for smooth fade-in.

### Recommended Durations
- Page transitions: 300ms
- Component animations: 200-300ms
- Hover effects: 150ms
- Loading animations: Infinite loop

---

## 9. Monitoring & Analytics

### Performance Metrics to Track
```tsx
// In production, track:
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- First Input Delay (FID)
- Time to Interactive (TTI)
```

### Using Web Vitals
```bash
npm install web-vitals
```

```tsx
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

---

## 10. Development Optimization

### DevTools Recommendations
1. **React DevTools Profiler**
   - Identify slow components
   - Check render counts

2. **Chrome DevTools Performance Tab**
   - Record and analyze page load
   - Check for jank/frame drops

3. **Lighthouse**
   - Run audits regularly
   - Target 90+ scores

### Local Testing
```bash
# Production build
npm run build

# Serve production build locally
npm run preview
```

---

## Checklist for New Features

- [ ] Component uses `React.memo` if in a list
- [ ] Expensive calculations wrapped in `useMemo`
- [ ] Callbacks stable with `useCallback`
- [ ] Images use `<OptimizedImage>`
- [ ] Loading state has skeleton loader
- [ ] Long lists use pagination or virtualization
- [ ] Error handling in place
- [ ] No console warnings/errors
- [ ] Bundle size impact assessed

---

## Performance Targets

| Metric | Target | Tool |
|--------|--------|------|
| FCP | < 1.5s | Lighthouse |
| LCP | < 2.5s | Lighthouse |
| CLS | < 0.1 | Lighthouse |
| TTI | < 3.5s | Lighthouse |
| Bundle (gzipped) | < 150KB | webpack-bundle-analyzer |
| API response | < 200ms | Network tab |

---

## Resources
- [React Performance](https://react.dev/reference/react/memo)
- [React Query Docs](https://tanstack.com/query/latest)
- [Web.dev Performance](https://web.dev/performance/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
