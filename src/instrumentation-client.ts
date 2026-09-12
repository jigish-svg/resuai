import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: 0.1,
  // Session Replay is intentionally left off — this app displays resume
  // and job-search content on screen, and replay could capture that.
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
