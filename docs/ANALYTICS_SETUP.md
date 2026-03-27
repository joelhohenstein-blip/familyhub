# Analytics Setup Guide

This document provides a comprehensive guide to the analytics infrastructure set up for FamilyHub, including Google Analytics 4, Mixpanel, and Sentry error tracking.

## Table of Contents

1. [Overview](#overview)
2. [Google Analytics 4 Setup](#google-analytics-4-setup)
3. [Mixpanel Setup](#mixpanel-setup)
4. [Sentry Error Tracking Setup](#sentry-error-tracking-setup)
5. [Environment Variables](#environment-variables)
6. [Usage Guide](#usage-guide)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Overview

FamilyHub uses three complementary analytics tools:

- **Google Analytics 4 (GA4)**: Website traffic, user behavior, and conversion tracking
- **Mixpanel**: Advanced user behavior analytics and cohort analysis
- **Sentry**: Real-time error tracking, performance monitoring, and session replay

All three systems are initialized automatically when the app loads and work together to provide comprehensive insights into user behavior and application health.

## Google Analytics 4 Setup

### Getting Started

1. **Create a Google Analytics 4 Property**
   - Go to [Google Analytics](https://analytics.google.com)
   - Create a new property for your FamilyHub instance
   - Select "Web" as the platform
   - Complete the setup wizard

2. **Get Your Measurement ID**
   - In GA4, go to Admin → Property Settings
   - Copy your Measurement ID (format: `G-XXXXXXXXXX`)

3. **Configure Environment Variable**
   ```bash
   VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

### Features

- **Automatic Page View Tracking**: Every route change is tracked
- **Custom Events**: Track user interactions, conversions, and engagement
- **User ID Tracking**: Associate analytics with authenticated users
- **Real-time Reporting**: View live user activity in GA4 dashboard

### Key Events Tracked

- `page_view`: Automatic on route changes
- `signup`: User registration
- `login`: User authentication
- `donation`: Donation conversions
- `subscription`: Subscription purchases
- `engagement`: User engagement metrics
- `error`: Application errors

### Accessing Reports

1. Log in to [Google Analytics](https://analytics.google.com)
2. Select your FamilyHub property
3. View reports in the left sidebar:
   - **Real-time**: Live user activity
   - **Acquisition**: How users find your site
   - **Engagement**: User interactions and behavior
   - **Monetization**: Conversion tracking
   - **Retention**: User retention metrics

## Mixpanel Setup

### Getting Started

1. **Create a Mixpanel Account**
   - Go to [Mixpanel](https://mixpanel.com)
   - Sign up for a free account
   - Create a new project

2. **Get Your Project Token**
   - In Mixpanel, go to Project Settings
   - Copy your Project Token

3. **Configure Environment Variable**
   ```bash
   VITE_MIXPANEL_TOKEN=your_project_token_here
   ```

### Features

- **User Behavior Tracking**: Detailed user action tracking
- **Cohort Analysis**: Segment users by behavior patterns
- **Funnel Analysis**: Track conversion funnels
- **Retention Analysis**: Measure user retention
- **A/B Testing**: Built-in experimentation platform

### Key Events Tracked

- `page_view`: Page navigation
- `signup`: User registration with method
- `login`: User authentication with method
- `logout`: User session end
- `donation`: Donation with amount and currency
- `subscription`: Subscription with plan details
- `form_submit`: Form submissions
- `click`: User clicks on tracked elements
- `scroll`: Section scrolling
- `video_play`: Video engagement
- `download`: File downloads

### Accessing Reports

1. Log in to [Mixpanel](https://mixpanel.com)
2. Select your FamilyHub project
3. Use the following tools:
   - **Events**: View all tracked events
   - **Funnels**: Analyze conversion paths
   - **Retention**: Measure user retention
   - **Cohorts**: Segment users by behavior
   - **Insights**: Custom analytics queries

## Sentry Error Tracking Setup

### Getting Started

1. **Create a Sentry Account**
   - Go to [Sentry](https://sentry.io)
   - Sign up for a free account
   - Create a new project (select React)

2. **Get Your DSN**
   - In Sentry, go to Project Settings → Client Keys (DSN)
   - Copy your DSN (format: `https://key@sentry.io/project-id`)

3. **Configure Environment Variables**
   ```bash
   VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
   VITE_SENTRY_ENVIRONMENT=development
   VITE_SENTRY_TRACE_SAMPLE_RATE=0.1
   VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE=0.1
   VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE=1.0
   ```

### Features

- **Error Tracking**: Automatic error capture and reporting
- **Performance Monitoring**: Track slow transactions and bottlenecks
- **Session Replay**: Replay user sessions to understand errors
- **Breadcrumbs**: Track user actions leading to errors
- **Release Tracking**: Monitor errors across app versions
- **Source Maps**: View original source code in error reports

### Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_SENTRY_DSN` | Sentry project DSN | (required) |
| `VITE_SENTRY_ENVIRONMENT` | Environment name | `development` |
| `VITE_SENTRY_TRACE_SAMPLE_RATE` | Performance monitoring sample rate (0-1) | `0.1` |
| `VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE` | Session replay sample rate (0-1) | `0.1` |
| `VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE` | Replay capture on error (0-1) | `1.0` |

### Accessing Reports

1. Log in to [Sentry](https://sentry.io)
2. Select your FamilyHub project
3. View:
   - **Issues**: Grouped errors and their details
   - **Performance**: Transaction performance metrics
   - **Replays**: Session replays for errors
   - **Releases**: Error tracking by app version
   - **Alerts**: Configure error notifications

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Google Analytics 4
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX

# Mixpanel
VITE_MIXPANEL_TOKEN=your_mixpanel_token_here

# Sentry Error Tracking
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
VITE_SENTRY_ENVIRONMENT=development
VITE_SENTRY_TRACE_SAMPLE_RATE=0.1
VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE=0.1
VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE=1.0

# App Version (for Sentry release tracking)
VITE_APP_VERSION=1.0.0
```

**Note**: Never commit `.env.local` to version control. Use `.env.example` as a template.

## Usage Guide

### Automatic Tracking

Analytics are initialized automatically in `app/routes/root.tsx`:

```typescript
useEffect(() => {
  // Initialize analytics on mount (client-side only)
  if (typeof window !== 'undefined') {
    initializeSentry();
    initializeGA4();
    initializeMixpanel();
  }
}, []);
```

Page views are automatically tracked when routes change.

### Manual Event Tracking

#### Using the Analytics Utility

```typescript
import { trackEvent, trackConversion, trackError } from '~/utils/analytics';

// Track a custom event
trackEvent('button_click', {
  button_name: 'donate_now',
  section: 'hero',
});

// Track a conversion
trackConversion('donation', {
  amount: 50,
  currency: 'USD',
});

// Track an error
trackError('payment_failed', {
  error_code: 'PAYMENT_001',
  payment_method: 'stripe',
});
```

#### Using Custom Hooks

```typescript
import { useEventTracking, useConversionTracking, useAuthTracking } from '~/hooks/usePageTracking';

export function DonateButton() {
  const { trackClick } = useEventTracking();
  const { trackDonation } = useConversionTracking();

  const handleDonate = async (amount: number) => {
    trackClick('donate_button');
    
    try {
      const result = await processDonation(amount);
      trackDonation(amount, 'USD', {
        donation_type: 'one_time',
        success: true,
      });
    } catch (error) {
      trackDonation(amount, 'USD', {
        donation_type: 'one_time',
        success: false,
        error: error.message,
      });
    }
  };

  return <button onClick={() => handleDonate(50)}>Donate $50</button>;
}
```

#### Using Sentry Directly

```typescript
import * as Sentry from '@sentry/react';
import { captureException, addBreadcrumb } from '~/utils/sentry';

// Capture an exception
try {
  riskyOperation();
} catch (error) {
  captureException(error as Error, {
    operation: 'riskyOperation',
    userId: user.id,
  });
}

// Add breadcrumb for debugging
addBreadcrumb('User clicked donate button', {
  amount: 50,
  currency: 'USD',
}, 'info');
```

### Setting User Context

```typescript
import { setAnalyticsUser } from '~/utils/analytics';
import { setSentryUser } from '~/utils/sentry';

// After user login
const user = await authenticateUser();

setAnalyticsUser(user.id, {
  email: user.email,
  name: user.name,
  plan: user.plan,
});

setSentryUser(user.id, {
  email: user.email,
  username: user.name,
});
```

### Resetting Analytics

```typescript
import { resetAnalytics } from '~/utils/analytics';
import { clearSentryUser } from '~/utils/sentry';

// On user logout
resetAnalytics();
clearSentryUser();
```

## Best Practices

### 1. Event Naming Convention

Use snake_case for event names and properties:

```typescript
// ✅ Good
trackEvent('user_signup', {
  signup_method: 'email',
  referral_source: 'google',
});

// ❌ Avoid
trackEvent('userSignup', {
  signupMethod: 'email',
});
```

### 2. Consistent Property Names

Define a standard set of properties for similar events:

```typescript
// All conversion events should have these properties
trackConversion('donation', {
  amount: 50,
  currency: 'USD',
  payment_method: 'stripe',
  user_id: user.id,
  timestamp: new Date().toISOString(),
});
```

### 3. Privacy Considerations

- **PII**: Never track personally identifiable information (passwords, credit cards, SSNs)
- **Anonymization**: Use user IDs instead of email addresses when possible
- **GDPR Compliance**: Ensure users consent to analytics tracking
- **Data Retention**: Configure appropriate data retention policies in each platform

### 4. Performance

- **Batch Events**: Group related events together
- **Debounce**: Debounce high-frequency events (scroll, resize)
- **Lazy Load**: Analytics scripts are loaded asynchronously

### 5. Testing

Disable analytics in test environments:

```typescript
// In test files
vi.mock('~/utils/analytics', () => ({
  trackEvent: vi.fn(),
  trackConversion: vi.fn(),
}));
```

## Troubleshooting

### GA4 Not Tracking

1. **Check Measurement ID**: Verify `VITE_GA4_MEASUREMENT_ID` is set correctly
2. **Check Network**: Open DevTools → Network tab, search for "google-analytics"
3. **Check Console**: Look for any error messages in the browser console
4. **Real-time Report**: Check GA4 real-time report to see if events are arriving

### Mixpanel Not Tracking

1. **Check Token**: Verify `VITE_MIXPANEL_TOKEN` is set correctly
2. **Check Network**: Open DevTools → Network tab, search for "mixpanel"
3. **Check Console**: Look for Mixpanel errors in the browser console
4. **Debug Mode**: Set `debug: true` in Mixpanel initialization

### Sentry Not Capturing Errors

1. **Check DSN**: Verify `VITE_SENTRY_DSN` is set correctly
2. **Check Environment**: Verify `VITE_SENTRY_ENVIRONMENT` is set
3. **Check Network**: Open DevTools → Network tab, search for "sentry"
4. **Test Error**: Manually throw an error to test: `throw new Error('Test error')`

### High Data Usage

1. **Reduce Sample Rates**: Lower `VITE_SENTRY_TRACE_SAMPLE_RATE` and replay rates
2. **Filter Events**: Use Sentry's event filtering to exclude certain errors
3. **Review Events**: Check which events are generating the most data

### Privacy Concerns

1. **Review Data**: Check what data is being collected in each platform
2. **Update Consent**: Ensure users have consented to analytics
3. **Configure Retention**: Set appropriate data retention policies
4. **Anonymize Data**: Use user IDs instead of email addresses

## Additional Resources

- [Google Analytics 4 Documentation](https://support.google.com/analytics/answer/10089681)
- [Mixpanel Documentation](https://docs.mixpanel.com)
- [Sentry Documentation](https://docs.sentry.io)
- [React Router Documentation](https://reactrouter.com)

## Support

For issues or questions about analytics setup:

1. Check the troubleshooting section above
2. Review the official documentation for each platform
3. Check browser console for error messages
4. Contact the development team

---

**Last Updated**: 2024
**Version**: 1.0.0
