import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../utils/errors'
import { useAuth } from '../hooks/useAuth'
import { isEmailIdentifier, normalizePhoneIdentifier } from '../utils/upi'
import { Footer } from '../components/Footer'
import { Building2, Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle } from 'lucide-react'
import { appUrl } from '../utils/routes'

type Mode = 'signin' | 'signup' | 'forgot'

export function LoginPage() {
  const navigate = useNavigate()
  const { profile, session, loading: authLoading } = useAuth()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  useEffect(() => {
    if (authLoading || !session || !profile) return
    const next = params.get('next')
    const safeNext = next?.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login') && !next.includes('\\') ? next : null
    navigate(safeNext ?? (profile.role === 'tenant' ? '/tenant/dashboard' : '/dashboard'), { replace: true })
  }, [authLoading, session, profile, params, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'forgot') {
        const redirectTo = appUrl('/reset-password')
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
        if (err) throw err
        setResetSent(true)
      } else if (mode === 'signin') {
        const identifier = email.trim()
        const { error: err } = isEmailIdentifier(identifier)
          ? await supabase.auth.signInWithPassword({ email: identifier, password })
          : await supabase.auth.signInWithPassword({ phone: normalizePhoneIdentifier(identifier), password })
        if (err) throw err
        // The AuthProvider loads the actual role; the effect then navigates.
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: appUrl('/login'), data: { role: 'owner', full_name: fullName.trim() } },
        })
        if (err) throw err
        if (!data.session) setConfirmationSent(true)
      }
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setResetSent(false)
    setConfirmationSent(false)
  }

  const modeTitle: Record<Mode, string> = {
    signin: 'Welcome back',
    signup: 'Create your account',
    forgot: 'Reset your password',
  }
  const modeSubtitle: Record<Mode, string> = {
    signin: 'Sign in to manage your properties',
    signup: 'Set up your owner account to get started',
    forgot: "Enter your email and we'll send a reset link",
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-25">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <Link data-testid="login-back-home" to="/" className="mb-5 inline-flex items-center text-sm text-brand-700 dark:text-brand-300">← Back to RentBook</Link>
        {/* Card */}
        <div className="rounded-3xl bg-white/10 p-0.5 shadow-2xl backdrop-blur-sm dark:bg-white/5">
          <div className="rounded-[22px] bg-white dark:bg-slate-900 p-8">
            {/* Brand */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-600/30">
                <Building2 size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">RentBook</h1>
                <p className="text-xs text-slate-400 dark:text-slate-500">Rent, Simplified.</p>
              </div>
            </div>

            {/* Title */}
            <div className="mb-6">
              <h2 data-testid="login-title" className="text-2xl font-bold text-slate-900 dark:text-white">{modeTitle[mode]}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{modeSubtitle[mode]}</p>
            </div>

            {/* Reset sent success */}
            {confirmationSent ? <div data-testid="signup-confirmation" role="status" className="rounded-xl bg-brand-50 p-4 text-sm text-brand-900 dark:bg-brand-950 dark:text-brand-100">Check your email to confirm your account, then sign in. If no message arrives, the account may already exist.</div> : mode === 'forgot' && resetSent ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-6 text-center">
                  <CheckCircle size={36} className="text-emerald-500" />
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    Reset link sent! Check your inbox.
                  </p>
                </div>
                <button onClick={() => switchMode('signin')} className="btn-primary w-full gap-2">
                  Back to sign in <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <form data-testid="login-form" onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Full name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        data-testid="login-full-name"
                        aria-label="Full name"
                        autoComplete="name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="input pl-10"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {mode === 'signin' ? 'Email or Mobile Number' : 'Email'}
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      data-testid="login-email"
                      aria-label={mode === 'signin' ? 'Email or Mobile Number' : 'Email'}
                      autoComplete="username"
                      type={mode === 'signin' ? 'text' : 'email'}
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={mode === 'signin' ? 'email@example.com or 9876543210' : 'email@example.com'}
                      className="input pl-10"
                    />
                  </div>
                </div>

                {mode !== 'forgot' && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Password</label>
                      {mode === 'signin' && (
                        <button
                          data-testid="login-forgot-password"
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        data-testid="login-password"
                        aria-label="Password"
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input pl-10 pr-11"
                      />
                      <button
                        data-testid="login-show-password"
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div data-testid="login-error" role="alert" className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                    {error}
                  </div>
                )}

                <button
                  data-testid="login-submit"
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading
                    ? 'Please wait…'
                    : mode === 'signin'
                      ? 'Sign in'
                      : mode === 'signup'
                        ? 'Create account'
                        : 'Send reset link'}
                </button>
              </form>
            )}

            {/* Mode toggle */}
            {!(mode === 'forgot' && resetSent) && (
              <div className="mt-5 text-center">
                {mode !== 'forgot' ? (
                  <button
                    data-testid="login-switch-mode"
                    onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                    className="text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                  >
                    {mode === 'signin' ? (
                      <>New owner? <span className="font-semibold text-brand-600 dark:text-brand-400">Create an account</span></>
                    ) : (
                      <>Already have an account? <span className="font-semibold text-brand-600 dark:text-brand-400">Sign in</span></>
                    )}
                  </button>
                ) : (
                  mode === 'forgot' && !resetSent && (
                    <button
                      onClick={() => switchMode('signin')}
                      className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                      ← Back to sign in
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
        <Footer className="mt-6 border-0" />
      </div>
    </div>
  )
}
