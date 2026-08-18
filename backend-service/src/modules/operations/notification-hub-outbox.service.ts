import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { NotificationHubOutboxStatus, Prisma } from '@prisma/client';
import type { Job, Queue } from 'bullmq';
import { NotificationHubService } from '../../common/notification-hub.service';
import { PrismaService } from '../../common/services/prisma.service';

export const NOTIFICATION_HUB_OUTBOX_QUEUE = 'notification-hub-outbox';
const OUTBOX_JOB = 'deliver-notification';

type EnqueueInput = {
  idempotencyKey: string;
  recipientEmail: string;
  subject: string;
  body: string;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  metadata?: Record<string, unknown>;
};

@Injectable()
export class NotificationHubOutboxService implements OnModuleInit {
  private readonly logger = new Logger(NotificationHubOutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationHubService,
    @InjectQueue(NOTIFICATION_HUB_OUTBOX_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    const pending = await this.prisma.notificationHubOutbox.findMany({
      where: {
        status: {
          in: [
            NotificationHubOutboxStatus.PENDING,
            NotificationHubOutboxStatus.FAILED,
          ],
        },
      },
      select: { id: true },
      take: 500,
      orderBy: { createdAt: 'asc' },
    });
    await Promise.all(pending.map((event) => this.schedule(event.id)));
  }

  async enqueue(input: EnqueueInput): Promise<void> {
    try {
      const event = await this.prisma.notificationHubOutbox.upsert({
        where: { idempotencyKey: input.idempotencyKey },
        create: {
          idempotencyKey: input.idempotencyKey,
          recipientEmail: input.recipientEmail,
          subject: input.subject,
          body: input.body,
          priority: input.priority ?? 'NORMAL',
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
        update: {},
        select: { id: true },
      });
      await this.schedule(event.id);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to persist Notification Hub outbox event';
      this.logger.error(
        `Notification Hub outbox enqueue failed for ${input.idempotencyKey}: ${message}`,
      );
    }
  }

  async deliver(outboxId: string): Promise<void> {
    const event = await this.prisma.notificationHubOutbox.findUnique({
      where: { id: outboxId },
    });
    if (
      !event ||
      event.status === NotificationHubOutboxStatus.SENT ||
      event.status === NotificationHubOutboxStatus.SKIPPED
    )
      return;
    if (
      !process.env.NOTIFICATION_HUB_ENABLED ||
      process.env.NOTIFICATION_HUB_ENABLED === 'false'
    ) {
      await this.prisma.notificationHubOutbox.update({
        where: { id: event.id },
        data: {
          status: NotificationHubOutboxStatus.SKIPPED,
          lastError: 'Notification Hub disabled',
        },
      });
      return;
    }
    try {
      const hubNotificationId = await this.notifications.send(
        {
          to: [event.recipientEmail],
          subject: event.subject,
          body: event.body,
          priority: event.priority as 'HIGH' | 'NORMAL' | 'LOW',
          metadata:
            (event.metadata as Record<string, unknown> | null) ?? undefined,
        },
        event.idempotencyKey,
      );
      await this.prisma.notificationHubOutbox.update({
        where: { id: event.id },
        data: {
          status: NotificationHubOutboxStatus.SENT,
          hubNotificationId,
          sentAt: new Date(),
          lastError: null,
          attempts: { increment: 1 },
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Notification Hub delivery failed';
      await this.prisma.notificationHubOutbox.update({
        where: { id: event.id },
        data: {
          status: NotificationHubOutboxStatus.FAILED,
          lastError: message,
          attempts: { increment: 1 },
        },
      });
      this.logger.warn(
        `Notification Hub outbox ${event.id} failed: ${message}`,
      );
      throw error;
    }
  }

  private async schedule(outboxId: string): Promise<void> {
    await this.queue.add(
      OUTBOX_JOB,
      { outboxId },
      {
        jobId: outboxId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: 500,
        removeOnFail: 500,
      },
    );
  }
}

@Processor(NOTIFICATION_HUB_OUTBOX_QUEUE)
export class NotificationHubOutboxProcessor extends WorkerHost {
  constructor(private readonly outbox: NotificationHubOutboxService) {
    super();
  }

  async process(job: Job<{ outboxId: string }>): Promise<void> {
    await this.outbox.deliver(job.data.outboxId);
  }
}
