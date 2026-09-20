import { test, expect } from '@playwright/test'

test('production document responds successfully', async ({ request, baseURL }) => {
  const response = await request.get(baseURL ?? '/')
  expect(response.ok()).toBeTruthy()

  const contentType = response.headers()['content-type'] || ''
  expect(contentType).toContain('text/html')
})
