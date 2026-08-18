import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import { JourneysService } from './journeys.service';

export const JOURNEY_EXPIRATION_QUEUE = 'journey-expiration';
export const JOURNEY_EXPIRATION_JOB = 'daily-expiration-scan';

@Injectable()
export class JourneyExpirationScheduler implements OnModuleInit {
  constructor(@InjectQueue(JOURNEY_EXPIRATION_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.queue.upsertJobScheduler(JOURNEY_EXPIRATION_JOB, {
      pattern: process.env.JOURNEY_EXPIRATION_CRON ?? '0 6 * * *',
    }, {
      name: JOURNEY_EXPIRATION_JOB,
      data: {},
      opts: {
        removeOnComplete: 100,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
      },
    });
  }
}

@Processor(JOURNEY_EXPIRATION_QUEUE)
export class JourneyExpirationProcessor extends WorkerHost {
  private readonly logger = new Logger(JourneyExpirationProcessor.name);

  constructor(private readonly journeys: JourneysService) {
    super();
  }

  async process(job: Job): Promise<{ evaluated: number; alerted: number }> {
    const result = await this.journeys.checkExpirations();
    this.logger.log(`Journey expiration scan ${job.id ?? 'manual'}: ${result.evaluated} evaluated, ${result.alerted} alerts created.`);
    return result;
  }
}
