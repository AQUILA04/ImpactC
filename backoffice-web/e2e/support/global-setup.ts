import { execFileSync } from 'node:child_process';
import type { FullConfig } from '@playwright/test';

const databaseUrl = process.env.E2E_DATABASE_URL ?? 'postgresql://postgres:postgres_secure_pass@127.0.0.1:5432/impactc_e2e?schema=public';

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: 'test' };
  execFileSync('npx', ['prisma', 'migrate', 'reset', '--force'], { cwd: '../backend-service', env, stdio: 'inherit' });
  execFileSync('npx', ['prisma', 'db', 'seed'], { cwd: '../backend-service', env, stdio: 'inherit' });
}
