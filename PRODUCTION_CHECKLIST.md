# RentBook release checks

## Data preservation
The preview uses the SAME project URL/public anon key as the original live website, recovered with the user's permission. No migrations, SQL edits, service-role keys or existing-record resets are required. Keep the existing project values in deployment environment variables. Take a provider-side backup before any production rollout; this UI change does not create one.

## Routing
- Default production base remains `/TenantRentManager/` for the current GitHub Pages site. Root hosts: build with `VITE_BASE_PATH=/`.
- The build emits real entry files for known paths and a 404 bridge for dynamic detail paths. GitHub Pages still responds 404 on an unknown nested detail URL before redirecting; private pages are noindex. For direct nested-route 200 responses, the host must serve `index.html` on unknown application routes, excluding assets.
- Public home has meaningful HTML before JavaScript, metadata and clean links. Private pages must remain protected and noindex; crawlability is not permission to expose financial records.
- Old hash bookmarks are migrated; Supabase auth token fragments remain available to the client.

## Supabase Auth — owner action
Supabase Dashboard → Authentication → URL Configuration. Keep the existing production Site URL and existing allowed redirects. Add exact clean redirect URLs for each host in use:
- `https://vp171097.github.io/TenantRentManager/login`
- `https://vp171097.github.io/TenantRentManager/reset-password`
- `https://insights-lab-10.preview.emergentagent.com/login`
- `https://insights-lab-10.preview.emergentagent.com/reset-password`

Verify confirmation and recovery emails end-to-end with an inbox you control. No project settings have been changed automatically.

## If a test account requires email confirmation
Use Supabase Dashboard → Authentication → Users → Add user → Create new user. Supply a dedicated test email/password and enable Auto Confirm. Ensure your existing new-user trigger creates a `profiles` row with matching auth UUID, `role=owner`, and `full_name=RentBook QA` (inspect the app's existing setup instructions; do not alter the trigger for a test). Alternatively sign up normally with an inbox you control and click the confirmation email. Share only the temporary test login, never service-role keys. Keep test data in that account only.

## Release gate
GitHub Actions requires the tracked root `yarn.lock` and `package.json` together. The workflow validates its presence before setting up Yarn caching, then uses `yarn install --frozen-lockfile`. A missing lockfile is a checkout/commit issue, not a Supabase issue. Keep the existing repository secrets; this fix does not change them.

Check all owner/manager/tenant roles, real meter-save and bill totals, payment receipts, confirmation/reset links, RLS isolation, browser refresh/back/deep links, light/dark mobile layouts, and an actual production build. The new bulk guard preserves existing bills on repeated generation; true simultaneous multi-browser generation still relies on the existing database routines and must be transaction-tested before promising atomic batches. Changes here alone do not certify every legacy flow as production-ready.