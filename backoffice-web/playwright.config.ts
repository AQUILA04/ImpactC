import { defineConfig, devices } from "@playwright/test";

const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  "postgresql://postgres:postgres_secure_pass@127.0.0.1:5432/impactc_e2e?schema=public";

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  globalSetup: "./e2e/support/global-setup.ts",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npx prisma migrate deploy && npm run start:dev",
      cwd: "../backend-service",
      url: "http://127.0.0.1:3001/api/docs",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        PORT: "3001",
        DATABASE_URL: databaseUrl,
        NODE_ENV: "test",
        FRONTEND_ORIGINS: "http://127.0.0.1:3000",
        JWT_ACCESS_SECRET: "impactc-e2e-access-secret",
        JWT_REFRESH_SECRET: "impactc-e2e-refresh-secret",
        KEYCLOAK_BACKOFFICE_ENABLED: "false",
        REDIS_HOST: "127.0.0.1",
        REDIS_PORT: "6379",
        S3_ENDPOINT: process.env.S3_ENDPOINT ?? "http://127.0.0.1:9000",
        S3_REGION: process.env.S3_REGION ?? "us-east-1",
        S3_BUCKET: process.env.S3_BUCKET ?? "impactc-media-e2e",
        S3_ACCESS_KEY: process.env.S3_ACCESS_KEY ?? "impactc_minio",
        S3_SECRET_KEY: process.env.S3_SECRET_KEY ?? "impactc_minio_change_me",
        S3_AUTO_CREATE_BUCKET: "true",
      },
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
      cwd: ".",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_BASE: "http://127.0.0.1:3001/api",
        NEXT_PUBLIC_KEYCLOAK_BACKOFFICE_ENABLED: "false",
      },
    },
  ],
});
