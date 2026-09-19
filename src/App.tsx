import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Link, Route, Routes, useNavigate } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { RouteMetadata } from './components/RouteMetadata'
import { AppLayout } from './layouts/AppLayout'
import { TenantLayout } from './layouts/TenantLayout'
import { ProtectedRoute } from './layouts/ProtectedRoute'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'

// Route-level code splitting: everything except the landing page (the
// default first-paint route) and the login page (the near-certain next
// click) loads on demand instead of bloating the initial bundle — the
// owner dashboard, tenant portal, and PDF-heavy pages are large and most
// visitors only ever need a fraction of them in a given session.
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const ServicesPage = lazy(() => import('./pages/ServicesPage').then((m) => ({ default: m.ServicesPage })))
const BlogPage = lazy(() => import('./pages/BlogPage').then((m) => ({ default: m.BlogPage })))
const BlogPostPage = lazy(() => import('./pages/BlogPostPage').then((m) => ({ default: m.BlogPostPage })))
const ContactPage = lazy(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })))
const TermsPage = lazy(() => import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })))
const SitemapPage = lazy(() => import('./pages/SitemapPage').then((m) => ({ default: m.SitemapPage })))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))
const JoinPage = lazy(() => import('./pages/JoinPage').then((m) => ({ default: m.JoinPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const PropertiesPage = lazy(() => import('./pages/PropertiesPage').then((m) => ({ default: m.PropertiesPage })))
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage').then((m) => ({ default: m.PropertyDetailPage })))
const RoomsPage = lazy(() => import('./pages/RoomsPage').then((m) => ({ default: m.RoomsPage })))
const RoomDetailPage = lazy(() => import('./pages/RoomDetailPage').then((m) => ({ default: m.RoomDetailPage })))
const TenantsPage = lazy(() => import('./pages/TenantsPage').then((m) => ({ default: m.TenantsPage })))
const TenantDetailPage = lazy(() => import('./pages/TenantDetailPage').then((m) => ({ default: m.TenantDetailPage })))
const BillingPage = lazy(() => import('./pages/BillingPage').then((m) => ({ default: m.BillingPage })))
const PaymentsPage = lazy(() => import('./pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })))
const LedgerPage = lazy(() => import('./pages/LedgerPage').then((m) => ({ default: m.LedgerPage })))
const ReceiptsPage = lazy(() => import('./pages/ReceiptsPage').then((m) => ({ default: m.ReceiptsPage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const ExpensesPage = lazy(() => import('./pages/ExpensesPage').then((m) => ({ default: m.ExpensesPage })))
const MaintenancePage = lazy(() => import('./pages/MaintenancePage').then((m) => ({ default: m.MaintenancePage })))
const ManagersPage = lazy(() => import('./pages/ManagersPage').then((m) => ({ default: m.ManagersPage })))
const AuditPage = lazy(() => import('./pages/AuditPage').then((m) => ({ default: m.AuditPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const TenantDashboardPage = lazy(() => import('./pages/tenant/TenantDashboardPage').then((m) => ({ default: m.TenantDashboardPage })))
const TenantLedgerPage = lazy(() => import('./pages/tenant/TenantLedgerPage').then((m) => ({ default: m.TenantLedgerPage })))
const TenantReceiptsPage = lazy(() => import('./pages/tenant/TenantReceiptsPage').then((m) => ({ default: m.TenantReceiptsPage })))
const TenantProfilePage = lazy(() => import('./pages/tenant/TenantProfilePage').then((m) => ({ default: m.TenantProfilePage })))

/** Full-page loading state shown by <Suspense> while a lazy-loaded route
 * chunk downloads — brief on a normal connection, but real on a slow one. */
function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600 dark:border-slate-700 dark:border-t-brand-400" />
    </div>
  )
}

/** Redirects to /reset-password the moment Supabase detects a password-
 * recovery link, regardless of which route the browser happened to land
 * on when the link was clicked. */
function RecoveryWatcher() {
  const { passwordRecovery } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    if (passwordRecovery) navigate('/reset-password')
  }, [passwordRecovery, navigate])
  return null
}

/** Supabase's auth redirect appends recovery tokens as a URL hash
 * (`#access_token=...&type=recovery`), which HashRouter would otherwise
 * immediately try (and fail) to match as a route and bounce to "/" before
 * the auth client has a chance to parse and consume those tokens. If the
 * hash looks like an in-flight auth callback, wait instead of redirecting
 * away — RecoveryWatcher takes over once Supabase finishes and fires the
 * PASSWORD_RECOVERY event. */
function CatchAll() {
  return <main className="landing-shell py-24"><p data-testid="not-found-code" className="eyebrow text-brand-700">404 · A little off track</p><h1 data-testid="not-found-title" className="mt-4 text-4xl">This page isn't here.</h1><p data-testid="not-found-description" className="my-6 text-slate-600 dark:text-slate-300">Your records are safe. Head back to RentSlate to find what you need.</p><Link data-testid="not-found-home" className="btn-primary" to="/">Back to RentSlate</Link></main>
}

export default function App() {
  const basename =
    import.meta.env.BASE_URL === './'
      ? undefined
      : import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

  return (
    <BrowserRouter basename={basename}>
      <RouteMetadata />
      <RecoveryWatcher />
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/sitemap" element={<SitemapPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/join" element={<JoinPage />} />

        <Route
          element={
            <ProtectedRoute roles={['owner', 'manager']}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="/properties/:id" element={<PropertyDetailPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/rooms/:id" element={<RoomDetailPage />} />
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/tenants/:id" element={<TenantDetailPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/billing/:id" element={<BillingPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/receipts" element={<ReceiptsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/managers" element={<ManagersPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute roles={['tenant']}>
              <TenantLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/tenant/dashboard" element={<TenantDashboardPage />} />
          <Route path="/tenant/ledger" element={<TenantLedgerPage />} />
          <Route path="/tenant/receipts" element={<TenantReceiptsPage />} />
          <Route path="/tenant/profile" element={<TenantProfilePage />} />
        </Route>

        <Route path="*" element={<CatchAll />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
