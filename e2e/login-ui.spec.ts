import { test, expect } from '@playwright/test'

const loginPath = 'login'

test.describe('login UI smoke tests', () => {
  test('supports owner sign-in, password visibility, and forgot-password modes', async ({ page }) => {
    await page.goto(loginPath, { waitUntil: 'domcontentloaded' })

    await expect(page.getByTestId('login-title')).toContainText('Sign in to RentSlate')
    await expect(page.getByTestId('login-audience-owner')).toBeVisible()
    await expect(page.getByTestId('login-audience-tenant')).toBeVisible()

    await page.getByTestId('login-audience-owner').click()
    await expect(page.getByTestId('login-form')).toBeVisible()
    await expect(page.getByTestId('login-submit')).toHaveText('Sign in')

    await page.getByTestId('login-show-password').click()
    await expect(page.getByTestId('login-password')).toHaveAttribute('type', 'text')
    await page.getByTestId('login-show-password').click()
    await expect(page.getByTestId('login-password')).toHaveAttribute('type', 'password')

    await page.getByTestId('login-forgot-password').click()
    await expect(page.getByTestId('login-submit')).toHaveText('Send reset link')
    await expect(page.getByTestId('login-password')).toHaveCount(0)
  })

  test('supports tenant entry mode', async ({ page }) => {
    await page.goto(loginPath, { waitUntil: 'domcontentloaded' })
    await page.getByTestId('login-audience-tenant').click()

    await expect(page.getByTestId('login-form')).toBeVisible()
    await expect(page.getByTestId('login-submit')).toHaveText('Sign in')
    await expect(page.getByTestId('login-switch-mode')).toHaveCount(0)
  })
})
