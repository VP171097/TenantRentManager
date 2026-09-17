import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'
import { useQueryClient } from '@tanstack/react-query'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  profileError: string | null
  /** True once Supabase detects a password-recovery link in the URL (the
   * user clicked "Forgot password" and opened the emailed link). The app
   * should route them to the reset-password screen while this is true. */
  passwordRecovery: boolean
  clearPasswordRecovery: () => void
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Module-scoped (not per-render) so a StrictMode double-invoke or repeated
// auth events for the same session don't fire this more than once per tab.
const phoneAttachAttempted = new Set<string>()

/** Owner signup keeps the real email-confirmation flow, but also collects
 * a phone number (carried as metadata, not yet a real Auth identifier).
 * Once we have an authenticated session, promote it into a real,
 * sign-in-able phone number — no SMS OTP needed since the caller is
 * already verified by having a session at all. Fire-and-forget: failure
 * just means they keep signing in with email only. */
function attachPendingOwnerPhone(session: Session) {
  const userId = session.user.id
  if (phoneAttachAttempted.has(userId)) return
  if (session.user.phone) return
  const pendingPhone = (session.user.user_metadata as { phone?: string } | null)?.phone
  if (!pendingPhone) return
  phoneAttachAttempted.add(userId)
  supabase.functions.invoke('attach-owner-phone', { body: {} }).catch(() => {})
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  async function loadProfile(userId: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error || !data) {
      setProfile(null)
      setProfileError('Your account profile could not be loaded. Please try signing in again, or contact your property owner.')
      return
    }
    setProfileError(null)
    setProfile(data as Profile)
  }

  useEffect(() => {
    let mounted = true
    let version = 0
    const applySession = async (next: Session | null) => {
      const request = ++version
      setSession(next)
      setLoading(true)
      if (!next) {
        setProfile(null)
        setProfileError(null)
        setLoading(false)
        return
      }
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', next.user.id).single()
        if (!mounted || request !== version) return
        setProfile(error ? null : data as Profile)
        setProfileError(error || !data ? 'Your account profile could not be loaded. Sign out and try again, or contact your property owner.' : null)
        if (!error && data && (data as Profile).role === 'owner') attachPendingOwnerPhone(next)
      } catch {
        if (mounted && request === version) setProfileError('Connection interrupted while loading your profile. Please sign out and try again.')
      } finally {
        if (mounted && request === version) setLoading(false)
      }
    }
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) { setProfileError(error.message); setLoading(false); return }
      void applySession(data.session)
    }).catch(() => {
      if (mounted) { setProfileError('Unable to check your session. Please reload.'); setLoading(false) }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      if (event === 'SIGNED_OUT') queryClient.clear()
      // Leave Supabase's auth lock before querying the profile.
      setTimeout(() => { if (mounted) void applySession(newSession) }, 0)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [queryClient])

  async function refreshProfile() {
    if (session) await loadProfile(session.user.id)
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    queryClient.clear()
    setProfile(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        profileError,
        passwordRecovery,
        clearPasswordRecovery: () => setPasswordRecovery(false),
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
