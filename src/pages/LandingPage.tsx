import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, BookOpen, Building2, Check, FileText, Moon, ShieldCheck, Sun, Zap } from 'lucide-react'
import { QuickMeterDial } from '../components/QuickMeterDial'
import { useAuth } from '../hooks/useAuth'
import { useIsDarkMode, useTheme } from '../hooks/useTheme'

export function LandingPage() {
  const { session, profile } = useAuth()
  const { setTheme } = useTheme()
  const dark = useIsDarkMode()
  const [reading, setReading] = useState<number | ''>(1392)
  const destination = session ? (profile?.role === 'tenant' ? '/tenant/dashboard' : '/dashboard') : '/login'
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
    <header className="border-b border-slate-200 dark:border-slate-800">
      <nav aria-label="Public navigation" className="landing-shell flex h-24 items-center justify-between gap-4">
        <Link data-testid="landing-brand" to="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-800 text-white"><BookOpen size={20} /></span>RentSlate<span className="text-brand-700">.</span></Link>
        <div className="hidden items-center gap-8 text-sm text-slate-600 dark:text-slate-300 md:flex"><a data-testid="landing-how-link" href="#how-it-works">How it works</a><a data-testid="landing-meter-link" href="#meter-preview">Electricity, simplified</a></div>
        <div className="flex items-center gap-2 sm:gap-4"><button data-testid="landing-theme-toggle" className="rounded-full p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setTheme(dark ? 'light' : 'dark')}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button><Link data-testid="landing-sign-in" to={destination} className="btn-secondary !rounded-full !px-5 !py-2">{session ? 'Open app' : 'Sign in'}<ArrowRight size={15} /></Link></div>
      </nav>
    </header>
    <main>
      <div className="landing-shell landing-hero">
        <div className="page-fade-in">
          <p data-testid="landing-eyebrow" className="eyebrow flex items-center gap-2.5 text-brand-800 dark:text-brand-200"><span className="h-1.5 w-1.5 rounded-full bg-gold-600" /> A little order. A lot of peace of mind.</p>
          <h1 data-testid="landing-title" className="landing-headline mt-6">Less chasing rent.<br />More <em>room<br className="hidden xl:block" /> for life.</em></h1>
          <p data-testid="landing-description" className="mt-6 max-w-md text-base leading-relaxed text-slate-600 dark:text-slate-300">Your properties, people and payments — together at last. A thoughtful rent manager for the everyday Indian landlord.</p>
          <div className="mt-8 flex flex-wrap items-center gap-4"><Link data-testid="landing-get-started" to={session ? destination : '/login?mode=signup'} className="btn-primary !rounded-full !px-6">{session ? 'Go to your dashboard' : 'Bring it all together'}<ArrowRight size={17} /></Link><a data-testid="landing-explore" href="#how-it-works" className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Take a closer look <ArrowDown size={15} /></a></div>
          <p data-testid="landing-trust-note" className="mt-7 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"><ShieldCheck size={15} className="text-brand-700 dark:text-brand-300" /> Private accounts. Clear records. No spreadsheet juggling.</p>
        </div>
        <div id="meter-preview" className="landing-preview relative scroll-mt-6 rounded-3xl border border-brand-900/10 bg-white dark:bg-slate-900">
          <div className="ledger-panel ledger-grid overflow-hidden rounded-t-3xl p-6 sm:p-8">
            <div className="flex justify-between"><span data-testid="landing-preview-label" className="eyebrow text-brand-100">Small tasks, beautifully simple</span><Zap size={20} className="text-gold-300" /></div>
            <h2 data-testid="landing-preview-title" className="mt-6 text-3xl leading-tight">One reading.<br />No mental maths.</h2>
            <p data-testid="landing-preview-description" className="mt-3 max-w-xs text-sm leading-relaxed text-brand-100">From the number on the meter to the amount on the bill. Instantly.</p>
            <div className="mt-6 flex gap-1" aria-hidden="true">{Array.from({ length: 34 }, (_, i) => <span key={i} className="w-1 flex-1 rounded-t bg-brand-200/25" style={{ height: `${12 + (i % 5) * 4}px` }} />)}</div>
          </div>
          <div className="p-5 sm:p-6"><QuickMeterDial id="landing-meter" previous={1250} current={reading} rate={9} onChange={setReading} /><p data-testid="landing-sample-disclaimer" className="mt-3 text-center text-[11px] text-slate-600 dark:text-slate-300">Try it above · Sample readings only · Nothing is saved</p></div>
          <div className="absolute -right-3 -top-4 rotate-6 rounded-full border border-gold-200 bg-gold-100 px-4 py-2 font-editorial text-xs text-gold-900 shadow-sm" data-testid="landing-made-for-india">Made for India</div>
        </div>
      </div>
      <section className="border-y border-slate-200 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="landing-shell flex flex-wrap items-center justify-between gap-5 py-6 text-sm text-slate-700 dark:text-slate-300">{['Multiple properties, one view', 'Accurate electricity bills', 'Receipts worth keeping'].map((item, i) => <p data-testid={`landing-benefit-${i}`} key={item} className="flex items-center gap-2"><Check size={15} className="text-brand-700 dark:text-brand-300" />{item}</p>)}</div>
      </section>
      <section id="how-it-works" className="landing-shell scroll-mt-8 py-20">
        <div className="flex flex-wrap justify-between gap-5"><div><p data-testid="landing-workflow-eyebrow" className="eyebrow text-brand-700 dark:text-brand-300">From keys to collections</p><h2 data-testid="landing-workflow-title" className="mt-3 text-4xl">A place for every detail.</h2></div><p data-testid="landing-workflow-description" className="max-w-xs text-sm leading-relaxed text-slate-600 dark:text-slate-300">Keep the human side of being a landlord.<br />Let RentSlate organise the rest.</p></div>
        <div className="mt-12 grid gap-9 md:grid-cols-3">{[
          { icon: <Building2 size={24} />, title: 'Know your spaces', text: 'Keep properties, rooms and tenant details in one place. See what’s occupied and what’s ready for someone new.' },
          { icon: <Zap size={24} />, title: 'Make the numbers clear', text: 'Bring rent and electricity together. Review readings and charges before generating a monthly bill.' },
          { icon: <FileText size={24} />, title: 'Close the loop', text: 'Record payments, keep a clear ledger and download PDF receipts. Give every collection a paper trail.' },
        ].map((item, i) => <article key={item.title} data-testid={`landing-feature-${i}`} className="border-t border-slate-300 dark:border-slate-700 pt-5"><div className="flex items-center justify-between text-brand-800 dark:text-brand-200">{item.icon}<span className="font-mono text-xs text-slate-500">0{i + 1}</span></div><h3 data-testid={`landing-feature-title-${i}`} className="mt-6 text-2xl">{item.title}</h3><p data-testid={`landing-feature-description-${i}`} className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.text}</p></article>)}</div>
      </section>
      <section className="landing-shell pb-16"><div className="ledger-panel flex flex-wrap items-center justify-between gap-6 rounded-2xl p-8 sm:p-12"><div><p data-testid="landing-cta-eyebrow" className="eyebrow text-brand-100">Your next month, a little lighter</p><h2 data-testid="landing-cta-title" className="mt-3 text-3xl">Good records. Better headspace.</h2></div><Link data-testid="landing-bottom-sign-in" to={destination} className="inline-flex items-center gap-3 rounded-full bg-slate-50 px-6 py-3 font-semibold text-brand-900 hover:bg-gold-100">Open RentSlate <ArrowRight size={17} /></Link></div></section>
    </main>
    <footer className="landing-shell flex flex-wrap justify-between gap-4 border-t border-slate-200 py-7 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300"><p data-testid="landing-footer-brand">RentSlate · Rent, Simplified.</p><p data-testid="landing-footer-note">Thoughtfully built for small property owners in India.</p></footer>
  </div>
}