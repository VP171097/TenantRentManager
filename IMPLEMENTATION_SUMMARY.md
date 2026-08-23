# Implementation Summary

## What was built

A complete React + TypeScript + Vite frontend (Tailwind CSS v4) backed by Supabase (Postgres + Auth + Storage), deployable as a static site to GitHub Pages via GitHub Actions.

**Roles & access**
- **Owner**: full CRUD on properties, rooms, tenants, rent revisions, electricity readings, monthly billing, payments, receipts, managers + their permissions, reports, CSV export, settings.
- **Manager**: scoped to properties they're assigned to, gated per-permission-flag (`can_view_tenants`, `can_edit_tenants`, `can_enter_electricity`, `can_record_payments`, `can_generate_receipts`, `can_view_ledger`, `can_edit_rent`, `can_manage_rooms`).
- **Tenant**: restricted self-service portal — own dashboard, ledger, receipts only, enforced by RLS.

**Core financial engine** (`src/utils/billing.ts`, mirrored in Postgres functions):
- Electricity: `units = current − previous`, throws unless `is_meter_reset` is explicitly set (DB has a matching check constraint).
- Rent: never mutated in place — only added via `rent_revisions` rows with an `effective_date`; `applicableRent()` picks the latest revision on/before a date. Bills snapshot `rent_amount` at generation time so history is immutable.
- `total_due = rent + electricity + other_charges + late_fee + previous_balance − previous_credit`.
- `balance = total_due − total_paid`; positive carries forward as `previous_balance`, negative as `previous_credit` — always derived from the prior bill via `splitCarryForward()` / the `fn_generate_bill` Postgres function, never manually copied.
- Multiple payments per bill: a `payments` table + an `AFTER INSERT/UPDATE/DELETE` trigger (`trg_payments_recalc`) recomputes `total_paid`/`balance`/`status` on the bill.
- Idempotent monthly billing: `unique(tenant_id, billing_month)` + `fn_generate_bill` returns the existing bill instead of erroring/duplicating on a second click.
- All money handled in integer paise internally (`src/utils/money.ts`) to avoid float drift; Postgres uses `numeric(12,2)` throughout.
- Receipts: `PROPERTYCODE-YYYY-MM-#####`, allocated atomically via a per-property/month counter table (`receipt_counters` + `fn_next_receipt_seq`), generated as downloadable/printable PDFs with jsPDF + autoTable.

## Database schema overview

`supabase/migrations/`:
1. **001_schema.sql** — `profiles`, `properties`, `rooms`, `tenants`, `tenant_documents`, `rent_revisions`, `electricity_readings`, `bills`, `payments`, `receipts`, `receipt_counters`, `managers`, `manager_permissions`, `tenant_room_history`, `audit_log`; enums for role/status/payment method; indexes on all FK/date columns used for filtering; DB functions: `fn_applicable_rent`, `fn_applicable_electricity_rate`, `fn_tenant_current_balance`, `fn_next_receipt_seq`, `fn_generate_bill`, `fn_recalc_bill` (+ trigger), `fn_generate_receipt`.
2. **002_rls_policies.sql** — RLS enabled on every table; security-definer helper functions (`fn_my_role`, `fn_my_owner_id`, `fn_manager_has_perm`, `fn_can_access_property`) avoid recursive-policy issues; owners see only their own data tree, managers see only properties+permissions they're granted, tenants see only their own tenant record's data.
3. **003_storage.sql** — private `tenant-documents` bucket, path convention `{owner_id}/{property_id}/{tenant_id}/{filename}`, no public URLs — access only via `createSignedUrl` for authorized owner/manager/tenant.
4. **004_auth_triggers.sql** — `on_auth_user_created` trigger auto-creates a `profiles` row from signup metadata; `fn_settle_move_out` handles move-out settlement (final meter reading + bill, deposit refund/deduction, room freed); `fn_generate_electricity_and_bill` seed helper.
5. **005_seed_demo_data.sql** — demo property "Krishna Residency" (rooms 101/102/103/204), tenants Rahul Sharma (fully paid), Amit Kumar (old outstanding balance, partial payments, upcoming rent increase), Neha Singh (multiple partial payments resulting in credit).

## Frontend

- `src/lib/supabase.ts` — Supabase client (untyped generic — see note in file; a hand-written `types/database.ts` models the domain instead of `supabase gen types`, since no live project was available to generate against).
- `src/hooks/useAuth.tsx` — session + `profiles` row, drives role-based routing.
- `src/services/*.ts` — one module per domain (properties, rooms, tenants, billing, electricity, payments, managers, auditLog, receiptPdf) — every button in the UI calls a real Supabase query/RPC, no mocked data.
- `src/layouts/` — `AppLayout` (desktop sidebar + mobile bottom nav with floating quick actions), `TenantLayout` (simplified 3-tab portal), `ProtectedRoute` (role-gated redirects).
- `src/pages/` — Login, Dashboard, Properties(+detail), Rooms(+detail), Tenants(+detail with rent revisions/move-out/documents/ledger/payments/receipts), Billing (bulk generation), Payments, Electricity, Ledger (+CSV export), Receipts, Reports (+CSV export), Managers (+permission matrix), Settings, Profile, and `pages/tenant/` for the tenant portal.
- Forms use React Hook Form + Zod (`src/utils/validation.ts`) with validation for negative rent/electricity/payment, meter-reading-vs-previous, phone/email format, duplicate-prevention is enforced by DB unique constraints and surfaced via `src/utils/errors.ts` (`friendlyError`) which translates Postgres error codes into plain-language messages.
- HashRouter is used throughout for GitHub Pages static hosting compatibility.

## Setting up Supabase

See `SETUP.md` for the full walkthrough: create a project → run the 4 numbered migrations in the SQL editor (or `supabase db push`) → enable email auth → configure storage (already scripted) → sign up as the first owner from `/login` → optionally run the seed script.

## GitHub Pages deploy

`.github/workflows/deploy.yml` runs typecheck → lint → test → build → `actions/deploy-pages` on every push to `main`, using `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` repository secrets. `vite.config.ts` sets `base: '/TenantRentManager/'`.

## Environment variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

(`.env.example` provided; `.env` is gitignored; no service-role key anywhere in frontend code.)

## Tests run and results

```
npm run typecheck   → passes, 0 errors
npm run lint (oxlint) → passes, 0 errors (5 informational warnings only)
npm run test (vitest) → 22/22 tests passing
npm run build        → succeeds, dist/ produced
```

Unit tests (`src/utils/billing.test.ts`) cover: electricity unit calculation (including negative-units rejection and meter-reset), rent increase (percentage and fixed), total-due composition, positive/negative balance carry-forward, multiple-payment summing without float drift, bill status transitions, idempotent billing-month key generation (duplicate-bill-prevention logic), rent-revision effective-date selection, and receipt-number formatting/uniqueness.

## Known limitations

- Manager/tenant onboarding (linking a new `auth.users` row to `profiles.role`/`owner_id` and to a `tenants` row) is a manual SQL step in this version — a production deployment should add a Supabase Edge Function using the service-role key (server-side only) to send proper email invites.
- Reports page is deliberately simple (summary cards + monthly due-vs-collected table + CSV export) rather than a full BI/chart dashboard.
- No browser/e2e test suite; testing focuses on the financial engine per the spec's priority on correctness of the billing logic.
- Global search is per-page (tenants/ledger/receipts) rather than one unified omnisearch bar.
- Late fees are entered manually per bill generation rather than driven by a configurable rules engine.

## Future improvements

- Supabase Edge Function-based manager/tenant email invites.
- Push notifications / reminders for upcoming rent revisions and unpaid bills.
- Richer reporting (occupancy trends, YoY comparisons, per-property P&L).
- Bulk CSV import for existing tenants/properties.
- Configurable late-fee rules (grace period, daily/flat/percentage).
