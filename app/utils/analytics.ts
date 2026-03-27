/**
 * Analytics Utility Module
 * Handles Google Analytics 4, Mixpanel, and Sentry integration
 */

import mixpanel from 'mixpanel-browser';

// Google Analytics 4 Configuration
const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID || '';

// Mixpanel Configuration
const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN || '';

// Sentry Configuration (handled in root.tsx)
export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';
export const SENTRY_ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development';
export const SENTRY_TRACE_SAMPLE_RATE = parseFloat(import.meta.env.VITE_SENTRY_TRACE_SAMPLE_RATE || '0.1');

/**
 * Initialize Google Analytics 4
 * Loads the GA4 script and initializes tracking
 */
export function initializeGA4() {
  if (!GA4_MEASUREMENT_ID) {
    console.warn('[Analytics] GA4_MEASUREMENT_ID not configured');
    return;
  }

  if (typeof window === 'undefined') return;

  // Load GA4 script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(arguments);
  }
  gtag('js', new Date());
  gtag('config', GA4_MEASUREMENT_ID, {
    page_path: window.location.pathname,
    anonymize_ip: true,
  });

  (window as any).gtag = gtag;
}

/**
 * Initialize Mixpanel
 * Sets up Mixpanel for user behavior tracking
 */
export function initializeMixpanel() {
  if (!MIXPANEL_TOKEN) {
    console.warn('[Analytics] MIXPANEL_TOKEN not configured');
    return;
  }

  if (typeof window === 'undefined') return;

  mixpanel.init(MIXPANEL_TOKEN, {
    debug: import.meta.env.DEV,
    track_pageview: true,
    persistence: 'localStorage',
  });
}

/**
 * Track a page view in Google Analytics 4
 */
export function trackPageView(pagePath: string, pageTitle?: string) {
  if (typeof window === 'undefined') return;

  const gtag = (window as any).gtag;
  if (gtag) {
    gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle || document.title,
    });
  }
}

/**
 * Track a custom event in Google Analytics 4
 */
export function trackGA4Event(eventName: string, eventData?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  const gtag = (window as any).gtag;
  if (gtag) {
    gtag('event', eventName, eventData || {});
  }
}

/**
 * Track a custom event in Mixpanel
 */
export function trackMixpanelEvent(eventName: string, eventData?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  try {
    mixpanel.track(eventName, eventData || {});
  } catch (error) {
    console.error('[Mixpanel] Error tracking event:', error);
  }
}

/**
 * Track an event in both GA4 and Mixpanel
 */
export function trackEvent(eventName: string, eventData?: Record<string, any>) {
  trackGA4Event(eventName, eventData);
  trackMixpanelEvent(eventName, eventData);
}

/**
 * Set user properties in Mixpanel
 */
export function setMixpanelUser(userId: string, userProperties?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  try {
    mixpanel.identify(userId);
    if (userProperties) {
      mixpanel.people.set(userProperties);
    }
  } catch (error) {
    console.error('[Mixpanel] Error setting user:', error);
  }
}

/**
 * Set user ID in Google Analytics 4
 */
export function setGA4UserId(userId: string) {
  if (typeof window === 'undefined') return;

  const gtag = (window as any).gtag;
  if (gtag) {
    gtag('config', GA4_MEASUREMENT_ID, {
      user_id: userId,
    });
  }
}

/**
 * Set user in both GA4 and Mixpanel
 */
export function setAnalyticsUser(userId: string, userProperties?: Record<string, any>) {
  setGA4UserId(userId);
  setMixpanelUser(userId, userProperties);
}

/**
 * Track a conversion event (e.g., signup, purchase)
 */
export function trackConversion(conversionType: string, conversionData?: Record<string, any>) {
  const eventData = {
    conversion_type: conversionType,
    timestamp: new Date().toISOString(),
    ...conversionData,
  };

  trackGA4Event('conversion', eventData);
  trackMixpanelEvent(`conversion_${conversionType}`, eventData);
}

/**
 * Track user engagement metrics
 */
export function trackEngagement(metric: string, value: number) {
  const eventData = {
    metric,
    value,
    timestamp: new Date().toISOString(),
  };

  trackGA4Event('engagement', eventData);
  trackMixpanelEvent('engagement', eventData);
}

/**
 * Track error events (also sent to Sentry)
 */
export function trackError(errorName: string, errorDetails?: Record<string, any>) {
  const eventData = {
    error_name: errorName,
    timestamp: new Date().toISOString(),
    ...errorDetails,
  };

  trackGA4Event('error', eventData);
  trackMixpanelEvent('error', eventData);
}

/**
 * Reset analytics when user logs out
 */
export function resetAnalytics() {
  if (typeof window === 'undefined') return;

  try {
    mixpanel.reset();
  } catch (error) {
    console.error('[Mixpanel] Error resetting:', error);
  }
}

// Type augmentation for window object
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}
