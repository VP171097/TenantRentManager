import { Link } from 'react-router-dom'
import { ArrowRight, Newspaper } from 'lucide-react'
import { PublicHeader } from '../components/PublicHeader'
import { PublicFooter } from '../components/PublicFooter'

export function BlogPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicHeader />
      <main className="landing-shell py-20">
        <p className="eyebrow text-brand-700 dark:text-brand-300">Blogs</p>
        <h1 className="mt-3 max-w-2xl text-4xl">Notes for landlords, coming soon.</h1>
        <div className="mt-14 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <Newspaper size={28} className="text-slate-400" />
          <p className="max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            We're writing up practical guides on rent collection, electricity billing and tenant management for
            Indian landlords. Check back soon.
          </p>
          <Link to="/contact" className="mt-2 flex items-center gap-2 text-sm font-semibold text-brand-700 underline underline-offset-4 dark:text-brand-300">
            Have a topic you'd like covered? Tell us <ArrowRight size={15} />
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
