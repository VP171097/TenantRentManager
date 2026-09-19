import * as Sentry from '@sentry/react'

/** Entirely inert until VITE_SENTRY_DSN is set (repo secret in the deploy
 * workflow, or a local .env for testing) — no signup required to run the
 * app, no behavior change for anyone who doesn't configure it. Free at
 * sentry.io's Developer plan: no credit card, 5,000 events/month. */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.PROD ? 'production' : 'development',
    // Keep this a pure error monitor, not a session/perf tracker — no
    // tracesSampleRate/replay integrations, so there's nothing extra to
    // explain in a privacy policy beyond "we log JS errors."
    integrations: [],
  })
}

export { Sentry }
