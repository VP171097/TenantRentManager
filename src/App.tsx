import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { TenantLayout } from './layouts/TenantLayout'
import { ProtectedRoute } from './layouts/ProtectedRoute'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { PropertiesPage } from './pages/PropertiesPage'
import { PropertyDetailPage } from './pages/PropertyDetailPage'
import { RoomsPage } from './pages/RoomsPage'
import { RoomDetailPage } from './pages/RoomDetailPage'
import { TenantsPage } from './pages/TenantsPage'
import { TenantDetailPage } from './pages/TenantDetailPage'
import { BillingPage } from './pages/BillingPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { ElectricityPage } from './pages/ElectricityPage'
import { LedgerPage } from './pages/LedgerPage'
import { ReceiptsPage } from './pages/ReceiptsPage'
import { ReportsPage } from './pages/ReportsPage'
import { ManagersPage } from './pages/ManagersPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProfilePage } from './pages/ProfilePage'
import { TenantDashboardPage } from './pages/tenant/TenantDashboardPage'
import { TenantLedgerPage } from './pages/tenant/TenantLedgerPage'
import { TenantReceiptsPage } from './pages/tenant/TenantReceiptsPage'

function RootRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={profile?.role === 'tenant' ? '/tenant/dashboard' : '/dashboard'} replace />
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />

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
          <Route path="/electricity" element={<ElectricityPage />} />
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/receipts" element={<ReceiptsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
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
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
