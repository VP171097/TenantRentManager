import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle, Mail, MapPin, Phone } from 'lucide-react'
import { PublicHeader } from '../components/PublicHeader'
import { PublicFooter } from '../components/PublicFooter'
import { submitContactMessage } from '../services/contact'
import { friendlyError } from '../utils/errors'

export function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      if (!name.trim() || !message.trim()) throw new Error('Please fill in your name and message.')
      if (!email.trim() && !phone.trim()) throw new Error('Please provide an email or a mobile number so we can reply.')
      return submitContactMessage({ name, email: email || undefined, phone: phone || undefined, message })
    },
    onSuccess: () => {
      setError(null)
      setName('')
      setEmail('')
      setPhone('')
      setMessage('')
    },
    onError: (err) => setError(friendlyError(err)),
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicHeader />
      <main className="landing-shell py-20">
        <p className="eyebrow text-brand-700 dark:text-brand-300">Contact Us</p>
        <h1 className="mt-3 max-w-2xl text-4xl">We'd love to hear from you.</h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Questions, feedback, or something not working the way it should — reach out any time.
        </p>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-1">
            <a href="mailto:vp522099@gmail.com" className="card !p-6 hover:border-brand-300 dark:hover:border-brand-700">
              <Mail size={22} className="text-brand-700 dark:text-brand-300" />
              <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Email</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">vp522099@gmail.com</p>
            </a>
            <a href="tel:+917011088059" className="card !p-6 hover:border-brand-300 dark:hover:border-brand-700">
              <Phone size={22} className="text-brand-700 dark:text-brand-300" />
              <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Phone</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">+91 70110 88059</p>
            </a>
            <div className="card !p-6">
              <MapPin size={22} className="text-brand-700 dark:text-brand-300" />
              <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Based in</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">India</p>
            </div>
          </div>

          <div className="card !p-8">
            <h2 className="text-xl font-semibold">Send us a message</h2>
            {mutation.isSuccess ? (
              <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-8 text-center">
                <CheckCircle size={32} className="text-emerald-500" />
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Thanks — we've received your message and will get back to you soon.
                </p>
                <button onClick={() => mutation.reset()} className="btn-secondary mt-2">
                  Send another message
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  mutation.mutate()
                }}
                className="mt-6 space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Name</label>
                    <input required value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Your full name" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Mobile number</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="9876543210" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Provide at least your email or mobile number so we can reply.</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Message</label>
                  <textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    maxLength={4000}
                    className="input resize-none"
                    placeholder="How can we help?"
                  />
                </div>
                {error && (
                  <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                    {error}
                  </div>
                )}
                <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
                  {mutation.isPending ? 'Sending…' : 'Send message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
