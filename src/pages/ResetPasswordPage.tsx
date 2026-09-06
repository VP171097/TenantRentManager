import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../utils/errors'
import { useAuth } from '../hooks/useAuth'
import { Footer } from '../components/Footer'

/** Reached after the user clicks the password-reset link Supabase emails
 * them. useAuth sets passwordRecovery=true when it detects that link (the
 * PASSWORD_RECOVERY auth event) and briefly signs them in with a
 * recovery-only session — just enough to call updateUser with a new
 * password, nothing else. */
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { clearPasswordRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setDone(true)
      clearPasswordRecovery()
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
          <h1 className="text-xl font-extrabold text-brand-700 dark:text-brand-200">Set a new password</h1>

          {done ? (
            <div className="mt-4 space-y-4">
              <p className="rounded-lg bg-green-50 dark:bg-green-950/40 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                Your password has been updated.
              </p>
              <button onClick={() => navigate('/login')} className="w-full rounded-xl bg-brand-600 py-3 text-base font-bold text-white shadow-sm hover:bg-brand-700">
                Go to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">New password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Confirm new password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>

              {error && <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-brand-600 py-3 text-base font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
              >
                {loading ? 'Saving…' : 'Save new password'}
              </button>
            </form>
          )}
        </div>
        <Footer className="mt-6 border-0" />
      </div>
    </div>
  )
}
