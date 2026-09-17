import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { extractFunctionErrorMessage, friendlyError } from '../utils/errors'
import { validatePassword, passwordsMatchError } from '../utils/password'
import { Footer } from '../components/Footer'
import { Building2, Eye, EyeOff, Mail, Lock, Phone, CheckCircle, ArrowRight } from 'lucide-react'

/** Public page a tenant OR manager lands on after opening the invite link
 * the owner shared (WhatsApp/SMS/email/in person). Sets their own password
 * and creates their login via the matching accept-*-invite Edge Function —
 * ?type=manager routes to accept-manager-invite, anything else (or no
 * type param, keeping old tenant links working) routes to
 * accept-tenant-invite. */
export function JoinPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const isManager = searchParams.get('type') === 'manager'
  const [identifier, setIdentifier] = useState('')
  const [tenantPhone, setTenantPhone] = useState('')
  const [tenantEmail, setTenantEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<{ identifier: string; isEmail: boolean } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const pwError = validatePassword(password) ?? passwordsMatchError(password, confirm)
    if (pwError) {
      setError(pwError)
      return
    }
    if (!isManager && tenantPhone.trim().replace(/\D/g, '').length < 7) {
      setError('Enter a valid mobile number.')
      return
    }
    setLoading(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        isManager ? 'accept-manager-invite' : 'accept-tenant-invite',
        {
          body: isManager
            ? { token, identifier, password }
            : { token, phone: tenantPhone.trim(), email: tenantEmail.trim() || undefined, password },
        }
      )

      if (fnError) {
        setError(await extractFunctionErrorMessage(fnError))
        return
      }

      const result = data as { success?: boolean; identifier?: string; isEmail?: boolean; phone?: string; email?: string | null; error?: string }
      if (result.error) {
        setError(result.error)
        return
      }

      setDone(
        isManager
          ? { identifier: result.identifier ?? identifier, isEmail: !!result.isEmail }
          : { identifier: result.phone ?? tenantPhone.trim(), isEmail: false }
      )
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="gradient-auth flex min-h-screen items-center justify-center px-4">
        <div className="relative w-full max-w-sm">
          <div className="rounded-3xl bg-white/10 p-0.5 shadow-2xl backdrop-blur-sm">
            <div className="rounded-[22px] bg-white dark:bg-slate-900 p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                <Building2 size={22} className="text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Invalid invite link</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                This invite link is missing or incomplete. Please ask the{' '}
                {isManager ? 'property owner' : 'landlord'} to resend it.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gradient-auth flex min-h-screen items-center justify-center px-4 py-8">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="rounded-3xl bg-white/10 p-0.5 shadow-2xl backdrop-blur-sm dark:bg-white/5">
          <div className="rounded-[22px] bg-white dark:bg-slate-900 p-8">
            {/* Brand */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-600/30">
                <Building2 size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">RentSlate</h1>
                <p className="text-xs text-slate-400 dark:text-slate-500">Rent, Simplified.</p>
              </div>
            </div>

            {done ? (
              <div className="space-y-5">
                <div className="flex flex-col items-center gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60">
                    <CheckCircle size={32} className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-emerald-800 dark:text-emerald-200">Account ready!</p>
                    <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                      Sign in with {done.isEmail ? 'your email' : 'your mobile'}{' '}
                      <span className="font-semibold">({done.identifier})</span> and your new password.
                    </p>
                  </div>
                </div>
                <button onClick={() => navigate('/login')} className="btn-primary w-full gap-2">
                  Go to sign in <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Set up your account</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {isManager ? 'The property owner' : 'Your landlord'} invited you to join RentSlate.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {isManager ? (
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Email or mobile number
                      </label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          required
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="email@example.com or 9876543210"
                          className="input pl-10"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Mobile number
                        </label>
                        <div className="relative">
                          <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="tel"
                            required
                            value={tenantPhone}
                            onChange={(e) => setTenantPhone(e.target.value)}
                            placeholder="9876543210"
                            className="input pl-10"
                            autoComplete="tel"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Email (optional)
                        </label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="email"
                            value={tenantEmail}
                            onChange={(e) => setTenantEmail(e.target.value)}
                            placeholder="email@example.com"
                            className="input pl-10"
                            autoComplete="email"
                          />
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Add this too and you'll be able to sign in with either your mobile number or email.
                        </p>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Choose a password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 8 characters, a letter and a number"
                        className="input pl-10 pr-11"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Confirm password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Repeat your password"
                        className="input pl-10 pr-11"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'Creating account…' : 'Create my account'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
        <Footer className="mt-6 border-0 text-white/50 dark:text-white/30" />
      </div>
    </div>
  )
}
