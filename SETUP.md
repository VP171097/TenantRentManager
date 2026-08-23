# Setup Guide

Step-by-step instructions to get Room Rent Manager running against your own Supabase project and deployed to GitHub Pages.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project (choose a region close to your tenants, e.g. Mumbai/Singapore for India).
2. Once provisioned, open **Project Settings → API** and note down:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
   - Never copy the **service_role** key into this project — it must never be used in frontend code.

## 2. Run the database migrations

In the Supabase dashboard, open **SQL Editor** and run the files in `supabase/migrations/` **in order**:

1. `001_schema.sql` — tables, indexes, constraints, and the core billing functions.
2. `002_rls_policies.sql` — Row Level Security policies for owners/managers/tenants.
3. `003_storage.sql` — creates the private `tenant-documents` storage bucket and its policies.
4. `004_auth_triggers.sql` — auto-creates a `profiles` row on signup, plus the move-out settlement function.

(`005_seed_demo_data.sql` is optional demo data — see step 6.)

Alternatively, using the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

## 3. Configure Auth

1. In **Authentication → Providers**, ensure **Email** is enabled.
2. In **Authentication → URL Configuration**, add your GitHub Pages URL (e.g. `https://<user>.github.io/TenantRentManager/`) to the allowed redirect URLs.
3. For simplicity this app uses email/password auth. Owners sign up directly from the `/login` page (role `owner` is set automatically). Managers and tenants should be created by the owner (see below) — their `profiles.role` and `owner_id` are set via signup metadata by an invite flow you run server-side, or manually in the SQL editor for now:

```sql
-- After a manager/tenant creates their auth user (e.g. via Supabase's
-- "invite user" in the dashboard, or your own signup flow), link them:
update profiles set role = 'manager', owner_id = '<owner-profile-uuid>'
where id = '<new-user-uuid>';

-- For a tenant, also link the tenants row so they see only their own data:
update tenants set profile_id = '<new-user-uuid>' where id = '<tenant-row-uuid>';
```

A production deployment should replace this manual step with a Supabase Edge Function (using the service-role key, never exposed to the browser) that owners call to invite managers/tenants by email.

## 4. Storage

The `tenant-documents` bucket is created and policy-protected by `003_storage.sql`. No public access is granted — files are only reachable via signed URLs generated for authorized users (see `DocumentUploader.tsx` / `getSignedDocumentUrl`).

## 5. Create your first owner account

1. Run the app locally (`npm run dev`) or use the deployed site.
2. Go to `/login`, switch to "New owner? Create an account", and sign up with your email/password.
3. This creates both an `auth.users` row and a linked `profiles` row with `role = 'owner'` (via the `on_auth_user_created` trigger).

## 6. (Optional) Load demo data

After creating your first owner account, run `supabase/migrations/005_seed_demo_data.sql` in the SQL editor. It creates a demo property "Krishna Residency" with rooms 101/102/103/204 and three tenants (Rahul Sharma, Amit Kumar, Neha Singh) with a realistic multi-month billing history: one fully paid, one partially paid with an old outstanding balance and an upcoming rent increase, and one with multiple partial payments resulting in credit.

## 7. Local development

```bash
npm install
cp .env.example .env
# edit .env with your VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

## 8. Deploy to GitHub Pages

1. In your GitHub repo, go to **Settings → Pages** and set the source to **GitHub Actions**.
2. Add repository secrets under **Settings → Secrets and variables → Actions**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Push to `main` (or run the workflow manually) — `.github/workflows/deploy.yml` builds and publishes `dist/` automatically.
4. `vite.config.ts` sets `base: '/TenantRentManager/'` to match this repo name; update it if you rename the repo or deploy under a different path.

## Troubleshooting

- **Blank page after deploy**: check the browser console for a Supabase env var warning — the GitHub secrets may not be set.
- **"You don't have permission to do this"**: RLS is working as intended — check the user's `profiles.role`/`owner_id` and, for managers, their `manager_permissions` row for that property.
- **Duplicate bill errors**: this is expected — bill generation is idempotent by design (`unique(tenant_id, billing_month)`).
