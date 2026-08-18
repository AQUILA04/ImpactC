import { defineConfig, devices } from '@playwright/test';

const databaseUrl = process.env.E2E_DATABASE_URL ?? 'postgresql://postgres:postgres_secure_pass@127.0.0.1:5432/impactc_e2e?schema=public';

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  globalSetup: './e2e/support/global-setup.ts',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'npm run start:dev',
      cwd: '../backend-service',
      url: 'http://127.0.0.1:3001/api/docs',
      reuseExistingServer: false,
      timeout: 120_000,
      env: { ...process.env, PORT: '3001', DATABASE_URL: databaseUrl, NODE_ENV: 'test', FRONTEND_ORIGINS: 'http://127.0.0.1:3000', JWT_ACCESS_SECRET: 'impactc-e2e-access-secret', JWT_REFRESH_SECRET: 'impactc-e2e-refresh-secret', REDIS_HOST: '127.0.0.1', REDIS_PORT: '6379' },
    },
    {
      command: 'npm run dev -- --hostname 127.0.0.1 --port 3000',
      cwd: '.',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: false,
      timeout: 120_000,
      env: { ...process.env, NEXT_PUBLIC_API_BASE: 'http://127.0.0.1:3001/api' },
    },
  ],
});
