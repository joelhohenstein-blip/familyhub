# FamilyHub Testing Guide

## Overview
Comprehensive testing strategy for FamilyHub covering unit tests, integration tests, and end-to-end tests.

---

## Phase 1: Unit Testing

### Setup
FamilyHub uses **Vitest** for unit testing (already configured).

### Running Tests
```bash
npm run test              # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

### Test File Structure
```
src/
├── utils/
│   ├── helpers.ts
│   └── helpers.test.ts
├── hooks/
│   ├── useToast.ts
│   └── useToast.test.ts
└── components/
    ├── Button.tsx
    └── Button.test.tsx
```

### Example Unit Tests

#### Testing Utilities
```typescript
// app/utils/errorHandler.test.ts
import { describe, it, expect } from 'vitest';
import { handleError } from './errorHandler';

describe('errorHandler', () => {
  it('should handle Error objects', () => {
    const error = new Error('Test error');
    const result = handleError(error);
    
    expect(result.message).toBe('Test error');
    expect(result.details).toBeDefined();
  });

  it('should handle string errors', () => {
    const result = handleError('String error');
    
    expect(result.message).toBe('String error');
  });

  it('should use custom user message', () => {
    const error = new Error('Internal error');
    const result = handleError(error, 'Custom message');
    
    expect(result.message).toBe('Custom message');
  });
});
```

#### Testing Hooks
```typescript
// app/hooks/useToast.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from './useToast';

describe('useToast', () => {
  it('should return toast methods', () => {
    const { result } = renderHook(() => useToast());
    
    expect(result.current.success).toBeDefined();
    expect(result.current.error).toBeDefined();
    expect(result.current.info).toBeDefined();
  });
});
```

#### Testing Components
```typescript
// app/components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('should call onClick handler', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click</Button>);
    
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

---

## Phase 2: Integration Testing

### Testing tRPC Routes

```typescript
// app/server/trpc/routers/messages.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createInnerTRPCContext } from '../trpc';
import { appRouter } from '../root';

describe('Messages Router', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(async () => {
    const ctx = await createInnerTRPCContext({ userId: 'test-user' });
    caller = appRouter.createCaller(ctx);
  });

  it('should create a message', async () => {
    const result = await caller.messages.create({
      content: 'Test message',
      familyId: 'test-family',
    });

    expect(result.id).toBeDefined();
    expect(result.content).toBe('Test message');
  });

  it('should list messages', async () => {
    const result = await caller.messages.list({ 
      familyId: 'test-family',
      limit: 10,
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it('should delete a message', async () => {
    const created = await caller.messages.create({
      content: 'Delete me',
      familyId: 'test-family',
    });

    const result = await caller.messages.delete({ id: created.id });

    expect(result.success).toBe(true);
  });
});
```

### Testing API Flows

```typescript
// test/flows/messaging.integration.test.ts
describe('Messaging Flow', () => {
  it('should create and fetch a message', async () => {
    // 1. User creates a message
    const message = await createMessage({
      content: 'Hello family!',
      familyId: 'family-1',
    });

    expect(message.id).toBeDefined();

    // 2. User fetches messages
    const messages = await listMessages({ familyId: 'family-1' });

    expect(messages).toContainEqual(expect.objectContaining({
      id: message.id,
      content: 'Hello family!',
    }));

    // 3. User deletes message
    await deleteMessage({ id: message.id });

    // 4. Verify deletion
    const remaining = await listMessages({ familyId: 'family-1' });
    expect(remaining.find(m => m.id === message.id)).toBeUndefined();
  });
});
```

---

## Phase 3: E2E Testing (Future)

### Recommended Tools
- **Playwright** or **Cypress** for E2E tests
- **Puppeteer** for screenshot testing

### Test Scenarios to Cover

#### Authentication Flow
```
1. User visits login page
2. User enters invalid credentials
3. User sees error message
4. User enters valid credentials
5. User is redirected to dashboard
6. User sees family data loaded
```

#### Messaging Flow
```
1. User navigates to Messages
2. User clicks "Create Post"
3. User types message and uploads image
4. User clicks Post
5. Message appears in feed
6. Another user sees message in real-time
7. User reacts with emoji
8. Reaction appears to other user
```

#### Video Call Flow
```
1. User navigates to Video Calls
2. User clicks "Start New Call"
3. User selects participants
4. User joins call
5. Video/audio appear
6. User mutes/unmutes
7. User ends call
```

---

## Phase 4: Performance Testing

### Lighthouse Audits
```bash
# Run Lighthouse CLI
npm install -g @lhci/cli@latest @lhci/server@latest

# Create lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000"],
      "numberOfRuns": 3
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}

lhci autorun
```

### Load Testing with k6
```javascript
// load-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  let response = http.get('http://localhost:3000/api/messages');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
```

---

## Phase 5: Accessibility Testing

### Manual Testing Checklist
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus indicators visible
- [ ] Color contrast >= 4.5:1 for text
- [ ] Images have alt text
- [ ] Form labels associated with inputs
- [ ] Error messages clear and helpful
- [ ] Screen reader compatible (NVDA, JAWS, VoiceOver)

### Automated Accessibility Testing
```bash
npm install --save-dev @axe-core/react axe-core

# In test files:
import { axe, toHaveNoViolations } from 'jest-axe';

test('should not have accessibility violations', async () => {
  const { container } = render(<Button>Click me</Button>);
  const results = await axe(container);
  
  expect(results).toHaveNoViolations();
});
```

---

## Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test
      
      - name: Run typecheck
        run: npm run typecheck
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Test Coverage Goals

| Area | Target |
|------|--------|
| Overall | 70%+ |
| Critical paths | 90%+ |
| Utilities | 85%+ |
| Components | 60%+ |

---

## Test Naming Conventions

```typescript
// ✅ Good
describe('MessageBoard', () => {
  describe('when creating a post', () => {
    it('should add post to the list', () => {});
    it('should show success toast', () => {});
    it('should clear form fields', () => {});
  });
});

// ❌ Bad
describe('MessageBoard', () => {
  it('test1', () => {});
  it('does stuff', () => {});
});
```

---

## Debugging Tests

```bash
# Run single test file
npm run test app/utils/helpers.test.ts

# Run tests matching pattern
npm run test -- --grep "message"

# Debug mode (opens inspector)
node --inspect-brk ./node_modules/vitest/vitest.mjs

# Watch specific file
npm run test:watch app/components/Button.test.tsx
```

---

## Resources
- [Vitest Docs](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [Playwright](https://playwright.dev)
- [Web Accessibility](https://www.w3.org/WAI/WCAG21/quickref/)
