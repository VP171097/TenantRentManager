# SPEC — RentBook Design Blueprint (deliverable)

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

## Do NOT
- Modify anything in /app/src, /app/index.html, /app/supabase, or the user's repo generally.
- Kill the static server or bind anything else to port 3000.
