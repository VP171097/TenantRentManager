import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { friendlyError, extractFunctionErrorMessage } from '../utils/errors'
import { validatePassword, passwordsMatchError } from '../utils/password'
import { useAuth } from '../hooks/useAuth'
import { isEmailIdentifier, normalizePhoneIdentifier } from '../utils/upi'
import { COUNTRY_DIAL_CODES, DEFAULT_COUNTRY_DIAL } from '../utils/countries'
import { Footer } from '../components/Footer'
import { Building2, Eye, EyeOff, Mail, Lock, Phone, User, ArrowRight, CheckCircle, Users, ArrowLeft } from 'lucide-react'
import { appUrl } from '../utils/routes'

type Mode = 'signin' | 'signup' | 'forgot'
type Audience = 'owner' | 'tenant'

export function LoginPage() {
  const navigate = useNavigate()
  const { profile, session, loading: authLoading } = useAuth()
  const [params] = useSearchParams()
  const initialAudience: Audience | null = params.get('mode') === 'signup' ? 'owner' : params.get('as') === 'tenant' ? 'tenant' : params.get('as') === 'owner' ? 'owner' : null
  const [audience, setAudience] = useState<Audience | null>(initialAudience)
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'signin')
  const [email, setEmail] = useState('')
  const [signupPhone, setSignupPhone] = useState('')
  const [signupCountryDial, setSignupCountryDial] = useState(DEFAULT_COUNTRY_DIAL.dial)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetKind, setResetKind] = useState<'email' | 'phone' | null>(null)
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
    const isPhoneReset = mode === 'forgot' && !isEmailIdentifier(email.trim())
    if (mode === 'signup' || isPhoneReset) {
      const pwError = validatePassword(password) ?? passwordsMatchError(password, confirmPassword)
      if (pwError) {
        setError(pwError)
        return
      }
    }
    if (mode === 'signup' && signupPhone.trim().replace(/\D/g, '').length < 7) {
      setError('Enter a valid mobile number.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'forgot') {
        const identifier = email.trim()
        if (isEmailIdentifier(identifier)) {
          const redirectTo = appUrl('/reset-password')
          const { error: err } = await supabase.auth.resetPasswordForEmail(identifier, { redirectTo })
          if (err) throw err
          setResetKind('email')
        } else {
          const { data, error: fnError } = await supabase.functions.invoke('reset-password-by-phone', {
            body: { phone: identifier, full_name: fullName.trim(), new_password: password },
          })
          if (fnError) throw new Error(await extractFunctionErrorMessage(fnError))
          const result = data as { success?: boolean; error?: string }
          if (result.error) throw new Error(result.error)
          setResetKind('phone')
        }
        setResetSent(true)
      } else if (mode === 'signin') {
        const identifier = email.trim()
        const { error: err } = isEmailIdentifier(identifier)
          ? await supabase.auth.signInWithPassword({ email: identifier, password })
          : await supabase.auth.signInWithPassword({ phone: normalizePhoneIdentifier(identifier), password })
        if (err) throw err
        // The AuthProvider loads the actual role; the effect then navigates.
      } else {
        const fullPhone = `${signupCountryDial}${signupPhone.trim().replace(/\D/g, '')}`
        // Only email goes through Supabase's real signup/confirmation flow.
        // The phone is carried as metadata for now — once the owner
        // confirms their email and signs in for the first time,
        // attach-owner-phone (called from useAuth) promotes it into a
        // real, sign-in-able phone identifier, no SMS OTP needed since
        // they're already an authenticated, verified caller by then.
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: appUrl('/login'), data: { role: 'owner', full_name: fullName.trim(), phone: fullPhone } },
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
    setResetKind(null)
    setConfirmationSent(false)
    setPassword('')
    setConfirmPassword('')
    setSignupPhone('')
    setSignupCountryDial(DEFAULT_COUNTRY_DIAL.dial)
  }

  function resetFormState() {
    setMode('signin')
    setError(null)
    setResetSent(false)
    setResetKind(null)
    setConfirmationSent(false)
    setEmail('')
    setSignupPhone('')
    setSignupCountryDial(DEFAULT_COUNTRY_DIAL.dial)
    setPassword('')
    setConfirmPassword('')
    setFullName('')
  }

  function chooseAudience(next: Audience) {
    setAudience(next)
    resetFormState()
  }

  function backToAudiencePicker() {
    setAudience(null)
    resetFormState()
  }

  const forgotIdentifier = email.trim()
  const isPhoneReset = mode === 'forgot' && forgotIdentifier !== '' && !isEmailIdentifier(forgotIdentifier)

  const modeTitle: Record<Mode, string> = {
    signin: audience === 'tenant' ? 'Your rent, all in one place' : 'Run your rentals, hassle-free',
    signup: 'Start your landlord journey',
    forgot: 'Reset your password',
  }
  const modeSubtitle: Record<Mode, string> = {
    signin: audience === 'tenant' ? 'Sign in to view your bills and payments' : 'Sign in to manage your properties',
    signup: 'Set up your owner account to get started',
    forgot: isPhoneReset
      ? 'Confirm your mobile number and name to set a new password'
      : "Enter your email and we'll send a reset link, or your mobile number to reset it directly",
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-25">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
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

            {!audience ? (
              <>
                {/* Title */}
                <div className="mb-6">
                  <h2 data-testid="login-title" className="text-2xl font-bold text-slate-900 dark:text-white">Sign in to RentBook</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">First, tell us who you are</p>
                </div>

                {/* Audience selector */}
                <div className="space-y-3">
                  <button
                    data-testid="login-audience-owner"
                    type="button"
                    onClick={() => chooseAudience('owner')}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-4 text-left transition-colors hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/30"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/40">
                      <Building2 size={20} className="text-brand-700 dark:text-brand-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">I'm a Property Owner</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Manage properties, tenants and rent</p>
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-slate-400" />
                  </button>
                  <button
                    data-testid="login-audience-tenant"
                    type="button"
                    onClick={() => chooseAudience('tenant')}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-4 text-left transition-colors hover:border-gold-400 hover:bg-gold-50 dark:hover:bg-gold-950/20"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-100 dark:bg-gold-900/40">
                      <Users size={20} className="text-gold-700 dark:text-gold-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">I'm a Tenant or Manager</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">View your bills, payments and receipts</p>
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-slate-400" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={backToAudiencePicker}
                  className="mb-4 -mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-brand-600 dark:hover:text-brand-400"
                >
                  <ArrowLeft size={12} /> Change
                </button>

                {/* Title */}
                <div className="mb-6">
                  <h2 data-testid="login-title" className="text-2xl font-bold text-slate-900 dark:text-white">{modeTitle[mode]}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{modeSubtitle[mode]}</p>
                </div>

            {/* Reset sent success */}
            {confirmationSent ? (
              <div data-testid="signup-confirmation" role="status" className="rounded-xl bg-brand-50 p-4 text-sm text-brand-900 dark:bg-brand-950 dark:text-brand-100">
                Check your email to confirm your account, then sign in. If no message arrives, the account may already exist.
              </div>
            ) : mode === 'forgot' && resetSent ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-6 text-center">
                  <CheckCircle size={36} className="text-emerald-500" />
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    {resetKind === 'phone' ? 'Password updated! Sign in with your new password.' : 'Reset link sent! Check your inbox.'}
                  </p>
                </div>
                <button onClick={() => switchMode('signin')} className="btn-primary w-full gap-2">
                  Back to sign in <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <form data-testid="login-form" onSubmit={handleSubmit} className="space-y-4">
                {(mode === 'signup' || isPhoneReset) && (
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
                        placeholder="Exactly as your landlord has it on file"
                        className="input pl-10"
                      />
                    </div>
                    {isPhoneReset && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        We use your mobile number + full name to confirm it's you, since there's no email to send a reset link to.
                      </p>
                    )}
                  </div>
                )}

                {mode === 'signup' && (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Mobile number</label>
                    <div className="flex gap-2">
                      <div className="relative shrink-0">
                        <select
                          data-testid="login-signup-country"
                          aria-label="Country code"
                          value={signupCountryDial}
                          onChange={(e) => setSignupCountryDial(e.target.value)}
                          className="input w-[6.5rem] appearance-none pr-6"
                        >
                          {COUNTRY_DIAL_CODES.map((c) => (
                            <option key={c.code} value={c.dial}>
                              {c.flag} {c.dial}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="relative flex-1">
                        <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          data-testid="login-signup-phone"
                          aria-label="Mobile number"
                          type="tel"
                          autoComplete="tel-national"
                          required
                          value={signupPhone}
                          onChange={(e) => setSignupPhone(e.target.value)}
                          placeholder="9876543210"
                          className="input pl-10"
                        />
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      You'll be able to sign in with either your email or this mobile number.
                    </p>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {mode === 'signup' ? 'Email' : 'Email or Mobile Number'}
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      data-testid="login-email"
                      aria-label={mode === 'signup' ? 'Email' : 'Email or Mobile Number'}
                      autoComplete="username"
                      type={mode === 'signup' ? 'email' : 'text'}
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={mode === 'signup' ? 'email@example.com' : 'email@example.com or 9876543210'}
                      className="input pl-10"
                    />
                  </div>
                </div>

                {(mode !== 'forgot' || isPhoneReset) && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {isPhoneReset ? 'New password' : 'Password'}
                      </label>
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
                        aria-label={isPhoneReset ? 'New password' : 'Password'}
                        autoComplete={mode === 'signup' || isPhoneReset ? 'new-password' : 'current-password'}
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={mode === 'signup' || isPhoneReset ? 8 : 6}
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
                    {(mode === 'signup' || isPhoneReset) && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">At least 8 characters, with a letter and a number.</p>
                    )}
                  </div>
                )}

                {(mode === 'signup' || isPhoneReset) && (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {isPhoneReset ? 'Confirm new password' : 'Confirm password'}
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        data-testid="login-confirm-password"
                        aria-label={isPhoneReset ? 'Confirm new password' : 'Confirm password'}
                        autoComplete="new-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input pl-10"
                      />
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
                        : isPhoneReset
                          ? 'Reset password'
                          : 'Send reset link'}
                </button>
              </form>
            )}

            {/* Mode toggle */}
            {!(mode === 'forgot' && resetSent) && (
              <div className="mt-5 text-center">
                {mode !== 'forgot' ? (
                  audience === 'owner' ? (
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
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Don't have a login? Ask your property owner to set one up for you.
                    </p>
                  )
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
              </>
            )}
          </div>
        </div>
        <Footer className="mt-6 border-0" />
      </div>
    </div>
  )
}
