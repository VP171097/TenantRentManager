# Room Rent Manager

A production-ready web app for Indian landlords to manage rental properties, rooms, tenants, rent, electricity billing, payments, ledgers, and PDF receipts — built to be extremely simple for non-technical, elderly users while looking modern and professional.

## Features

- **Multi-role access**: Owner (full control), Manager (scoped, permission-based), Tenant (self-service portal).
- **Properties, rooms, tenants**: full CRUD, room transfers with history, tenant move-out with final settlement (final meter reading, deposit adjustment, refund).
- **Rent management**: rent changes only via dated revisions — historical bills are never overwritten. Supports fixed or percentage increases.
- **Electricity billing**: units = current − previous reading, with meter-reset protection against accidental negative units.
- **Monthly billing engine**: `total_due = rent + electricity + other charges + late fee + previous balance − previous credit`; positive balances carry forward as debt, negative balances carry forward as credit — automatically, derived from the prior bill.
- **Idempotent bill generation**: clicking "Generate Bills" twice never creates duplicate bills (DB-level unique constraint + function).
- **Multiple payments per bill**, summed into `total_paid`/`balance` automatically via a DB trigger.
- **PDF receipts** with unique receipt numbers (`PROPERTYCODE-YYYY-MM-#####`) via jsPDF + autoTable.
- **Ledger, reports, CSV export**, global search, audit log, friendly (non-technical) error messages.
- **Mobile-first UI**: large touch targets, bottom navigation, high-contrast status colors (green = paid, orange = pending, red = overdue).

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Supabase (Postgres + Auth + Storage) with full Row Level Security
- TanStack Query for data fetching/caching
- React Hook Form + Zod for forms/validation
- React Router (`HashRouter`, for static GitHub Pages hosting)
- jsPDF + jspdf-autotable for receipts
- Vitest for unit tests

## Architecture

```
src/
  components/       Reusable UI: cards, badges, states, forms/
  layouts/          AppLayout (owner/manager), TenantLayout, ProtectedRoute
  pages/            One file per route; pages/tenant/ for the tenant portal
  hooks/            useAuth (session + profile)
  services/         One module per domain — all Supabase calls live here
  utils/            billing.ts (financial engine), money.ts, validation.ts,
                     errors.ts (friendly error mapping), csv.ts
  types/database.ts Hand-written domain types mirroring the Postgres schema
supabase/migrations/  Numbered SQL migrations (schema, RLS, storage, triggers, seed)
```

The financial engine (`src/utils/billing.ts`) is pure, dependency-free, and unit-tested (`billing.test.ts`) — it mirrors the logic implemented in the Postgres functions (`fn_generate_bill`, `fn_recalc_bill`, etc.) so behavior is consistent and verifiable both client- and server-side.

## Local development

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key
npm run dev
```

## Environment variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key (never the service-role key) |

## Database, storage, and auth setup

See [SETUP.md](./SETUP.md) for the full step-by-step guide: creating a Supabase project, running migrations, configuring auth, storage policies, creating the first owner account, and optional demo data.

## Deployment

Deploys to GitHub Pages via `.github/workflows/deploy.yml` on every push to `main` (or manually via workflow_dispatch). Set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as repository secrets. See SETUP.md for details.

## Testing

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Known limitations / future improvements

- Manager/tenant account invitation is a manual step in this version (see SETUP.md) — production use should add a Supabase Edge Function (service-role, server-side only) to send email invites and link `profiles`/`tenants` rows automatically.
- Reports are intentionally kept simple (summary + monthly collected-vs-due table + CSV export) rather than a full BI dashboard.
- No automated e2e/browser tests — coverage focuses on the financial engine via Vitest unit tests, as specified.
- Late fee configuration is a manual amount entered at bill-generation time rather than a full rules engine.
- Global search is currently scoped per-page (tenants, ledger, receipts) rather than a single unified search bar.
