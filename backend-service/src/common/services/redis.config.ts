import type { ConnectionOptions } from 'bullmq';
import type { RedisOptions } from 'ioredis';

function integerEnvironment(name: string, fallback: number): number {
  const configured = process.env[name];
  if (!configured) return fallback;

  const value = Number(configured);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}

export type ImpactcRedisOptions = Pick<
  RedisOptions,
  'host' | 'port' | 'db' | 'password'
>;

export function redisConnectionOptions(): ImpactcRedisOptions {
  const password = process.env.REDIS_PASSWORD?.trim();

  return {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: integerEnvironment('REDIS_PORT', 6379),
    db: integerEnvironment('REDIS_DB', 0),
    ...(password ? { password } : {}),
  };
}

export function bullmqConnectionOptions(): ConnectionOptions {
  return redisConnectionOptions();
}

export function bullmqPrefix(): string {
  const prefix = process.env.BULLMQ_PREFIX?.trim() || 'impactc';
  if (prefix.includes(':')) {
    throw new Error('BULLMQ_PREFIX must not contain a colon');
  }
  return prefix;
}
