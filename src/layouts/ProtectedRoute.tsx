import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LoadingState } from '../components/States'
import type { Role } from '../types/database'

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { session, profile, loading, profileError, signOut } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingState label="Checking your session…" />
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (profileError || !profile) return <main className="landing-shell py-20"><h1 data-testid="profile-error-title" className="text-3xl">We couldn't load your account.</h1><p data-testid="profile-error-description" className="my-5">{profileError ?? 'Please sign in again to load your profile.'}</p><button data-testid="profile-error-signout" className="btn-primary" onClick={() => void signOut()}>Sign out and try again</button></main>
  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to={profile.role === 'tenant' ? '/tenant/dashboard' : '/dashboard'} replace />
  }
  return <>{children}</>
}
