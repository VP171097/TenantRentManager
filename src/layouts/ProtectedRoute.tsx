import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LoadingState } from '../components/States'
import type { Role } from '../types/database'

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <LoadingState label="Checking your session…" />
  if (!session) return <Navigate to="/login" replace />
  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to={profile.role === 'tenant' ? '/tenant/dashboard' : '/dashboard'} replace />
  }
  return <>{children}</>
}
