import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, Building2, Check, FileText, ShieldCheck, Zap } from 'lucide-react'
import { QuickMeterDial } from '../components/QuickMeterDial'
import { PublicHeader } from '../components/PublicHeader'
import { PublicFooter } from '../components/PublicFooter'
import { useAuth } from '../hooks/useAuth'

export function LandingPage() {
  const { session, profile } = useAuth()
  const [reading, setReading] = useState<number | ''>(1392)
  const destination = session ? (profile?.role === 'tenant' ? '/tenant/dashboard' : '/dashboard') : '/login'
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
    <PublicHeader />
    <main>
      <div className="landing-shell landing-hero">
        <div className="page-fade-in">
          <p data-testid="landing-eyebrow" className="eyebrow flex items-center gap-2.5 text-brand-800 dark:text-brand-200"><span className="h-1.5 w-1.5 rounded-full bg-gold-600" /> A little order. A lot of peace of mind.</p>
          <h1 data-testid="landing-title" className="landing-headline mt-6">Less chasing rent.<br />More <em>room<br className="hidden xl:block" /> for life.</em></h1>
          <p data-testid="landing-description" className="mt-6 max-w-md text-base leading-relaxed text-slate-600 dark:text-slate-300">Your properties, people and payments — together at last. A thoughtful rent manager for the everyday Indian landlord.</p>
          <div className="mt-8 flex flex-wrap items-center gap-4"><Link data-testid="landing-get-started" to={session ? destination : '/login?mode=signup'} className="btn-mono !rounded-full !px-6">{session ? 'Go to your dashboard' : 'Bring it all together'}<ArrowRight size={17} /></Link><a data-testid="landing-explore" href="#how-it-works" className="flex items-center gap-2 text-sm font-semibold text-slate-600 underline underline-offset-4 dark:text-slate-300">Take a closer look <ArrowDown size={15} /></a></div>
          <p data-testid="landing-trust-note" className="mt-7 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"><ShieldCheck size={15} className="text-brand-700 dark:text-brand-300" /> Private accounts. Clear records. No spreadsheet juggling.</p>
        </div>
        <div id="meter-preview" className="landing-preview relative scroll-mt-6 rounded-3xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="overflow-hidden rounded-t-3xl border-b border-slate-200 bg-warm-100 p-6 dark:border-slate-800 dark:bg-slate-800 sm:p-8">
            <div className="flex justify-between"><span data-testid="landing-preview-label" className="eyebrow text-slate-500 dark:text-slate-400">Small tasks, beautifully simple</span><Zap size={20} className="text-slate-400" /></div>
            <h2 data-testid="landing-preview-title" className="mt-6 text-3xl leading-tight">One reading.<br />No mental maths.</h2>
            <p data-testid="landing-preview-description" className="mt-3 max-w-xs text-sm leading-relaxed text-slate-600 dark:text-slate-300">From the number on the meter to the amount on the bill. Instantly.</p>
          </div>
          <div className="p-5 sm:p-6"><QuickMeterDial id="landing-meter" previous={1250} current={reading} rate={9} onChange={setReading} /><p data-testid="landing-sample-disclaimer" className="mt-3 text-center text-[11px] text-slate-600 dark:text-slate-300">Try it above · Sample readings only · Nothing is saved</p></div>
          <div className="absolute -right-3 -top-4 rotate-6 rounded-full border border-slate-300 bg-white px-4 py-2 font-editorial text-xs text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" data-testid="landing-made-for-india">Made for India</div>
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
        ].map((item, i) => <article key={item.title} data-testid={`landing-feature-${i}`} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center justify-between text-slate-400 dark:text-slate-500"><p className="eyebrow">Step 0{i + 1}</p>{item.icon}</div><h3 data-testid={`landing-feature-title-${i}`} className="mt-5 text-2xl">{item.title}</h3><p data-testid={`landing-feature-description-${i}`} className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.text}</p></article>)}</div>
      </section>
      <section className="landing-shell pb-16">
        <div className="relative flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-2xl border border-slate-200 bg-warm-50 p-8 dark:border-slate-800 dark:bg-slate-900 sm:p-12">
          <div className="relative z-10">
            <p data-testid="landing-cta-eyebrow" className="eyebrow text-slate-500 dark:text-slate-400">Your next month, a little lighter</p>
            <h2 data-testid="landing-cta-title" className="mt-3 text-3xl">Good records. Better headspace.</h2>
          </div>
          <Link data-testid="landing-bottom-sign-in" to={destination} className="btn-mono relative z-10 !rounded-full">Open RentSlate <ArrowRight size={17} /></Link>
          <div aria-hidden="true" className="pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-1/4 flex-col items-center justify-center opacity-70 sm:flex">
            <div className="flex h-64 w-64 items-center justify-center rounded-full border border-slate-300 dark:border-slate-700">
              <div className="flex h-44 w-44 flex-col items-center justify-center gap-1 rounded-full border border-slate-300 dark:border-slate-700">
                <span className="font-display text-lg text-slate-300 dark:text-slate-700">₹</span>
                <span className="font-display text-2xl text-slate-300 dark:text-slate-700">organised</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
    <PublicFooter />
  </div>
}