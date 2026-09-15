# Supabase Edge Functions

Server-side (Deno) functions — the only place the Supabase **service-role**
key is used. Deploy and configure them via the Supabase CLI; see
[SETUP.md](../../SETUP.md#9-set-up-send-bill-whatsapp--email-and-tenant-logins-phoneemail)
for full step-by-step instructions written for a non-technical owner.

## Functions

- **`send-bill`** — sends a tenant's bill via WhatsApp (Meta WhatsApp
  Business Platform / Cloud API, always) and, if the tenant has an email on
  file, also via email (Resend) with the bill PDF attached. Requires
  secrets: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, optionally
  `WHATSAPP_API_VERSION`, `WHATSAPP_TEMPLATE_BILL`,
  `WHATSAPP_TEMPLATE_REMINDER`, `WHATSAPP_TEMPLATE_RECEIPT`,
  `WHATSAPP_TEMPLATE_LANG`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`. See
  "WhatsApp Business setup" below — WhatsApp sends will fail until you've
  created a WhatsApp Business Platform app and gotten the three message
  templates approved.

## WhatsApp Business setup

WhatsApp sends go through Meta's **WhatsApp Business Platform** (Cloud
API), using pre-approved **message templates** — required by Meta for
sending a bill/reminder/receipt unprompted (free-form text only works
within 24 hours of the tenant messaging you first, or to test numbers you
add yourself, so it's not usable for real tenants). Do this once:

1. **Create a Meta Business Account** at [business.facebook.com](https://business.facebook.com)
   if you don't already have one (needs your own email/phone; I can't do
   this step for you).
2. **Create a WhatsApp Business Platform app**: in Meta Business Manager,
   go to "WhatsApp" -> "Get Started" (or create an app at
   [developers.facebook.com](https://developers.facebook.com) and add the
   WhatsApp product to it). Meta gives you a free test phone number to
   start — you can add your real business number later once you're ready
   to go live.
3. **Get your credentials**: in WhatsApp Manager -> API Setup, you'll see
   a **Phone number ID** (this is `WHATSAPP_PHONE_NUMBER_ID`) and can
   generate a **permanent access token** under System Users (this is
   `WHATSAPP_ACCESS_TOKEN` — the temporary 24-hour token shown by default
   on that page will expire and break sending, so generate a permanent one).
4. **Submit these three message templates for approval** (WhatsApp
   Manager -> Message Templates -> Create Template, category "Utility",
   language "English (US)"). Approval is usually same-day. Use these exact
   names (or set the `WHATSAPP_TEMPLATE_*` secrets to whatever you name
   them instead):

   | Template name | Body |
   |---|---|
   | `rent_bill` | `Hi {{1}}, here is your rent bill for {{2}}. Total due: ₹{{3}}. Outstanding balance: ₹{{4}}. {{5}}` |
   | `rent_reminder` | `Hi {{1}}, this is a reminder that your rent for {{2}} is still due. Outstanding: ₹{{3}}.` |
   | `payment_receipt` | `Hi {{1}}, we've received your payment of ₹{{2}} for {{3}}. Receipt #{{4}}. Outstanding balance: ₹{{5}}.` |

   ({{n}} are WhatsApp's numbered variable placeholders — add them as
   "Body" variables when creating the template; Meta will ask you for a
   sample value for each, e.g. "Ramesh Kumar", "September 2026", "4500".)
5. Set all the secrets below, then redeploy `send-bill`.

Until the templates are approved, `send-bill`'s WhatsApp step will fail
with a WhatsApp API error (visible in the app as `whatsapp: failed: ...`)
— email (if the tenant has one on file) still sends independently.
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
# Optional — only needed if you named your approved templates differently
# from the defaults (rent_bill / rent_reminder / payment_receipt) or use a
# non-English template language:
npx supabase secrets set WHATSAPP_TEMPLATE_BILL=rent_bill --project-ref <your-project-ref>
npx supabase secrets set WHATSAPP_TEMPLATE_REMINDER=rent_reminder --project-ref <your-project-ref>
npx supabase secrets set WHATSAPP_TEMPLATE_RECEIPT=payment_receipt --project-ref <your-project-ref>
npx supabase secrets set WHATSAPP_TEMPLATE_LANG=en_US --project-ref <your-project-ref>
npx supabase secrets set RESEND_API_KEY=... --project-ref <your-project-ref>
npx supabase secrets set RESEND_FROM_EMAIL=... --project-ref <your-project-ref>
```

(If you're setting these via the Supabase Dashboard instead of the CLI —
Edge Functions -> `send-bill` -> Secrets — the same names apply; only add
the `WHATSAPP_TEMPLATE_*` ones if you actually need non-default values.)

Never set these as `VITE_...` variables — that would expose them in the
frontend bundle. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` are provided automatically to every Edge
Function and do not need to be set manually.
