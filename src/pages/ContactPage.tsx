import { Mail, MapPin, Phone } from 'lucide-react'
import { PublicHeader } from '../components/PublicHeader'
import { PublicFooter } from '../components/PublicFooter'

export function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicHeader />
      <main className="landing-shell py-20">
        <p className="eyebrow text-brand-700 dark:text-brand-300">Contact Us</p>
        <h1 className="mt-3 max-w-2xl text-4xl">We'd love to hear from you.</h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Questions, feedback, or something not working the way it should — reach out any time.
        </p>
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
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
      </main>
      <PublicFooter />
    </div>
  )
}
