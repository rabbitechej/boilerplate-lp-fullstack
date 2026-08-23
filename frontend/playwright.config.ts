import { defineConfig, devices } from '@playwright/test';

/**
 * E2E: login admin + CRUD de Post.
 *
 * Pré-requisitos:
 * - API e frontend rodando (ou use webServer abaixo)
 * - Admin existente: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
 *
 * Ex.: npm run test:e2e --prefix frontend
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
