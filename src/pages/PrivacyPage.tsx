import { PublicHeader } from '../components/PublicHeader'
import { PublicFooter } from '../components/PublicFooter'

interface Section {
  title: string
  paragraphs: string[]
  bullets?: string[]
}

const SECTIONS: Section[] = [
  {
    title: '1. Introduction',
    paragraphs: [
      'This Privacy Policy explains what personal data RentSlate collects, how it’s used, who can see it, and the choices you have. It applies to property owners, co-owners, managers and tenants using the Service.',
      'We aim to comply with India’s Digital Personal Data Protection Act, 2023 (DPDPA) and general good-practice data protection principles.',
    ],
  },
  {
    title: '2. Information we collect',
    paragraphs: ['We collect information in two ways:'],
    bullets: [
      'Account information you provide: full name, email and/or mobile number, password, profile photo, and role (owner, co-owner, manager or tenant).',
      'Records you create to use the Service: property and room details, tenant profiles, rent amounts, electricity meter readings, bills, payments, receipts, expenses, maintenance requests, and any documents or photos you upload.',
      'We do not collect payment card or bank account details — RentSlate does not process payments itself, so no such data passes through the Service.',
    ],
  },
  {
    title: '3. How we use your information',
    paragraphs: ['We use the information collected solely to provide and improve the Service, specifically to:'],
    bullets: [
      'Create and secure your account, and authenticate you when you sign in.',
      'Generate bills, receipts and ledgers, and display your dashboard.',
      'Let an owner share access with tenants and managers, scoped to the permissions the owner sets.',
      'Send account-related notifications (e.g. bill reminders, invite links, password reset) that you or the owner trigger within the app.',
      'Maintain an audit trail of changes for the account owner’s own record-keeping.',
    ],
  },
  {
    title: '4. Who can see your data',
    paragraphs: [
      'Access is scoped by account and role:',
    ],
    bullets: [
      'A property owner (and any co-owner) can see everything under their own account — their properties, tenants, managers, bills and payments.',
      'A manager can see only what the owner has explicitly given them permission to view or edit, on the properties they’ve been assigned to — unless they’re made a co-owner, in which case they have the same access as the owner.',
      'A tenant can see only their own bills, payments, receipts and ledger — never another tenant’s data.',
      'We do not sell, rent, or share your personal data with third parties for marketing or advertising purposes.',
    ],
  },
  {
    title: '5. Where your data is stored',
    paragraphs: [
      'Data is stored using Supabase (a hosted PostgreSQL database, authentication and file storage provider) with row-level security policies that isolate each account’s data from every other account at the database level. Uploaded files (documents, photos) are kept in access-controlled storage buckets.',
      'We do not run our own servers to independently retain a copy of your data outside this infrastructure.',
    ],
  },
  {
    title: '6. Data retention',
    paragraphs: [
      'We retain your account and records for as long as your account is active, so you can continue using the Service. If you ask us to delete your account, we will delete or anonymise the associated personal data within a reasonable period, except where we’re required to retain certain records by law.',
    ],
  },
  {
    title: '7. Security',
    paragraphs: [
      'We use industry-standard measures to protect your data, including encrypted connections (HTTPS), hashed passwords, and access controls that scope every request to the authenticated user’s own account. No method of storage or transmission is 100% secure, but we take reasonable steps to protect your information.',
    ],
  },
  {
    title: '8. Your rights',
    paragraphs: [
      'Subject to applicable law, you have the right to access, correct, or request deletion of your personal data. You can update most of your own information directly within the app (profile, contact details, records you’ve entered). For anything you can’t change yourself, or to request full account deletion, contact us using the details below and we will action your request within a reasonable time.',
    ],
  },
  {
    title: '9. Children’s privacy',
    paragraphs: [
      'The Service is intended for use by adults managing or renting property. We do not knowingly collect personal data from children.',
    ],
  },
  {
    title: '10. Changes to this policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time as the Service evolves. We’ll update the "Last updated" date below whenever we do — please check back periodically.',
    ],
  },
  {
    title: '11. Contact us',
    paragraphs: [
      'For any privacy-related question, or to exercise your data rights, reach us via the Contact Us page, or write to vp522099@gmail.com.',
    ],
  },
]

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicHeader />
      <main className="landing-shell max-w-3xl py-20">
        <p className="eyebrow text-brand-700 dark:text-brand-300">Legal</p>
        <h1 className="mt-3 text-4xl">Privacy Policy</h1>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Last updated {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}
        </p>
        <p className="mt-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Your privacy matters to us. This page explains what data RentSlate collects and how it’s handled.
        </p>
        <div className="mt-12 space-y-10">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h2 className="text-xl font-semibold">{s.title}</h2>
              <div className="mt-2 space-y-3">
                {s.paragraphs.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {p}
                  </p>
                ))}
                {s.bullets && (
                  <ul className="list-disc space-y-2 pl-5">
                    {s.bullets.map((b, i) => (
                      <li key={i} className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
