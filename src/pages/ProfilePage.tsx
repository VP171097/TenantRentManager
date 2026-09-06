import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { friendlyError } from '../utils/errors'
import { isValidUpiId } from '../utils/upi'
import { ImageUploader } from '../components/ImageUploader'

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [upiId, setUpiId] = useState(profile?.upi_id ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const logoMutation = useMutation({
    mutationFn: async (logoUrl: string) => {
      const { error: err } = await supabase.from('profiles').update({ logo_url: logoUrl }).eq('id', profile!.id)
      if (err) throw err
    },
    onSuccess: async () => {
      await refreshProfile()
      setMessage('Logo updated.')
      setError(null)
    },
    onError: (err) => setError(friendlyError(err)),
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmedUpi = upiId.trim()
      if (trimmedUpi && !isValidUpiId(trimmedUpi)) {
        throw new Error('Please enter a valid UPI ID, e.g. yourname@okhdfcbank')
      }
      const { error: err } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone, upi_id: trimmedUpi || null })
        .eq('id', profile!.id)
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
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">My Profile</h1>
      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Full name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Role</label>
          <p className="mt-1 text-slate-600 dark:text-slate-400 capitalize">{profile.role}</p>
        </div>
        {profile.role === 'owner' && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Branding logo</label>
            <div className="mt-1">
              <ImageUploader
                path={`${profile.id}/logo`}
                label={profile.logo_url ? 'Change logo' : 'Upload logo'}
                currentUrl={profile.logo_url}
                onUploaded={(url) => logoMutation.mutate(url)}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Shown in the app header and at the top of generated bill/receipt PDFs.
            </p>
          </div>
        )}
        {profile.role === 'owner' && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">UPI ID (for rent payments)</label>
            <input
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@okhdfcbank"
              className="input mt-1"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              This is shown as a QR code on bills and to tenants so they can pay you directly via any UPI app.
            </p>
          </div>
        )}
        {message && <p className="rounded-lg bg-green-50 dark:bg-green-950/40 px-3 py-2 text-sm text-green-700 dark:text-green-400">{message}</p>}
        {error && <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary w-full">
          {mutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
