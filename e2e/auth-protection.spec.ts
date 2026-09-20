import { test, expect } from '@playwright/test'

const ownerManagerRoutes = [
  '/dashboard',
  '/properties',
  '/rooms',
  '/tenants',
  '/billing',
  '/payments',
  '/ledger',
  '/receipts',
  '/reports',
  '/expenses',
  '/maintenance',
  '/managers',
  '/audit',
  '/settings',
  '/profile',
]

const tenantRoutes = [
  '/tenant/dashboard',
  '/tenant/ledger',
  '/tenant/receipts',
  '/tenant/profile',
]

const appPath = (route: string) => route === '/' ? './' : route.slice(1)

test.describe('unauthenticated route protection', () => {
  for (const route of [...ownerManagerRoutes, ...tenantRoutes]) {
    test(`protects ${route}`, async ({ page }) => {
      await page.goto(appPath(route), { waitUntil: 'domcontentloaded' })

      await expect(page).toHaveURL(/\/login\?next=/)
      await expect(page.getByRole('heading', { name: /sign in|log in|welcome/i })).toBeVisible()
    })
  }
})
