import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page, audience: 'owner' | 'tenant', email: string, password: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByTestId(audience === 'owner' ? 'login-audience-owner' : 'login-audience-tenant').click()
  await page.getByTestId('login-email').fill(email)
  await page.getByTestId('login-password').fill(password)
  await page.getByTestId('login-submit').click()
}

test.describe('owner business workflow smoke tests', () => {
  test('dashboard to core management sections', async ({ page }) => {
    const email = process.env.E2E_OWNER_EMAIL
    const password = process.env.E2E_OWNER_PASSWORD
    test.skip(!email || !password, 'Configure dedicated E2E owner credentials')

    await login(page, 'owner', email!, password!)
    await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/)

    const routes = [
      ['/properties', 'Properties'],
      ['/rooms', 'Rooms'],
      ['/tenants', 'Tenants'],
      ['/billing', 'A clearer month, one reading at a time.'],
      ['/payments', 'Payments'],
      ['/ledger', 'Ledger'],
      ['/receipts', 'Receipts'],
      ['/reports', 'Reports'],
    ] as const

    for (const [route, heading] of routes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toContainText(heading)
      await expect(page.locator('body')).not.toContainText(/Application error|Unhandled Runtime Error/i)
    }
  })

  test('property creation form validates required fields without writing invalid data', async ({ page }) => {
    const email = process.env.E2E_OWNER_EMAIL
    const password = process.env.E2E_OWNER_PASSWORD
    test.skip(!email || !password, 'Configure dedicated E2E owner credentials')

    await login(page, 'owner', email!, password!)
    await page.goto('/properties', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /add property/i }).click()

    const form = page.locator('form').last()
    await expect(form).toBeVisible()
    await form.getByRole('button', { name: /create property/i }).click()

    await expect(form).toContainText(/required|invalid/i)
  })
})

test.describe('tenant business workflow smoke tests', () => {
  test('tenant dashboard exposes payment, bill and maintenance actions', async ({ page }) => {
    const email = process.env.E2E_TENANT_EMAIL
    const password = process.env.E2E_TENANT_PASSWORD
    test.skip(!email || !password, 'Configure dedicated E2E tenant credentials')

    await login(page, 'tenant', email!, password!)
    await expect(page).toHaveURL(/\/tenant\/dashboard(?:[/?#]|$)/)

    await expect(page.locator('body')).toContainText(/Amount Due|Balance/)
    await expect(page.getByRole('button', { name: /make payment/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /report a problem/i })).toBeVisible()

    await page.getByRole('button', { name: /report a problem/i }).click()
    await expect(page.getByPlaceholder(/what's the problem/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /submit/i })).toBeDisabled()
  })

  test('tenant cannot access owner management routes', async ({ page }) => {
    const email = process.env.E2E_TENANT_EMAIL
    const password = process.env.E2E_TENANT_PASSWORD
    test.skip(!email || !password, 'Configure dedicated E2E tenant credentials')

    await login(page, 'tenant', email!, password!)
    await page.goto('/properties', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/tenant\/dashboard(?:[/?#]|$)/)
  })
})
