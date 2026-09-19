import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './hooks/useAuth.tsx'
import { applyTheme } from './hooks/useTheme'
import { migrateLegacyRoute } from './utils/routes'
import { initSentry } from './utils/sentry'
import { AppErrorBoundary } from './components/AppErrorBoundary'

initSentry()
migrateLegacyRoute()

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

// Apply the persisted/system theme before first paint to avoid a light->dark flash.
try {
  const stored = localStorage.getItem('rrm-theme')
  applyTheme(stored === 'light' || stored === 'dark' ? stored : 'system')
} catch {
  applyTheme('system')
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Offline shell is a nice-to-have — a registration failure shouldn't block the app.
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>
)

// Hide the static HTML splash screen once React has taken over — a fade-out
// avoids a jarring cut from splash to blank-white while data loads.
const splash = document.getElementById('app-splash')
if (splash) {
  requestAnimationFrame(() => {
    splash.classList.add('app-splash-hidden')
    setTimeout(() => splash.remove(), 300)
  })
}
