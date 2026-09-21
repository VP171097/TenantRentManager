import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { friendlyError } from '../utils/errors'
import { isValidUpiId } from '../utils/upi'
import { ImageUploader } from '../components/ImageUploader'
import { UpiManager } from '../components/UpiManager'
import { User, Phone, Shield, Wallet, CheckCircle, Save } from 'lucide-react'

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [upiId, setUpiId] = useState(profile?.upi_id ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [upiDraftPending, setUpiDraftPending] = useState(false)

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmedUpi = upiId.trim()
      if (trimmedUpi && !isValidUpiId(trimmedUpi)) {
        throw new Error('Please enter a valid UPI ID, e.g. yourname@okhdfcbank')
      }
      const { error: err } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone, upi_id: trimmedUpi || null, avatar_url: avatarUrl })
        .eq('id', profile!.id)
      if (err) throw err
    },
    onSuccess: async () => { await refreshProfile(); setMessage('Profile updated.'); setError(null) },
    onError: (err) => setError(friendlyError(err)),
  })

  if (!profile) return null

  const initials = (profile.full_name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  const roleColor =
    profile.role === 'owner'
      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
      : profile.role === 'manager'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'

  return (
    <div className="max-w-md space-y-6 page-fade-in">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">My Profile</h1>

      {/* Avatar hero */}
      <div className="card flex items-center gap-4">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover border border-slate-200 dark:border-slate-700" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white shadow-lg shadow-brand-600/20">
            {initials}
          </div>
        )}
        <div>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{profile.full_name}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${roleColor}`}>
              {profile.role}
            </span>
            {profile.email && (
              <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[12rem]">{profile.email}</span>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="card space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Profile Picture</label>
          <ImageUploader
            path={`${profile.id}/avatar`}
            bucket="avatars"
            label={avatarUrl ? 'Change avatar' : 'Upload avatar'}
            currentUrl={avatarUrl}
            onUploaded={setAvatarUrl}
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <User size={14} className="text-slate-400" /> Full name
          </label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Phone size={14} className="text-slate-400" /> Phone
          </label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+91 98765 43210" />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Shield size={14} className="text-slate-400" /> Role
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${roleColor}`}>
              {profile.role}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">Role cannot be changed</span>
          </div>
        </div>

        {profile.role === 'owner' && (
          <>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <Wallet size={14} className="text-slate-400" /> UPI ID
              </label>
              <input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@okhdfcbank"
                className="input"
              />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Shown as a QR code on bills so tenants can pay via any UPI app.
              </p>
            </div>
            <UpiManager ownerId={profile.id} onDraftChange={setUpiDraftPending} />
          </>
        )}

        {upiDraftPending && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            You've typed an additional UPI ID but haven't tapped its "+ Add" button yet — "Save Changes" below won't
            save it.
          </div>
        )}
        {message && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle size={15} />
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary w-full gap-2">
          <Save size={16} />
          {mutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
