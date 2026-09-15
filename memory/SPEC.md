# RentBook — in-place enhancements (current deliverable)

## Current approval and architecture
The user explicitly approved applying all four proposals to the existing app without rebuilding it. Highest priority: keep the existing Supabase project and all existing values. No migrations, schema/policy changes, resets or replacement data.

- Actual stack is the original React 19 + TypeScript + Tailwind 4 + Supabase JS repository in `/app/src`, not the generic FastAPI template. There is no local backend or `/api` router. Preserve services under `src/services` and original Supabase auth/session storage.
- `/app/frontend` symlinks to `/app` only to satisfy the read-only supervisor program directory. The restored frontend program runs Vite on port 3000, root base in development. The old static Python blueprint server has been stopped.
- Vite watcher must retain `followSymlinks: false` and compatibility-directory exclusions to avoid ELOOP crashes. Preview ingress hosts include `.preview.emergentcf.cloud` as well as `.preview.emergentagent.com`.
- User authorised reusing the same public URL and anon key from the live site. These are in ignored `.env.local`, project ref `tlyxkafuztyavkeolkjh`. No service role key exists here.
- Preview: https://insights-lab-10.preview.emergentagent.com

## Implemented flows
- Warm-neutral aliases remove slate/cream drift across existing utilities; inputs, buttons, chart palette, scrollbars and PWA metadata updated. Playfair Display, Lora, DM Sans and JetBrains Mono are loaded. Light/dark preferences and reduced-motion support remain.
- Public `/` marketing page links to real sign-in/signup. Its meter calculator explicitly uses SAMPLE data, saves nothing, and is separate from actual portfolio values.
- BrowserRouter uses Vite base, retaining old `#/...` bookmarks including invite queries. Supabase token hashes are not treated as routes. Clean invitation/reset URLs, per-route titles, canonical/meta and private-route noindex. Known routes get static HTML entry files at build for GitHub Pages. Unknown nested URLs use a 404 restore bridge; a rewrite-capable host is still preferable for genuine nested-route 200s. Production default base remains `/TenantRentManager/`, configurable with `VITE_BASE_PATH=/`.
- Money Cockpit: explicit selected billing month/property; ring, six-month sparklines, bill/collection/outstanding KPI cards, real needs-attention tenant links, occupancy and activity. Collected amounts refer to payments against the selected billing cohort, NOT cash received by calendar payment date. Ring caps payments applied per bill so one tenant's excess credit cannot conceal another's outstanding amount. Current occupancy is labelled independently. API failures surface instead of becoming fake zeros.
- Shared QuickMeterDial in BillingPage, GenerateBillModal and EditBillModal: slider, exact decimal input, +/- buttons, live units and paise-rounded INR preview, invalid reading protection. Meter reset, rate overrides, explanations and deferred electricity options remain available. Slider changes are local only until explicit submission through original services/RPCs.
- Bulk generation validates before writing and checks existing bills BEFORE touching their meter readings. Existing unique constraints/RPCs remain. Cross-browser simultaneous generation is not made transactional by the UI guard.

## Data and auth
Existing Postgres tables/types: profiles, properties, rooms, tenants, bills, electricity_readings, rent_revisions, payments, receipts, expenses, managers/permissions, tenant_documents. Types in `src/types/database.ts`. No database shape changes.
Roles remain owner (portfolio), manager (property/action scope via RLS), tenant (self-service). Email/mobile + password login uses original Supabase client. Profile failures fail closed, role loading finishes before navigation, query cache clears on sign-out. Signup displays email confirmation when required; no fake login fallback.
User authorised creating a separate test owner. Check `memory/test_credentials.md` for actual result and credentials. Never write to other owners' data or seed their properties. Supabase email delivery and URL allowlists must be confirmed before production release.

## Verification
Typecheck and production build passed; all 50 existing/new Vitest tests passed. Public ingress route curls, real Supabase auth settings, anonymous RLS isolation and missing-key rejection passed. The latest user-provided login is verified; the main browser flow created only the QA TEST property and confirmed persisted session and billing access. Independent extended checks are pending.
Run `cd /app/frontend && yarn typecheck`, existing Vitest suites and enhancements tests (meter arithmetic/UI, collection accounting, legacy route safety, repeated bill-generation preservation), production Vite build, public-preview browser and curl checks, and actual Supabase settings/RLS API checks. Authenticated end-to-end coverage depends on test-owner signup/confirmation. Do not claim production certification without that coverage.

---
## Archived proposal context (superseded by the implementation approval above)

## What this pod hosts
The user's own repository "Room Rent Manager / TenantRentManager" (React 19 + Vite + Tailwind v4 + Supabase)
lives at /app — INTENTIONALLY UNMODIFIED. The user explicitly said "I don't want you to rebuild this";
they asked for a detailed design/UX enhancement proposal instead.

## Deliverable
`/app/design-blueprint/index.html` — a self-contained interactive "Design Audit & Enhancement Blueprint"
case-study page (vanilla HTML/CSS/JS, zero build step, no dependencies on the repo).

- Served by: `python3 -m http.server 3000 --directory /app/design-blueprint` (started via execute_bash background;
  the supervisor `frontend` program is FATAL by design because /app/frontend does not exist in this pod).
- Public URL: https://insights-lab-10.preview.emergentagent.com
- Design direction: "Warm Ledger 2.0" (evolves the app's existing teal #0F766E / marigold #D97706 /
  paper-cream #FAF7F0 language; Playfair Display + Lora + DM Sans + JetBrains Mono).
- Sections: hero with live KPI tile → 4-dimension UX audit scorecards → design-system spec (palette,
  type, radius/elevation/motion tokens) → interactive before/after component lab (KPI card, meter entry,
  ledger rows; body class `lab-after` toggles) → high-fidelity dashboard "Money Cockpit" concept mock →
  motion & micro-interaction demos (count-up, swipe row, ripple, bottom sheet) → page-by-page matrix →
  visibility/SEO track + copy-paste token patch → 3-phase roadmap.
- Light/dark toggle persisted in localStorage key `rbp-theme`; prefers-reduced-motion honored.
- No backend, no /api routes, no auth. No data stored.

## Interactivity inventory (data-testids)
theme-toggle, site-nav / nav-link-*, hero-cta-*, lab-toggle-before/after, meter-slider (+ meter-current-value,
meter-total), property-switcher spans, quick-action-generate-bills, swipe-demo-row, ripple-demo-button,
sheet-open-button / sheet-close-button / sheet-done-button, dashboard-concept-mock, trend-chart,
needs-attention-list, token-patch-code, roadmap-phase-1/2/3.

## Superseded proposal-only restrictions
The prior no-code-change / static-server restrictions ended when the user approved all four in-place changes. Keep the blueprint file as an archive, not as the served homepage.
