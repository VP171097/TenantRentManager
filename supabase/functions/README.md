# Supabase Edge Functions

Server-side (Deno) functions — the only place the Supabase **service-role**
key is used. Deploy and configure them via the Supabase CLI; see
[SETUP.md](../../SETUP.md#9-set-up-send-bill-whatsapp--email-and-tenant-logins-phoneemail)
for full step-by-step instructions written for a non-technical owner.

## Functions

- **`send-bill`** — sends a tenant's bill via WhatsApp (Meta Cloud API, always)
  and, if the tenant has an email on file, also via email (Resend) with the
  bill PDF attached. Requires secrets: `WHATSAPP_ACCESS_TOKEN`,
  `WHATSAPP_PHONE_NUMBER_ID`, optionally `WHATSAPP_API_VERSION`,
  `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
- **`create-tenant-login`** — creates a Supabase Auth user for a tenant with
  an owner-chosen password and either an email or phone identifier (no SMS
  OTP required). Uses only the automatically-provided
  `SUPABASE_SERVICE_ROLE_KEY` — no extra secrets needed.

## Deploy

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase functions deploy send-bill --project-ref <your-project-ref>
npx supabase functions deploy create-tenant-login --project-ref <your-project-ref>
```

## Secrets

```bash
npx supabase secrets set WHATSAPP_ACCESS_TOKEN=... --project-ref <your-project-ref>
npx supabase secrets set WHATSAPP_PHONE_NUMBER_ID=... --project-ref <your-project-ref>
npx supabase secrets set RESEND_API_KEY=... --project-ref <your-project-ref>
npx supabase secrets set RESEND_FROM_EMAIL=... --project-ref <your-project-ref>
```

Never set these as `VITE_...` variables — that would expose them in the
frontend bundle. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` are provided automatically to every Edge
Function and do not need to be set manually.
