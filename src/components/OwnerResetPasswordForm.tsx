import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { extractFunctionErrorMessage, friendlyError } from '../utils/errors'
import { validatePassword, passwordsMatchError } from '../utils/password'

/** Lets an owner directly set a new password for a tenant/manager who
 * already has a login — e.g. they forgot it and can't use the email-link
 * or phone+name self-service reset (no email on file, or the name on
 * record doesn't match what they typed). */
export function OwnerResetPasswordForm({ kind, id }: { kind: 'tenant' | 'manager'; id: string }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const pwError = validatePassword(password) ?? passwordsMatchError(password, confirm)
    if (pwError) {
      setError(pwError)
      return
    }
    setLoading(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('owner-reset-login-password', {
        body: { kind, id, new_password: password },
      })
      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError))
      const result = data as { success?: boolean; error?: string }
      if (result.error) throw new Error(result.error)
      setSuccess(true)
      setPassword('')
      setConfirm('')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          setSuccess(false)
        }}
        className="btn-secondary px-4 text-sm"
      >
        Reset Password
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
      {success ? (
        <p className="rounded-lg bg-green-50 dark:bg-green-950/40 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          Password updated. Share the new password with them directly.
        </p>
      ) : (
        <>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">New password</label>
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
        </>
      )}
      <div className="flex gap-2">
        {!success && (
          <button type="submit" disabled={loading} className="btn-primary text-sm">
            {loading ? 'Saving…' : 'Save New Password'}
          </button>
        )}
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-sm">
          {success ? 'Close' : 'Cancel'}
        </button>
      </div>
    </form>
  )
}
