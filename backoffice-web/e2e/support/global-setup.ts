import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { FullConfig } from '@playwright/test';

const databaseUrl = process.env.E2E_DATABASE_URL ?? 'postgresql://postgres:postgres_secure_pass@127.0.0.1:5432/impactc_e2e?schema=public';
const minioEndpoint = process.env.S3_ENDPOINT ?? 'http://127.0.0.1:9000';

async function minioIsReady(): Promise<boolean> {
  try { return (await fetch(`${minioEndpoint}/minio/health/live`)).ok; } catch { return false; }
}

async function ensureMinio(): Promise<void> {
  if (await minioIsReady()) return;
  if (process.env.CI) throw new Error(`MinIO is unavailable at ${minioEndpoint}; start the CI MinIO service before E2E tests.`);
  const binary = process.env.MINIO_BINARY ?? join(homedir(), '.local', 'bin', 'minio');
  if (!existsSync(binary)) throw new Error(`MinIO is unavailable and its native binary was not found at ${binary}.`);
  const dataDir = process.env.MINIO_DATA_DIR ?? join(process.cwd(), '..', '.minio-e2e-data');
  mkdirSync(dataDir, { recursive: true });
  const url = new URL(minioEndpoint);
  const child = spawn(binary, ['server', dataDir, '--address', `${url.hostname}:${url.port || '9000'}`], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, MINIO_ROOT_USER: process.env.S3_ACCESS_KEY ?? 'impactc_minio', MINIO_ROOT_PASSWORD: process.env.S3_SECRET_KEY ?? 'impactc_minio_change_me' },
  });
  child.unref();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (await minioIsReady()) return;
  }
  throw new Error(`MinIO did not become ready at ${minioEndpoint}.`);
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  await ensureMinio();
  const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: 'test' };
  execFileSync('npx', ['prisma', 'migrate', 'reset', '--force'], { cwd: '../backend-service', env, stdio: 'inherit' });
  execFileSync('npx', ['prisma', 'db', 'seed'], { cwd: '../backend-service', env, stdio: 'inherit' });
}
