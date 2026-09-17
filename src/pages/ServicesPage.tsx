import { Link } from 'react-router-dom'
import { ArrowRight, Building2, CreditCard, FileText, UserCog, Users, Wrench, Zap } from 'lucide-react'
import { PublicHeader } from '../components/PublicHeader'
import { PublicFooter } from '../components/PublicFooter'

const SERVICES = [
  { icon: <Building2 size={22} />, title: 'Properties & rooms', text: 'Organise every property and room you own, with occupancy status at a glance.' },
  { icon: <Users size={22} />, title: 'Tenant management', text: 'Full tenant profiles, move-in/move-out tracking, and self-service logins.' },
  { icon: <Zap size={22} />, title: 'Electricity billing', text: 'Log meter readings and let RentSlate work out the exact charge every month.' },
  { icon: <CreditCard size={22} />, title: 'Rent & payments', text: 'Generate monthly bills, record payments, and track outstanding balances.' },
  { icon: <FileText size={22} />, title: 'Receipts & ledger', text: 'Clean PDF receipts and a full ledger for every tenant, always up to date.' },
  { icon: <Wrench size={22} />, title: 'Maintenance requests', text: 'Tenants report issues, you triage and track them through to resolved.' },
  { icon: <UserCog size={22} />, title: 'Managers & co-owners', text: 'Bring in a manager or co-owner with the exact access they need.' },
]

export function ServicesPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicHeader />
      <main className="landing-shell py-20">
        <p className="eyebrow text-brand-700 dark:text-brand-300">Services</p>
        <h1 className="mt-3 max-w-2xl text-4xl">Everything a landlord needs, in one place.</h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Every service below comes standard — no add-ons, no hidden tiers.
        </p>
        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((item) => (
            <div key={item.title} className="card">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                {item.icon}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-16">
          <Link to="/login?mode=signup" className="btn-primary !rounded-full !px-6">
            Bring it all together <ArrowRight size={17} />
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
