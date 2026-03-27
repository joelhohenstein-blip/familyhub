import * as Sentry from "@sentry/node";

export function initSentryServer() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn("Sentry DSN not configured. Error tracking disabled.");
    return;
  }

  const integrations: any[] = [];
  
  // Try to add profiling integration if available
  try {
    const { nodeProfilingIntegration } = require("@sentry/profiling-node");
    integrations.push(nodeProfilingIntegration());
  } catch (e) {
    // Profiling integration not available
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    integrations: [
      ...integrations,
      new (Sentry as any).Integrations.Http({ tracing: true }),
    ],
    beforeSend(event) {
      // Filter out certain errors
      if (event.exception) {
        const error = event.exception.values?.[0]?.value || "";
        if (error.includes("ECONNREFUSED")) {
          return null;
        }
      }
      return event;
    },
  });
}

export { Sentry };
