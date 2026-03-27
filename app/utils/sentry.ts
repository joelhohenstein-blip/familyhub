/**
 * Sentry Error Tracking Configuration
 * Initializes Sentry for error monitoring and performance tracking
 */

import * as Sentry from '@sentry/react';

export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';
export const SENTRY_ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development';
export const SENTRY_TRACE_SAMPLE_RATE = parseFloat(import.meta.env.VITE_SENTRY_TRACE_SAMPLE_RATE || '0.1');

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initializeSentry() {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] SENTRY_DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    // Performance Monitoring
    tracesSampleRate: SENTRY_TRACE_SAMPLE_RATE,
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random plugins/extensions
      'chrome-extension://',
      'moz-extension://',
      // Network errors that are expected
      'NetworkError',
      'Network request failed',
      // User cancelled
      'AbortError',
    ],
  });
}

/**
 * Set user context in Sentry
 */
export function setSentryUser(userId: string, userContext?: Record<string, any>) {
  Sentry.setUser({
    id: userId,
    ...userContext,
  });
}

/**
 * Clear user context in Sentry
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Capture an exception in Sentry
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    contexts: context ? { custom: context } : undefined,
  });
}

/**
 * Capture a message in Sentry
 */
export function captureMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, any>, level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info') {
  Sentry.addBreadcrumb({
    message,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(name: string, op: string = 'http.request') {
  // Transaction tracking is handled automatically by Sentry
  // This is a placeholder for manual transaction tracking if needed
  Sentry.captureMessage(`Transaction: ${name}`, 'info');
}

export default Sentry;
