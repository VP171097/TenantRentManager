# RentSlate E2E Testing

RentSlate uses Playwright for browser-level end-to-end testing in addition to the existing Vitest unit/component tests.

## Local commands

```bash
npm install
npx playwright install chromium
npm run typecheck:e2e
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
```

The default E2E target is the deployed GitHub Pages site:

`https://vp171097.github.io/TenantRentManager/`

Override it with `E2E_BASE_URL` when testing another environment.

## Current coverage

- Public route smoke tests
- Password reset route availability
- Application 404 page
- Home-page internal-link checks
- Console-error detection
- Failed-network-request detection
- Login owner/tenant UI flows
- Unauthenticated protection for owner/manager routes
- Unauthenticated protection for tenant routes
- Optional authenticated owner route coverage
- Optional authenticated tenant route coverage
- Chromium desktop and mobile Chrome projects
- Trace, screenshot, and video artifacts on failures

## Authenticated CI tests

Authenticated route tests are enabled when these GitHub Actions secrets are configured:

- `E2E_OWNER_EMAIL`
- `E2E_OWNER_PASSWORD`
- `E2E_TENANT_EMAIL`
- `E2E_TENANT_PASSWORD`

Use dedicated test accounts rather than a personal account. The tests currently read the credentials only from environment variables and never write them to the repository.

## CI

The workflow runs on pushes to `main` and `qa/**`, pull requests targeting `main`, manual dispatches, and a daily schedule.

Playwright reports and failure artifacts are uploaded to the GitHub Actions run.
