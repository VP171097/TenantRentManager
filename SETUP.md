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

5. `006_fix_applicable_rent_month.sql`, `007_fix_bill_status_cast.sql` — small bug fixes, safe to run.
6. `008_owner_upi_and_tenant_login.sql` — adds the owner's UPI ID field (for rent payment QR codes) and a small RLS policy so tenants can see their own owner's UPI ID.

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

## 9. Set up Send Bill (WhatsApp + Email) and Tenant Logins (phone/email)

These two features need small pieces of server-side code ("Edge Functions") because they use secret keys that must never be placed in the app itself. This section is written for someone doing this from a phone or a basic computer — just follow the numbered steps in order.

### 9a. One-time setup of the Supabase CLI

You only need to do this once.

1. On a computer, open a terminal in the project folder.
2. Run `npx supabase login` — this opens a browser window; log in with the same account you used to create your Supabase project.
3. Run `npx supabase link --project-ref <your-project-ref>` — you can find `<your-project-ref>` in your Supabase project's URL or under **Project Settings → General**.

### 9b. Deploy the two Edge Functions

Run these two commands (each uploads one feature's server-side code):

```bash
npx supabase functions deploy send-bill --project-ref <your-project-ref>
npx supabase functions deploy create-tenant-login --project-ref <your-project-ref>
```

### 9c. Add the required secrets

These are set once, and are never visible in the app's code or to tenants. In the Supabase dashboard, go to **Edge Functions → Manage secrets** (or run the `supabase secrets set` commands below from the terminal).

For **Send Bill** (WhatsApp always; Email if the tenant has one on file):

| Secret | What it is | How to get it |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Meta WhatsApp Cloud API access token | 1. Go to [developers.facebook.com](https://developers.facebook.com) and create a free developer account/app. 2. Add the **WhatsApp** product to the app. 3. Under **WhatsApp → API Setup**, copy the temporary (or generate a permanent) access token. |
| `WHATSAPP_PHONE_NUMBER_ID` | The sending WhatsApp number's ID | Same **WhatsApp → API Setup** page, listed as "Phone number ID". |
| `WHATSAPP_API_VERSION` | Optional; defaults to `v20.0` | Only set this if Meta tells you to use a different version. |
| `RESEND_API_KEY` | Resend email API key | 1. Sign up for free at [resend.com](https://resend.com). 2. Go to **API Keys → Create API Key** and copy it. |
| `RESEND_FROM_EMAIL` | The "from" address on bill emails | Either verify your own domain in Resend (**Domains** tab) and use e.g. `bills@yourdomain.com`, or use Resend's test sender (`onboarding@resend.dev`) while trying things out — real tenant inboxes may mark test-sender emails as spam, so verify a domain before relying on this for real tenants. |

Set them via the terminal (repeat for each, replacing the value):

```bash
npx supabase secrets set WHATSAPP_ACCESS_TOKEN=your-token-here --project-ref <your-project-ref>
npx supabase secrets set WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id --project-ref <your-project-ref>
npx supabase secrets set RESEND_API_KEY=your-resend-key --project-ref <your-project-ref>
npx supabase secrets set RESEND_FROM_EMAIL=bills@yourdomain.com --project-ref <your-project-ref>
```

`create-tenant-login` needs no extra secrets — it uses the project's own service-role key, which Supabase provides automatically to every Edge Function.

**Important:** Never set any of these as `VITE_...` variables or in `.env` — those end up in the public frontend code. They must only be set as Edge Function secrets, exactly as above.

**Note on WhatsApp messages:** the free-form text message this app sends only works reliably within 24 hours of the tenant last messaging your WhatsApp Business number. For always-reliable delivery, Meta requires a pre-approved message template — this is a Meta/WhatsApp Business policy, not something this app can bypass. The code is written so switching to a template is a one-line change (see the comment in `supabase/functions/send-bill/index.ts`) once you've had a template approved in the Meta dashboard.

## Troubleshooting

- **Blank page after deploy**: check the browser console for a Supabase env var warning — the GitHub secrets may not be set.
- **"You don't have permission to do this"**: RLS is working as intended — check the user's `profiles.role`/`owner_id` and, for managers, their `manager_permissions` row for that property.
- **Duplicate bill errors**: this is expected — bill generation is idempotent by design (`unique(tenant_id, billing_month)`).
