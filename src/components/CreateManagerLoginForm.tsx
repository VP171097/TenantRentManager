import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../utils/errors'
import type { Manager } from '../types/database'

/** Mirrors CreateTenantLoginForm — owner sets a password directly for a
 * manager who doesn't have a login yet. */
export function CreateManagerLoginForm({ manager }: { manager: Manager }) {
  const [identifier, setIdentifier] = useState(manager.email || manager.phone || '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ identifier: string; password: string } | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-manager-login', {
        body: { managerId: manager.id, identifier, password },
      })
      if (fnError) throw fnError
      const result = data as { success?: boolean; identifier?: string; error?: string }
      if (result.error) throw new Error(result.error)
      setSuccess({ identifier: result.identifier ?? identifier, password })
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
          Share these details with the manager — this password will not be shown again:
        </p>
        <p className="text-sm">
          <span className="font-semibold">Username:</span> {success.identifier}
        </p>
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
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Email or mobile number</label>
        <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required className="input mt-1" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Set a password for the manager</label>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
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
