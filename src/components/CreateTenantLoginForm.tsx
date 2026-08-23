import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../utils/errors'
import type { Tenant } from '../types/database'

export function CreateTenantLoginForm({ tenant }: { tenant: Tenant }) {
  const [identifier, setIdentifier] = useState(tenant.email || tenant.phone || '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ identifier: string; password: string } | null>(null)

  if (tenant.profile_id) {
    return <p className="text-sm text-slate-500">This tenant already has a login set up.</p>
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-tenant-login', {
        body: { tenantId: tenant.id, identifier, password },
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
      <div className="card max-w-md space-y-2 bg-green-50">
        <p className="font-semibold text-green-800">Login created.</p>
        <p className="text-sm text-slate-700">Share these details with the tenant — this password will not be shown again:</p>
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
    <form onSubmit={handleCreate} className="card max-w-md space-y-3">
      <div>
        <label className="block text-sm font-semibold text-slate-700">Email or mobile number</label>
        <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required className="input mt-1" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700">Set a password for the tenant</label>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
          className="input mt-1"
        />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Creating…' : 'Create Tenant Login'}
      </button>
    </form>
  )
}
