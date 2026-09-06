import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../utils/errors'
import { Footer } from '../components/Footer'

/** Public page a tenant lands on after opening the invite link their
 * landlord shared (WhatsApp/SMS/email/in person). Sets their own password
 * and creates their login via the accept-tenant-invite Edge Function. */
export function JoinPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<{ identifier: string; isEmail: boolean } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('accept-tenant-invite', {
        body: { token, identifier, password },
      })
      if (fnError) throw fnError
      const result = data as { success?: boolean; identifier?: string; isEmail?: boolean; error?: string }
      if (result.error) throw new Error(result.error)
      setDone({ identifier: result.identifier ?? identifier, isEmail: !!result.isEmail })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 p-8 text-center shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-300">This invite link is missing or incomplete. Please ask your landlord to resend it.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="RentBook" className="h-10 w-10 rounded-xl" />
            <h1 className="text-2xl font-extrabold text-brand-700 dark:text-brand-200">RentBook</h1>
          </div>

          {done ? (
            <div className="mt-6 space-y-4">
              <p className="rounded-lg bg-green-50 dark:bg-green-950/40 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                Your account is ready! Sign in with {done.isEmail ? 'your email' : 'your mobile number'} ({done.identifier})
                and the password you just set.
              </p>
              <button onClick={() => navigate('/login')} className="w-full rounded-xl bg-brand-600 py-3 text-base font-bold text-white shadow-sm hover:bg-brand-700">
                Go to sign in
              </button>
            </div>
          ) : (
            <>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                Your landlord invited you to set up your RentBook account.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Email or mobile number</label>
                  <input
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Choose a password</label>
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
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Confirm password</label>
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
                  {loading ? 'Creating account…' : 'Create my account'}
                </button>
              </form>
            </>
          )}
        </div>
        <Footer className="mt-6 border-0" />
      </div>
    </div>
  )
}
