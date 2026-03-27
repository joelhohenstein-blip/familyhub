import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

export function initSentryClient() {
  if (typeof window === "undefined") return;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.warn("Sentry DSN not configured. Error tracking disabled.");
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.MODE === "production" ? 0.1 : 1.0,
    integrations: [
      new BrowserTracing() as any,
    ],
    beforeSend(event) {
      // Filter out certain errors
      if (event.exception) {
        const error = event.exception.values?.[0]?.value || "";
        if (error.includes("ResizeObserver loop limit exceeded")) {
          return null;
        }
      }
      return event;
    },
  });
}

export { Sentry };
