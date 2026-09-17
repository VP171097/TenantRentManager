import { Link } from 'react-router-dom'
import { ArrowRight, HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react'
import { PublicHeader } from '../components/PublicHeader'
import { PublicFooter } from '../components/PublicFooter'

export function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicHeader />
      <main className="landing-shell py-20">
        <p className="eyebrow text-brand-700 dark:text-brand-300">About Us</p>
        <h1 className="mt-3 max-w-2xl text-4xl">Built for the everyday Indian landlord.</h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
          RentSlate started from a simple frustration: managing a handful of rented rooms shouldn't need a
          spreadsheet, a notebook, and a dozen WhatsApp reminders all at once. We wanted one place to track
          properties, tenants, electricity readings and payments — simple enough for a first-time landlord,
          thorough enough for someone managing several properties.
        </p>
        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {[
            { icon: <Sparkles size={22} />, title: 'Simple by design', text: 'No clutter, no jargon — just what a landlord actually needs, day to day.' },
            { icon: <ShieldCheck size={22} />, title: 'Your data, private', text: 'Every account is scoped and secured — your records are yours alone.' },
            { icon: <HeartHandshake size={22} />, title: 'Made with feedback', text: 'Shaped by real landlords using it every month, not guesswork.' },
          ].map((item) => (
            <div key={item.title} className="border-t border-slate-300 dark:border-slate-700 pt-5">
              <span className="text-brand-800 dark:text-brand-200">{item.icon}</span>
              <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-16">
          <Link to="/login?mode=signup" className="btn-primary !rounded-full !px-6">
            Get started for free <ArrowRight size={17} />
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
