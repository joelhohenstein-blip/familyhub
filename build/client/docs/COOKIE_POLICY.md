# 🍪 FamilyHub Cookie Policy

**Effective Date:** February 28, 2026  
**Last Updated:** February 28, 2026

---

## Overview

FamilyHub uses cookies and similar tracking technologies to provide, secure, and improve our service. This policy explains what cookies we use, why we use them, and how you can control them.

---

## What Are Cookies?

Cookies are small text files stored on your device (computer, tablet, or mobile phone) when you visit our website or use our application. They help us remember information about your visit and improve your experience.

---

## Cookies We Use

### 1. **Authentication & Session Cookies** (Essential)

**Purpose:** Maintain your login session and secure access to your family's data

**Provider:** Clerk Authentication  
**Type:** HTTPOnly, Secure, SameSite  
**Duration:** Session-based (expires when you log out or close browser)  
**Cookies:**
- `__clerk_db_jwt` - Clerk JWT authentication token
- `__clerk_client_uat` - Clerk user authentication timestamp
- `__session` - Session management cookie

**Why:** These cookies are **essential** for the app to work. Without them, you wouldn't be able to log in or access your family's private data.

**Can you disable them?** No. These are required for authentication and security. If you disable them, you won't be able to use FamilyHub.

---

### 2. **Language Preference Cookies** (Functional)

**Purpose:** Remember your language preference (English, Spanish, or French)

**Type:** localStorage (not a traditional cookie, but similar)  
**Duration:** 1 year (or until you clear browser data)  
**Key:** `language`  
**Values:** `en`, `es`, `fr`

**Why:** We detect your browser's language on first visit, but store your preference so we don't re-detect on every page load.

**Can you disable it?** Yes. If you disable this, we'll detect your browser language on each visit.

---

### 3. **Performance & Analytics Cookies** (Optional)

**Purpose:** Understand how users interact with FamilyHub to improve performance and user experience

**Providers:**
- Sentry (error tracking)
- Vercel Analytics (performance monitoring)

**Type:** Tracking cookies  
**Duration:** 30-90 days  
**Data Collected:**
- Page load times
- Error messages and stack traces
- Browser type and version
- Device type (mobile/desktop)
- General location (country/region, not precise)

**Why:** We use this data to:
- Fix bugs and improve stability
- Optimize performance
- Understand which features are most used
- Detect and prevent security issues

**Can you disable it?** Yes. You can opt out of analytics in your browser settings or contact us.

---

### 4. **Third-Party Service Cookies** (Functional)

**Purpose:** Enable features like video calls, real-time messaging, and payments

**Providers:**
- **Jitsi Meet** (video calls) - Sets cookies for call sessions
- **Pusher** (real-time messaging) - Sets cookies for WebSocket connections
- **Stripe** (payments) - Sets cookies for payment processing
- **Google** (OAuth login) - Sets cookies if you use Google login
- **GitHub** (OAuth login) - Sets cookies if you use GitHub login

**Type:** Third-party cookies  
**Duration:** Varies by provider (typically session-based or 30-90 days)

**Why:** These services require cookies to function properly.

**Can you disable them?** Partially. You can disable third-party cookies in your browser settings, but this may break features like video calls and payments.

---

## Cookie Consent & Control

### Browser Settings

You can control cookies through your browser settings:

**Chrome:**
1. Click ⋮ (menu) → Settings
2. Go to Privacy and security → Cookies and other site data
3. Choose your preference:
   - Allow all cookies
   - Block third-party cookies
   - Block all cookies

**Firefox:**
1. Click ☰ (menu) → Settings
2. Go to Privacy & Security → Cookies and Site Data
3. Choose your preference

**Safari:**
1. Click Safari → Settings
2. Go to Privacy tab
3. Manage website data

**Edge:**
1. Click ⋯ (menu) → Settings
2. Go to Privacy, search, and services → Cookies and other site data
3. Choose your preference

### Disabling Cookies

**⚠️ Warning:** Disabling essential cookies will prevent FamilyHub from working properly. You won't be able to:
- Log in to your account
- Access your family's data
- Use real-time features (messaging, video calls)
- Make payments

We recommend only disabling non-essential cookies (analytics, third-party tracking).

---

## Cookie Categories

| Category | Essential? | Can Disable? | Examples |
|----------|-----------|-------------|----------|
| **Authentication** | ✅ Yes | ❌ No | Clerk JWT, session tokens |
| **Functional** | ✅ Yes | ⚠️ Partial | Language preference, UI state |
| **Performance** | ❌ No | ✅ Yes | Sentry, Vercel Analytics |
| **Third-Party** | ⚠️ Partial | ✅ Yes | Jitsi, Pusher, Stripe, OAuth |

---

## Data Privacy

### What We Don't Do

- ❌ We do NOT sell your data to advertisers
- ❌ We do NOT use cookies for targeted advertising
- ❌ We do NOT track you across other websites
- ❌ We do NOT share your family data with third parties (except as needed for service providers)

### What We Do

- ✅ We use cookies only to provide and improve FamilyHub
- ✅ We encrypt all data in transit (HTTPS/TLS)
- ✅ We follow GDPR, CCPA, and other privacy regulations
- ✅ We allow you to export or delete your data anytime

---

## Your Rights

### Access
You have the right to know what cookies we use and what data they collect.

### Control
You can control cookies through your browser settings or contact us to opt out.

### Delete
You can delete cookies anytime through your browser settings. You can also request we delete your account and all associated data.

### Portability
You can request a copy of your data in a portable format.

---

## Cookie Consent Banner

When you first visit FamilyHub, you'll see a cookie consent banner. You can:
- **Accept All** - Allow all cookies
- **Reject Non-Essential** - Allow only essential cookies
- **Customize** - Choose which categories to allow

Your preference is saved in a cookie so we don't show the banner again.

---

## Changes to This Policy

We may update this policy occasionally. We'll notify you of significant changes by:
- Posting the updated policy on this page
- Updating the "Last Updated" date
- Sending you an email (if required by law)

---

## Contact Us

**Questions about cookies?** Contact us:

- **Email:** privacy@familyhub.app
- **Mailing Address:** [Your Address]
- **Data Protection Officer:** dpo@familyhub.app

---

## Related Policies

- [Privacy Policy](./PRIVACY_POLICY.md)
- [Terms of Service](./TERMS_OF_SERVICE.md)
- [Data Processing Agreement](./DPA.md)

---

## Cookie Audit

**Last Audit:** February 28, 2026

| Cookie Name | Provider | Type | Duration | Purpose |
|------------|----------|------|----------|---------|
| `__clerk_db_jwt` | Clerk | Essential | Session | Authentication |
| `__clerk_client_uat` | Clerk | Essential | Session | Auth timestamp |
| `__session` | FamilyHub | Essential | Session | Session management |
| `language` | FamilyHub | Functional | 1 year | Language preference |
| `sentry_dsn` | Sentry | Analytics | 90 days | Error tracking |
| `_vercel_analytics` | Vercel | Analytics | 30 days | Performance monitoring |
| `jitsi_session` | Jitsi | Functional | Session | Video call session |
| `pusher_session` | Pusher | Functional | Session | Real-time messaging |
| `stripe_session` | Stripe | Functional | Session | Payment processing |

---

## Compliance

FamilyHub complies with:
- ✅ **GDPR** (General Data Protection Regulation)
- ✅ **CCPA** (California Consumer Privacy Act)
- ✅ **LGPD** (Lei Geral de Proteção de Dados)
- ✅ **ePrivacy Directive** (EU Cookie Law)
- ✅ **PIPEDA** (Personal Information Protection and Electronic Documents Act)

---

**Version:** 1.0.0  
**Status:** ✅ Active  
**Last Updated:** February 28, 2026

---

*By using FamilyHub, you acknowledge that you have read and understood this Cookie Policy.*
