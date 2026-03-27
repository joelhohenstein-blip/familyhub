# Security Audit Report - FamilyHub

**Date:** 2025
**Status:** ⚠️ CRITICAL GAPS IDENTIFIED

---

## Executive Summary

The FamilyHub application has **basic error handling** but is **missing critical security implementations**. The following report details findings and provides optimization recommendations.

---

## 1. Current Security Implementation Status

### ✅ What's Implemented

| Component | Status | Details |
|-----------|--------|----------|
| **Error Handling** | ✅ | Process-level handlers for unhandledRejection and uncaughtException |
| **WebSocket Server** | ✅ | Singleton pattern prevents multiple instances during hot reloads |
| **Streaming Rendering** | ✅ | Server-side rendering with proper abort timeout (15s) |
| **Bot Detection** | ✅ | isbot library differentiates bot vs browser requests |

### ❌ Critical Gaps

| Component | Status | Impact | Priority |
|-----------|--------|--------|----------|
| **Content-Security-Policy (CSP)** | ❌ | XSS attacks, script injection | 🔴 CRITICAL |
| **Security Headers** | ❌ | Clickjacking, MIME sniffing, XSS | 🔴 CRITICAL |
| **CORS Configuration** | ❌ | Cross-origin attacks | 🔴 CRITICAL |
| **Rate Limiting** | ❌ | DDoS, brute force attacks | 🔴 CRITICAL |
| **HSTS** | ❌ | Man-in-the-middle attacks | 🟠 HIGH |
| **Input Validation** | ⚠️ | Partial (tRPC validation only) | 🟠 HIGH |
| **CSRF Protection** | ⚠️ | Implicit via SameSite cookies | 🟡 MEDIUM |

---

## 2. Detailed Findings

### 2.1 entry.server.tsx Analysis

**Current State:**
```typescript
// ✅ Good: Error handling prevents crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Rejection:', reason);
});

// ❌ Missing: No security headers set
// ❌ Missing: No CSP configuration
// ❌ Missing: No rate limiting middleware
```

**Issues:**
- Response headers are set but no security headers are added
- No Content-Security-Policy enforcement
- No X-Frame-Options, X-Content-Type-Options, etc.
- WebSocket proxy in vite.config has no authentication

### 2.2 root.tsx Analysis

**Current State:**
```typescript
// ✅ Good: Proper meta tags for viewport
<meta name="viewport" content="width=device-width,initial-scale=1" />

// ❌ Missing: No CSP meta tag
// ❌ Missing: No security-related meta tags
// ❌ Missing: No referrer policy
```

**Issues:**
- No CSP meta tag for inline scripts
- No referrer policy defined
- No X-UA-Compatible for IE compatibility (if needed)
- Sentry initialization has no error boundary for initialization failures

### 2.3 vite.config.ts Analysis

**Current State:**
```typescript
// ✅ Good: Proper host binding
server: {
  host: '0.0.0.0',
  port: 3000,
  allowedHosts: true,
  // ❌ Missing: No CORS configuration
  // ❌ Missing: No security headers
}
```

**Issues:**
- WebSocket proxy at `/api/ws` has no authentication
- No CORS headers configured
- No rate limiting middleware
- `allowedHosts: true` is permissive (acceptable for dev, not production)

---

## 3. Security Recommendations

### 3.1 Implement Security Headers (CRITICAL)

**Create:** `app/middleware/security.server.ts`

```typescript
export function getSecurityHeaders(): Record<string, string> {
  return {
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // Prevent MIME sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Enable XSS protection
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy (formerly Feature-Policy)
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    
    // HSTS (enable after HTTPS is confirmed)
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  };
}
```

**Apply in entry.server.tsx:**
```typescript
import { getSecurityHeaders } from '~/middleware/security.server';

function handleBotRequest(...) {
  // ... existing code ...
  const securityHeaders = getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    responseHeaders.set(key, value);
  });
}
```

### 3.2 Implement Content-Security-Policy (CRITICAL)

**Add to root.tsx:**
```typescript
export const meta: MetaFunction = () => [
  {
    httpEquiv: 'Content-Security-Policy',
    content: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];
```

### 3.3 Implement CORS Configuration (CRITICAL)

**Create:** `app/middleware/cors.server.ts`

```typescript
export function getCORSHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.VITE_APP_URL || 'https://familyhub.app',
  ];

  const isAllowed = origin && allowedOrigins.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}
```

### 3.4 Implement Rate Limiting (CRITICAL)

**Create:** `app/middleware/rateLimit.server.ts`

```typescript
interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const entry = store[identifier];

  if (!entry || now > entry.resetTime) {
    store[identifier] = { count: 1, resetTime: now + windowMs };
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

export function getRateLimitHeaders(identifier: string): Record<string, string> {
  const entry = store[identifier];
  if (!entry) return {};

  return {
    'RateLimit-Limit': '100',
    'RateLimit-Remaining': String(Math.max(0, 100 - entry.count)),
    'RateLimit-Reset': String(entry.resetTime),
  };
}
```

### 3.5 Update vite.config.ts for Production

```typescript
server: {
  host: '0.0.0.0',
  port: 3000,
  allowedHosts: process.env.NODE_ENV === 'production' 
    ? ['familyhub.app', 'www.familyhub.app']
    : true,
  proxy: {
    '/api/ws': {
      target: 'ws://localhost:3002',
      ws: true,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/ws/, '/'),
      // Add authentication header
      onProxyReq: (proxyReq, req) => {
        const token = req.headers.authorization;
        if (token) {
          proxyReq.setHeader('Authorization', token);
        }
      },
    }
  }
}
```

---

## 4. Implementation Checklist

- [ ] Create `app/middleware/security.server.ts` with security headers
- [ ] Create `app/middleware/cors.server.ts` with CORS configuration
- [ ] Create `app/middleware/rateLimit.server.ts` with rate limiting
- [ ] Update `app/entry.server.tsx` to apply security headers
- [ ] Update `app/root.tsx` to add CSP meta tag
- [ ] Update `vite.config.ts` for production CORS allowlist
- [ ] Add environment variables for allowed origins
- [ ] Test security headers with curl: `curl -i http://localhost:3000`
- [ ] Run security audit tools (e.g., npm audit, snyk)
- [ ] Document security policies in SECURITY.md

---

## 5. Testing Security Headers

```bash
# Check security headers
curl -i http://localhost:3000 | grep -E 'X-|Content-Security|Strict-Transport'

# Expected output:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: strict-origin-when-cross-origin
# Permissions-Policy: geolocation=(), microphone=(), camera=()
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## 6. Environment Variables Required

```env
# .env
VITE_APP_URL=https://familyhub.app
VITE_ALLOWED_ORIGINS=https://familyhub.app,https://www.familyhub.app
VITE_RATE_LIMIT_WINDOW_MS=60000
VITE_RATE_LIMIT_MAX_REQUESTS=100
```

---

## 7. Next Steps

1. **Immediate (This Sprint):**
   - Implement security headers middleware
   - Add CSP meta tag to root.tsx
   - Configure CORS for API endpoints

2. **Short-term (Next Sprint):**
   - Implement rate limiting
   - Add input validation middleware
   - Enable HSTS in production

3. **Ongoing:**
   - Regular security audits
   - Dependency vulnerability scanning
   - Penetration testing before launch

---

## 8. References

- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [MDN: Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [React Router Security](https://reactrouter.com/start/framework/security)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Report Generated:** 2025
**Audit Scope:** entry.server.tsx, root.tsx, vite.config.ts
**Status:** Ready for Implementation
