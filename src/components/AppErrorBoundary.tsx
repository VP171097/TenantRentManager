import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Sentry } from '../utils/sentry'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/** Catches any uncaught render error anywhere below it — without this,
 * React 19 unmounts the whole tree on an uncaught error, leaving a blank
 * white screen with no feedback and nothing logged anywhere. Reports to
 * Sentry when configured (see utils/sentry.ts); always shows a friendly
 * recovery screen either way. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-6">
        <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 py-14 text-center px-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
            <AlertCircle size={24} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-red-700 dark:text-red-400">Something went wrong.</p>
            <p className="mt-1 text-sm text-red-500 dark:text-red-500">
              Your data is safe — this only affected this page. Reloading usually fixes it.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition active:scale-95"
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
