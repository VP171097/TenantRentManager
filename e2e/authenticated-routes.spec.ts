import { test, expect } from '@playwright/test'

const ownerRoutes = [
  '/dashboard', '/properties', '/rooms', '/tenants', '/billing', '/payments',
  '/ledger', '/receipts', '/reports', '/expenses', '/maintenance', '/managers',
  '/audit', '/settings', '/profile',
]

const tenantRoutes = [
  '/tenant/dashboard', '/tenant/ledger', '/tenant/receipts', '/tenant/profile',
]

async function signIn(page: import('@playwright/test').Page, audience: 'owner' | 'tenant', email: string, password: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByTestId(audience === 'owner' ? 'login-audience-owner' : 'login-audience-tenant').click()
  await page.getByTestId('login-email').fill(email)
  await page.getByTestId('login-password').fill(password)
  await page.getByTestId('login-submit').click()
}

async function checkRoutes(page: import('@playwright/test').Page, routes: string[]) {
  for (const route of routes) {
    const consoleErrors: string[] = []
    const failedRequests: string[] = []

    const onConsole = (message: import('@playwright/test').ConsoleMessage) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    }
    const onRequestFailed = (request: import('@playwright/test').Request) => {
      failedRequests.push(request.method() + ' ' + request.url() + ' — ' + (request.failure()?.errorText ?? 'failed'))
    }

    page.on('console', onConsole)
    page.on('requestfailed', onRequestFailed)

    try {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
      await expect(page.locator('body')).not.toContainText(/Application error|Unhandled Runtime Error/i)
      expect(page.url(), 'navigation for ' + route).toContain(route)
      expect(consoleErrors, 'console errors on ' + route).toEqual([])
      expect(failedRequests, 'failed requests on ' + route).toEqual([])
    } finally {
      page.removeListener('console', onConsole)
      page.removeListener('requestfailed', onRequestFailed)
    }
  }
}

test.describe('authenticated route smoke tests', () => {
  test('owner can open every owner/manager route', async ({ page }) => {
    const email = process.env.E2E_OWNER_EMAIL
    const password = process.env.E2E_OWNER_PASSWORD
    test.skip(!email || !password, 'Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to enable authenticated owner tests')

    await signIn(page, 'owner', email!, password!)
    await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/)
    await checkRoutes(page, ownerRoutes)
  })

  test('tenant can open every tenant route', async ({ page }) => {
    const email = process.env.E2E_TENANT_EMAIL
    const password = process.env.E2E_TENANT_PASSWORD
    test.skip(!email || !password, 'Set E2E_TENANT_EMAIL and E2E_TENANT_PASSWORD to enable authenticated tenant tests')

    await signIn(page, 'tenant', email!, password!)
    await expect(page).toHaveURL(/\/tenant\/dashboard(?:[/?#]|$)/)
    await checkRoutes(page, tenantRoutes)
  })
})
