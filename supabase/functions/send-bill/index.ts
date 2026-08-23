// Supabase Edge Function: send-bill
//
// Sends a tenant's bill via WhatsApp (always) and, if the tenant has an
// email on file, also via email (Resend) with the bill PDF attached.
//
// SECRETS (set via `supabase secrets set NAME=value`, never as VITE_
// frontend env vars — see supabase/functions/README.md):
//   RESEND_API_KEY        - Resend API key
//   RESEND_FROM_EMAIL     - verified sender address (or Resend's test sender)
//   WHATSAPP_ACCESS_TOKEN - Meta WhatsApp Cloud API access token
//   WHATSAPP_PHONE_NUMBER_ID - Meta WhatsApp Cloud API phone number id
//   WHATSAPP_API_VERSION  - optional, defaults to 'v20.0'
//
// The frontend generates the bill PDF client-side (src/services/billPdf.ts,
// reusing the same jsPDF + qrcode logic used for the manual "Download Bill
// PDF" button) and passes it here as base64 (`pdfBase64`) rather than this
// function regenerating it — PDF/QR generation is far simpler with the
// existing browser-side libraries than reimplementing it in Deno.
//
// This function uses the SERVICE ROLE key to bypass RLS for the lookups
// and the WhatsApp/email sends, but ONLY after verifying (via the caller's
// own JWT, against a request-scoped anon client) that the caller is
// authorized to send bills for this tenant's property — either the owner,
// or a manager with `can_generate_receipts` on that property. Do not widen
// this authorization check without re-reading it carefully.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

interface SendBillBody {
  billId: string
  pdfBase64?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401)

    const body = (await req.json().catch(() => null)) as SendBillBody | null
    if (!body?.billId) return jsonResponse({ error: 'billId is required' }, 400)

    // Request-scoped client: runs AS the caller, so RLS applies. Used only
    // to authenticate the caller and to check they can actually see this
    // bill/property (which mirrors the real authorization rules instead of
    // re-implementing them here).
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userErr,
    } = await callerClient.auth.getUser()
    if (userErr || !user) return jsonResponse({ error: 'Not authenticated' }, 401)

    // If the caller can read the bill under their own RLS policies, they're
    // authorized (owner_all policy, or manager with can_view_ledger, etc).
    // We additionally require can_generate_receipts-equivalent access by
    // checking the bill is visible AND the caller is owner or a manager
    // with can_generate_receipts on that property.
    const { data: visibleBill, error: billErr } = await callerClient
      .from('bills')
      .select('id, property_id, tenant_id')
      .eq('id', body.billId)
      .maybeSingle()
    if (billErr) return jsonResponse({ error: billErr.message }, 500)
    if (!visibleBill) return jsonResponse({ error: 'Bill not found or not accessible' }, 404)

    const { data: profileRow } = await callerClient.from('profiles').select('role').eq('id', user.id).maybeSingle()
    const role = (profileRow as any)?.role
    if (role === 'manager') {
      const { data: perm } = await callerClient
        .from('manager_permissions')
        .select('can_generate_receipts, manager_id, managers!inner(profile_id)')
        .eq('property_id', (visibleBill as any).property_id)
        .maybeSingle()
      if (!perm || !(perm as any).can_generate_receipts) {
        return jsonResponse({ error: 'You do not have permission to send bills for this property.' }, 403)
      }
    } else if (role !== 'owner') {
      return jsonResponse({ error: 'Only the owner or an authorized manager can send bills.' }, 403)
    }

    // Authorization confirmed — now use the service-role client for the
    // actual privileged lookups and the outbound sends.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: bill, error: bErr } = await admin.from('bills').select('*').eq('id', body.billId).single()
    if (bErr || !bill) return jsonResponse({ error: 'Bill not found.' }, 404)

    const { data: tenant, error: tErr } = await admin.from('tenants').select('*').eq('id', bill.tenant_id).single()
    if (tErr || !tenant) return jsonResponse({ error: 'Tenant not found.' }, 404)

    const { data: property } = await admin.from('properties').select('*').eq('id', bill.property_id).single()
    const { data: owner } = await admin.from('profiles').select('upi_id').eq('id', property?.owner_id).maybeSingle()
    const upiId: string | null = (owner as any)?.upi_id ?? null

    const balance = bill.balance > 0 ? bill.balance : 0
    const monthLabel = new Date(bill.billing_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    const totalDue = Number(bill.total_due).toFixed(2)
    const balanceStr = Number(balance).toFixed(2)

    const result: { whatsapp?: string; email?: string } = {}

    // ---- WhatsApp (always attempted) ----
    try {
      await sendWhatsApp({
        toPhone: tenant.phone,
        tenantName: tenant.full_name,
        monthLabel,
        totalDue,
        balanceStr,
        upiId,
      })
      result.whatsapp = 'sent'
    } catch (err) {
      result.whatsapp = `failed: ${(err as Error).message}`
    }

    // ---- Email (only if tenant has an email on file) ----
    if (tenant.email) {
      try {
        await sendEmail({
          toEmail: tenant.email,
          tenantName: tenant.full_name,
          propertyName: property?.name ?? '',
          monthLabel,
          totalDue,
          balanceStr,
          upiId,
          pdfBase64: body.pdfBase64,
        })
        result.email = 'sent'
      } catch (err) {
        result.email = `failed: ${(err as Error).message}`
      }
    } else {
      result.email = 'skipped: no email on file'
    }

    return jsonResponse({ success: true, ...result })
  } catch (err) {
    return jsonResponse({ error: (err as Error).message ?? 'Unexpected error' }, 500)
  }
})

async function sendWhatsApp(opts: {
  toPhone: string
  tenantName: string
  monthLabel: string
  totalDue: string
  balanceStr: string
  upiId: string | null
}) {
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  const apiVersion = Deno.env.get('WHATSAPP_API_VERSION') || 'v20.0'
  if (!token || !phoneNumberId) throw new Error('WhatsApp is not configured (missing secrets).')

  let to = opts.toPhone.trim()
  if (!to.startsWith('+')) to = `+91${to.replace(/\D/g, '')}`
  to = to.replace(/[^\d+]/g, '')

  const lines = [
    `Hi ${opts.tenantName}, here is your rent bill for ${opts.monthLabel}.`,
    `Total due: ₹${opts.totalDue}`,
    `Outstanding balance: ₹${opts.balanceStr}`,
  ]
  if (opts.upiId) lines.push(`Pay via UPI: ${opts.upiId}`)

  // NOTE: sending free-form text messages outside a 24-hour customer-
  // initiated conversation window is only permitted by Meta for
  // demonstration/testing. Production use requires a pre-approved message
  // template. Swapping to a template is a one-line change: replace the
  // `text` payload below with e.g.
  //   { messaging_product: 'whatsapp', to, type: 'template',
  //     template: { name: 'bill_notification', language: { code: 'en' }, components: [...] } }
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: lines.join('\n') },
  }

  const res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`WhatsApp API error (${res.status}): ${text}`)
  }
}

async function sendEmail(opts: {
  toEmail: string
  tenantName: string
  propertyName: string
  monthLabel: string
  totalDue: string
  balanceStr: string
  upiId: string | null
  pdfBase64?: string
}) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')
  if (!apiKey || !fromEmail) throw new Error('Email is not configured (missing secrets).')

  const html = `
    <div style="font-family:sans-serif;max-width:480px">
      <h2>${opts.propertyName}</h2>
      <p>Hi ${opts.tenantName},</p>
      <p>Here is your rent bill for <strong>${opts.monthLabel}</strong>.</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:4px 0">Total due</td><td style="text-align:right">₹${opts.totalDue}</td></tr>
        <tr><td style="padding:4px 0">Outstanding balance</td><td style="text-align:right">₹${opts.balanceStr}</td></tr>
      </table>
      ${opts.upiId ? `<p>Pay via UPI: <strong>${opts.upiId}</strong> (see attached bill for a scannable QR code).</p>` : ''}
      <p style="color:#888;font-size:12px">This is a computer-generated bill.</p>
    </div>`

  const attachments = opts.pdfBase64
    ? [{ filename: `Bill-${opts.monthLabel.replace(/\s+/g, '_')}.pdf`, content: opts.pdfBase64 }]
    : undefined

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromEmail,
      to: opts.toEmail,
      subject: `Rent bill for ${opts.monthLabel} - ${opts.propertyName}`,
      html,
      attachments,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Resend API error (${res.status}): ${text}`)
  }
}
