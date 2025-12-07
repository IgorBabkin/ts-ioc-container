import * as Sentry from "@sentry/astro";

Sentry.init({
  dsn: "", // Leave empty for local development only
  // Add additional server-side configuration here
  integrations: [],
  // Performance monitoring
  tracesSampleRate: 1.0,
});
