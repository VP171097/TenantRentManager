import { PublicHeader } from '../components/PublicHeader'
import { PublicFooter } from '../components/PublicFooter'

const SECTIONS: { title: string; body: string }[] = [
  { title: '1. Using RentSlate', body: 'RentSlate is a tool for property owners to manage properties, tenants, rent and electricity billing. By creating an account you agree to use it lawfully and to keep your login credentials secure.' },
  { title: '2. Your account', body: 'You are responsible for the accuracy of the property, tenant and billing information you enter. Owners are responsible for any managers or co-owners they invite and the access granted to them.' },
  { title: '3. Data ownership', body: 'The records you create — properties, tenants, bills, payments, documents — belong to you. RentSlate stores them on your behalf to provide the service; see the Privacy Policy for details on how that data is handled.' },
  { title: '4. Payments', body: 'RentSlate helps you track and record rent and electricity payments; it does not process or hold funds itself. Any UPI details shown to tenants are provided by the owner for their own reference.' },
  { title: '5. Availability', body: 'RentSlate is provided as-is. While we aim for it to be reliable, we don’t guarantee uninterrupted access and aren’t liable for losses arising from downtime or data entry errors.' },
  { title: '6. Changes', body: 'These terms may be updated from time to time as the service evolves. Continued use after a change means you accept the updated terms.' },
]

export function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicHeader />
      <main className="landing-shell max-w-3xl py-20">
        <p className="eyebrow text-brand-700 dark:text-brand-300">Legal</p>
        <h1 className="mt-3 text-4xl">Terms and Conditions</h1>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Last updated {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}</p>
        <div className="mt-12 space-y-8">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h2 className="text-xl font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{s.body}</p>
            </div>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
