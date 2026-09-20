import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const enabled = process.env.E2E_DEEP_TESTS === 'true'
const ownerEmail = process.env.E2E_OWNER_EMAIL
const ownerPassword = process.env.E2E_OWNER_PASSWORD
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

function appPath(route: string) {
  return route === '/' ? './' : route.slice(1)
}

async function login(page: Page) {
  await page.goto(appPath('/login'), { waitUntil: 'domcontentloaded' })
  await page.getByTestId('login-owner-mode').click()
  await page.getByTestId('login-email').fill(ownerEmail!)
  await page.getByTestId('login-password').fill(ownerPassword!)
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/, { timeout: 20_000 })
}

async function ownerClient() {
  const client = createClient(supabaseUrl!, supabaseKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const { error } = await client.auth.signInWithPassword({ email: ownerEmail!, password: ownerPassword! })
  if (error) throw error
  return client
}

function monthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

test.describe('deep functional rental lifecycle', () => {
  test.skip(!enabled || !ownerEmail || !ownerPassword || !supabaseUrl || !supabaseKey, 'Enable E2E_DEEP_TESTS with Supabase/owner credentials to run database-backed lifecycle tests.')
  test.describe.configure({ mode: 'serial' })

  test('property → room → tenant → bill → payment → receipt persists end-to-end', async ({ page }) => {
    const db = await ownerClient()
    let propertyId: string | undefined

    const stamp = Date.now()
    const propertyName = `E2E Property ${stamp}`
    const propertyCode = `E2E${String(stamp).slice(-6)}`
    const roomNumber = `E2E-${String(stamp).slice(-5)}`
    const tenantName = `E2E Tenant ${stamp}`
    const tenantEmail = `e2e-${stamp}@example.invalid`

    try {
      await login(page)

      // 1. Property creation + database persistence.
      await page.goto(appPath('/properties'), { waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: /add property/i }).click()
      await page.getByLabel('Property name').fill(propertyName)
      await page.getByLabel(/Code \(used in receipt numbers\)/).fill(propertyCode)
      await page.getByLabel('Address').fill('E2E Test Address')
      await page.getByLabel('City').fill('QA City')
      await page.getByRole('button', { name: 'Create Property' }).click()
      await expect(page.getByText(propertyName)).toBeVisible({ timeout: 15_000 })

      const { data: property, error: propertyError } = await db
        .from('properties')
        .select('id,name,code,city')
        .eq('name', propertyName)
        .eq('code', propertyCode)
        .maybeSingle()
      expect(propertyError).toBeNull()
      expect(property).toBeTruthy()
      propertyId = property!.id
      expect(property!.city).toBe('QA City')

      // 2. Room creation + persistence.
      await page.getByText(propertyName).click()
      await expect(page).toHaveURL(new RegExp(`/properties/${propertyId}`))
      await page.getByRole('button', { name: /add room/i }).click()
      await page.getByLabel('Room number').fill(roomNumber)
      await page.getByLabel('Floor').fill('1')
      await page.getByLabel(/Base rent/).fill('5000')
      await page.getByLabel(/Electricity Rate/).fill('10')
      await page.getByRole('button', { name: 'Add Room' }).click()
      await expect(page.getByText(`Room ${roomNumber}`)).toBeVisible({ timeout: 15_000 })

      const { data: room, error: roomError } = await db
        .from('rooms')
        .select('id,property_id,room_number,base_rent,status,electricity_enabled,electricity_rate')
        .eq('property_id', propertyId)
        .eq('room_number', roomNumber)
        .maybeSingle()
      expect(roomError).toBeNull()
      expect(room).toBeTruthy()
      expect(room!.base_rent).toBe(5000)
      expect(room!.status).toBe('vacant')
      expect(room!.electricity_enabled).toBe(true)
      expect(room!.electricity_rate).toBe(10)

      // 3. Tenant creation + room occupancy + rent revision persistence.
      await page.goto(appPath('/tenants'), { waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: /add tenant/i }).click()
      await page.getByLabel('Full name').fill(tenantName)
      await page.getByLabel('Email (optional)').fill(tenantEmail)
      await page.getByLabel('Property').selectOption(propertyId!)
      await expect(page.getByLabel('Room')).toBeEnabled()
      await page.getByLabel('Room').selectOption(room!.id)
      await page.getByLabel('Move-in date').fill(new Date().toISOString().slice(0, 10))
      await page.getByLabel(/Security deposit/).fill('5000')
      await page.getByLabel(/Monthly rent/).fill('5000')
      await page.getByLabel(/Starting Electricity Unit/).fill('100')
      await page.getByLabel(/Electricity Rate/).fill('10')
      await page.getByRole('button', { name: 'Add Tenant' }).click()
      await expect(page.getByText(tenantName)).toBeVisible({ timeout: 15_000 })

      const { data: tenant, error: tenantError } = await db
        .from('tenants')
        .select('id,property_id,room_id,full_name,status,initial_rent,electricity_rate')
        .eq('property_id', propertyId)
        .eq('full_name', tenantName)
        .maybeSingle()
      expect(tenantError).toBeNull()
      expect(tenant).toBeTruthy()
      expect(tenant!.room_id).toBe(room!.id)
      expect(tenant!.status).toBe('active')

      const { data: occupiedRoom } = await db.from('rooms').select('status').eq('id', room!.id).single()
      expect(occupiedRoom!.status).toBe('occupied')

      const { data: revision } = await db
        .from('rent_revisions')
        .select('tenant_id,rent_amount')
        .eq('tenant_id', tenant!.id)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle()
      expect(revision?.tenant_id).toBe(tenant!.id)
      expect(revision?.rent_amount).toBe(5000)

      // 4. Billing with electricity reading.
      await page.goto(appPath('/billing'), { waitUntil: 'domcontentloaded' })
      await page.getByTestId('billing-property').selectOption(propertyId!)
      await expect(page.getByTestId(`billing-tenant-${tenant!.id}`)).toBeVisible({ timeout: 15_000 })
      await page.getByTestId(`billing-meter-${tenant!.id}-current`).fill('120')
      await page.getByTestId('billing-generate').click()
      await expect(page.getByTestId('billing-success')).toContainText('Generated/confirmed 1 bill', { timeout: 20_000 })

      const billingMonth = monthKey()
      const { data: bill, error: billError } = await db
        .from('bills')
        .select('id,tenant_id,property_id,room_id,rent_amount,electricity_charge,total_due,total_paid,balance')
        .eq('tenant_id', tenant!.id)
        .eq('billing_month', billingMonth)
        .maybeSingle()
      expect(billError).toBeNull()
      expect(bill).toBeTruthy()
      expect(bill!.rent_amount).toBe(5000)
      expect(bill!.electricity_charge).toBe(200)
      expect(bill!.total_due).toBe(5200)
      expect(bill!.total_paid).toBe(0)
      expect(bill!.balance).toBe(5200)

      const { data: reading } = await db
        .from('electricity_readings')
        .select('tenant_id,previous_reading,current_reading,units_used,rate_per_unit,is_billed')
        .eq('tenant_id', tenant!.id)
        .eq('billing_month', billingMonth)
        .maybeSingle()
      expect(reading?.current_reading).toBe(120)
      expect(reading?.units_used).toBe(20)
      expect(reading?.rate_per_unit).toBe(10)
      expect(reading?.is_billed).toBe(true)

      // 5. Payment + ledger persistence.
      await page.goto(appPath('/payments'), { waitUntil: 'domcontentloaded' })
      await expect(page.getByLabel('Bill').locator(`option[value="${bill!.id}"]`)).toHaveCount(1)
      await page.getByLabel('Bill').selectOption(bill!.id)
      await page.getByLabel('Amount (₹)').fill('1000')
      await page.getByLabel('Payment date').fill(new Date().toISOString().slice(0, 10))
      await page.getByLabel('Method').selectOption('upi')
      await page.getByLabel('Reference (optional)').fill(`E2E-${stamp}`)
      await page.getByRole('button', { name: 'Record Payment' }).click()
      await expect(page.getByText(tenantName)).toBeVisible({ timeout: 15_000 })

      const { data: payment, error: paymentError } = await db
        .from('payments')
        .select('id,bill_id,tenant_id,amount,method,is_approved,reference')
        .eq('bill_id', bill!.id)
        .eq('reference', `E2E-${stamp}`)
        .maybeSingle()
      expect(paymentError).toBeNull()
      expect(payment).toBeTruthy()
      expect(payment!.amount).toBe(1000)
      expect(payment!.method).toBe('upi')
      expect(payment!.is_approved).toBe(true)

      const { data: updatedBill } = await db
        .from('bills')
        .select('total_paid,balance')
        .eq('id', bill!.id)
        .single()
      expect(updatedBill!.total_paid).toBe(1000)
      expect(updatedBill!.balance).toBe(4200)

      // 6. Receipt generation and integrity: receipt must point to the same payment.
      const paymentRow = page.locator('div.card').filter({ hasText: tenantName }).filter({ hasText: '₹1,000' }).first()
      await expect(paymentRow.getByRole('button', { name: /receipt/i })).toBeVisible({ timeout: 10_000 })
      await paymentRow.getByRole('button', { name: /receipt/i }).click()

      const { data: receipt, error: receiptError } = await db
        .from('receipts')
        .select('id,payment_id,bill_id,tenant_id,property_id,receipt_number')
        .eq('payment_id', payment!.id)
        .maybeSingle()
      expect(receiptError).toBeNull()
      expect(receipt).toBeTruthy()
      expect(receipt!.payment_id).toBe(payment!.id)
      expect(receipt!.bill_id).toBe(bill!.id)
      expect(receipt!.tenant_id).toBe(tenant!.id)
      expect(receipt!.property_id).toBe(propertyId)
      expect(receipt!.receipt_number).toMatch(new RegExp(`^${propertyCode}-`))

      // 7. Ledger must expose the same financial state after a reload.
      await page.goto(appPath('/ledger'), { waitUntil: 'domcontentloaded' })
      await expect(page.getByText(tenantName)).toBeVisible({ timeout: 15_000 })
      const ledgerRow = page.locator('tr').filter({ hasText: tenantName }).first()
      await expect(ledgerRow).toContainText('₹5,200')
      await expect(ledgerRow).toContainText('₹1,000')
      await expect(ledgerRow).toContainText('₹4,200')
    } finally {
      // Cleanup only the uniquely created property. RLS still applies because this
      // client is authenticated as the test owner; no service-role key is used.
      if (propertyId) {
        const { error } = await db.from('properties').delete().eq('id', propertyId)
        if (error) throw error
      }
      await db.auth.signOut()
    }
  })
})
