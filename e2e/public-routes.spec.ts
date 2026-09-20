import { test, expect } from '@playwright/test'

const publicRoutes = [
  '/',
  '/about',
  '/services',
  '/blog',
  '/contact',
  '/terms',
  '/privacy',
  '/sitemap',
  '/login',
  '/reset-password',
  '/join',
]

test.describe('public route smoke tests', () => {
  for (const route of publicRoutes) {
    test(`loads ${route} without application errors`, async ({ page }) => {
      const consoleErrors: string[] = []
      const failedRequests: string[] = []

      page.on('console', message => {
        if (message.type() === 'error') consoleErrors.push(message.text())
      })
      page.on('requestfailed', request => {
        failedRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`)
      })

      const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
      expect(response?.status(), `HTTP status for ${route}`).toBeLessThan(400)

      await expect(page.locator('body')).toBeVisible()
      await expect(page.locator('body')).not.toContainText(/Application error|Unhandled Runtime Error|Something went wrong/i)

      expect(consoleErrors, `console errors on ${route}`).toEqual([])
      expect(failedRequests, `failed requests on ${route}`).toEqual([])
    })
  }

  test('unknown route renders the application 404 page', async ({ page }) => {
    await page.goto('/this-route-should-not-exist', { waitUntil: 'domcontentloaded' })

    await expect(page.getByTestId('not-found-code')).toContainText('404')
    await expect(page.getByTestId('not-found-title')).toBeVisible()
    await expect(page.getByTestId('not-found-description')).toBeVisible()
    await expect(page.getByTestId('not-found-home')).toBeVisible()
  })

  test('home page internal links do not point to obviously broken routes', async ({ page, request, baseURL }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const hrefs = await page.locator('a[href]').evaluateAll(links =>
      links
        .map(link => (link as { getAttribute: (name: string) => string | null }).getAttribute('href'))
        .filter((href): href is string => !!href && href.startsWith('/'))
        .filter(href => !href.startsWith('//'))
    )

    const uniqueRoutes = [...new Set(hrefs)]
    for (const route of uniqueRoutes) {
      const response = await request.get(new URL(route.replace(/^\//, ''), baseURL).toString())
      expect(response.status(), `linked route ${route}`).toBeLessThan(400)
    }
  })
})
