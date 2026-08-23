import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { friendlyError } from '../utils/errors'

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const { error: err } = await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', profile!.id)
      if (err) throw err
    },
    onSuccess: async () => {
      await refreshProfile()
      setMessage('Profile updated.')
      setError(null)
    },
    onError: (err) => setError(friendlyError(err)),
  })

  if (!profile) return null

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">My Profile</h1>
      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700">Full name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Role</label>
          <p className="mt-1 text-slate-600 capitalize">{profile.role}</p>
        </div>
        {message && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary w-full">
          {mutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
