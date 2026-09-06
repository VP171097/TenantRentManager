import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { TenantLayout } from './layouts/TenantLayout'
import { ProtectedRoute } from './layouts/ProtectedRoute'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { JoinPage } from './pages/JoinPage'
import { DashboardPage } from './pages/DashboardPage'
import { PropertiesPage } from './pages/PropertiesPage'
import { PropertyDetailPage } from './pages/PropertyDetailPage'
import { RoomsPage } from './pages/RoomsPage'
import { RoomDetailPage } from './pages/RoomDetailPage'
import { TenantsPage } from './pages/TenantsPage'
import { TenantDetailPage } from './pages/TenantDetailPage'
import { BillingPage } from './pages/BillingPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { LedgerPage } from './pages/LedgerPage'
import { ReceiptsPage } from './pages/ReceiptsPage'
import { ReportsPage } from './pages/ReportsPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { MaintenancePage } from './pages/MaintenancePage'
import { ManagersPage } from './pages/ManagersPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProfilePage } from './pages/ProfilePage'
import { TenantDashboardPage } from './pages/tenant/TenantDashboardPage'
import { TenantLedgerPage } from './pages/tenant/TenantLedgerPage'
import { TenantReceiptsPage } from './pages/tenant/TenantReceiptsPage'
import { TenantProfilePage } from './pages/tenant/TenantProfilePage'

function RootRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={profile?.role === 'tenant' ? '/tenant/dashboard' : '/dashboard'} replace />
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
  const { passwordRecovery } = useAuth()
  const looksLikeAuthCallback = /access_token|type=recovery/.test(window.location.hash)
  if (looksLikeAuthCallback && !passwordRecovery) return null
  return <Navigate to="/" replace />
}

export default function App() {
  return (
    <HashRouter>
      <RecoveryWatcher />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
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
    </HashRouter>
  )
}
