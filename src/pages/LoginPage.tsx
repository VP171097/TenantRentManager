import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../utils/errors'
import { useAuth } from '../hooks/useAuth'
import { isEmailIdentifier, normalizePhoneIdentifier } from '../utils/upi'
import { Footer } from '../components/Footer'

export function LoginPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'forgot') {
        const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}#/reset-password`
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
        if (err) throw err
        setResetSent(true)
      } else if (mode === 'signin') {
        const identifier = email.trim()
        const { error: err } = isEmailIdentifier(identifier)
          ? await supabase.auth.signInWithPassword({ email: identifier, password })
          : await supabase.auth.signInWithPassword({ phone: normalizePhoneIdentifier(identifier), password })
        if (err) throw err
        const dest = profile?.role === 'tenant' ? '/tenant/dashboard' : '/dashboard'
        navigate(dest)
      } else {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role: 'owner', full_name: fullName } },
        })
        if (err) throw err
        const dest = profile?.role === 'tenant' ? '/tenant/dashboard' : '/dashboard'
        navigate(dest)
      }
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="RentBook" className="h-10 w-10 rounded-xl" />
            <div>
              <h1 className="text-2xl font-extrabold text-brand-700 dark:text-brand-200">RentBook</h1>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Rent, Simplified.</p>
            </div>
          </div>
          <p className="mt-3 text-slate-500 dark:text-slate-400">
            {mode === 'signin' && 'Sign in to manage your properties'}
            {mode === 'signup' && 'Create your owner account'}
            {mode === 'forgot' && 'Enter your email and we\'ll send you a reset link'}
          </p>

          {mode === 'forgot' && resetSent ? (
            <div className="mt-6 space-y-4">
              <p className="rounded-lg bg-green-50 dark:bg-green-950/40 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                If an account exists for that email, a password reset link has been sent. Check your inbox.
              </p>
              <button
                onClick={() => {
                  setMode('signin')
                  setResetSent(false)
                }}
                className="w-full text-sm font-semibold text-brand-600"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Full name</label>
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {mode === 'signin' ? 'Email or Mobile Number' : 'Email'}
                </label>
                <input
                  type={mode === 'signin' ? 'text' : 'email'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>
              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Password</label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot')
                          setError(null)
                        }}
                        className="text-xs font-semibold text-brand-600"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                </div>
              )}

              {error && <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-brand-600 py-3 text-base font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
              >
                {loading
                  ? 'Please wait…'
                  : mode === 'signin'
                    ? 'Sign in'
                    : mode === 'signup'
                      ? 'Create account'
                      : 'Send reset link'}
              </button>
            </form>
          )}

          {mode !== 'forgot' && (
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="mt-4 w-full text-sm font-semibold text-brand-600"
            >
              {mode === 'signin' ? 'New owner? Create an account' : 'Already have an account? Sign in'}
            </button>
          )}
          {mode === 'forgot' && !resetSent && (
            <button onClick={() => setMode('signin')} className="mt-4 w-full text-sm font-semibold text-brand-600">
              Back to sign in
            </button>
          )}
        </div>
        <Footer className="mt-6 border-0" />
      </div>
    </div>
  )
}
