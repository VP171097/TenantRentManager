import { PublicHeader } from '../components/PublicHeader'
import { PublicFooter } from '../components/PublicFooter'

const SECTIONS: { title: string; body: string }[] = [
  { title: '1. What we collect', body: 'Account details (name, email or phone, password), and the property, tenant, billing and payment records you enter to use RentSlate. Uploaded files (documents, photos) are stored securely and only accessible to the people you’ve given access to.' },
  { title: '2. How it’s used', body: 'Your data is used solely to provide the service — generating bills and receipts, tracking payments, showing your dashboard, and sending you (or a tenant/manager you’ve invited) the notifications the app is designed to send.' },
  { title: '3. Who can see it', body: 'Only you, and anyone you explicitly grant access to (a manager or co-owner with permissions you control, or a tenant seeing their own records). We don’t sell or share your data with third parties for marketing.' },
  { title: '4. Where it’s stored', body: 'Data is stored with our database and storage provider (Supabase) using row-level security, so accounts are isolated from each other by design.' },
  { title: '5. Your choices', body: 'You can edit or delete most records directly in the app. To delete your account entirely, contact us and we’ll help.' },
  { title: '6. Changes', body: 'This policy may be updated as the service evolves. We’ll keep this page current — check back if you’re unsure.' },
]

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicHeader />
      <main className="landing-shell max-w-3xl py-20">
        <p className="eyebrow text-brand-700 dark:text-brand-300">Legal</p>
        <h1 className="mt-3 text-4xl">Privacy Policy</h1>
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
