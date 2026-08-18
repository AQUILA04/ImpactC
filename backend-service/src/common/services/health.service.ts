import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ProfileMediaStorage } from '../../modules/profiles/profile-media.storage';
import { PrismaService } from './prisma.service';
import { redisConnectionOptions } from './redis.config';

export type HealthComponentStatus = 'up' | 'down';

export type ReadinessResult = {
  status: 'ready' | 'not_ready';
  components: Record<'postgresql' | 'redis' | 'minio', HealthComponentStatus>;
};

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaStorage: ProfileMediaStorage,
  ) {}

  async readiness(): Promise<ReadinessResult> {
    const [postgresql, redis, minio] = await Promise.all([
      this.check('postgresql', () => this.prisma.$queryRaw`SELECT 1`),
      this.check('redis', () => this.checkRedis()),
      this.check('minio', () => this.mediaStorage.assertReady()),
    ]);

    const components = { postgresql, redis, minio };
    return {
      status: Object.values(components).every((component) => component === 'up')
        ? 'ready'
        : 'not_ready',
      components,
    };
  }

  private async check(
    component: keyof ReadinessResult['components'],
    action: () => Promise<unknown>,
  ): Promise<HealthComponentStatus> {
    try {
      await action();
      return 'up';
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown failure';
      this.logger.warn(`Readiness check failed for ${component}: ${reason}`);
      return 'down';
    }
  }

  private async checkRedis(): Promise<void> {
    const client = new Redis({
      ...redisConnectionOptions(),
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 3_000,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
    });

    try {
      await client.connect();
      await client.ping();
    } finally {
      client.disconnect();
    }
  }
}
