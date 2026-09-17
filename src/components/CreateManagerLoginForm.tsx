import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { extractFunctionErrorMessage, friendlyError } from '../utils/errors'
import { validatePassword, passwordsMatchError } from '../utils/password'
import type { Manager } from '../types/database'

/** Mirrors CreateTenantLoginForm — owner sets a password directly for a
 * manager who doesn't have a login yet. */
export function CreateManagerLoginForm({ manager }: { manager: Manager }) {
  const [email, setEmail] = useState(manager.email || '')
  const [phone, setPhone] = useState(manager.phone || '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ email: string | null; phone: string | null; password: string } | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() && !phone.trim()) {
      setError('Provide an email or a mobile number (or both).')
      return
    }
    const pwError = validatePassword(password) ?? passwordsMatchError(password, confirm)
    if (pwError) {
      setError(pwError)
      return
    }
    setLoading(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-manager-login', {
        body: { managerId: manager.id, email: email.trim() || undefined, phone: phone.trim() || undefined, password },
      })
      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError))
      const result = data as { success?: boolean; email?: string | null; phone?: string | null; error?: string }
      if (result.error) throw new Error(result.error)
      setSuccess({ email: result.email ?? null, phone: result.phone ?? null, password })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-2 rounded-lg bg-green-50 dark:bg-green-950/40 p-3">
        <p className="font-semibold text-green-800 dark:text-green-400">Login created.</p>
        <p className="text-sm text-slate-700 dark:text-slate-200">
          Share these details with the manager — this password will not be shown again. They can sign in with{' '}
          {success.email && success.phone ? 'either their email or mobile number' : success.email ? 'their email' : 'their mobile number'}.
        </p>
        {success.email && (
          <p className="text-sm">
            <span className="font-semibold">Email:</span> {success.email}
          </p>
        )}
        {success.phone && (
          <p className="text-sm">
            <span className="font-semibold">Mobile:</span> {success.phone}
          </p>
        )}
        <p className="text-sm">
          <span className="font-semibold">Password:</span> {success.password}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleCreate} className="space-y-3">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Set a password directly</p>
      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Email (optional)</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input mt-1" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Mobile number (optional)</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" className="input mt-1" />
      </div>
      <p className="-mt-1 text-xs text-slate-500 dark:text-slate-400">
        Provide at least one. Giving both lets the manager sign in with either.
      </p>
      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Set a password for the manager</label>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          className="input mt-1"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">At least 8 characters, with a letter and a number.</p>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Confirm password</label>
        <input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          required
          className="input mt-1"
        />
      </div>
      {error && <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Creating…' : 'Create Manager Login'}
      </button>
    </form>
  )
}
