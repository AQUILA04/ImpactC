import { NotificationHubOutboxStatus } from '@prisma/client';
import { NotificationHubOutboxService } from './notification-hub-outbox.service';

describe('NotificationHubOutboxService', () => {
  const originalEnv = { ...process.env };
  const findUnique = jest.fn();
  const findMany = jest.fn();
  const upsert = jest.fn();
  const update = jest.fn();
  const queue = { add: jest.fn() };
  const notifications = { send: jest.fn() };
  const prisma = {
    notificationHubOutbox: { findUnique, findMany, upsert, update },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('marks a persisted event as skipped when Notification Hub is disabled', async () => {
    process.env.NOTIFICATION_HUB_ENABLED = 'false';
    findUnique.mockResolvedValue({
      id: 'outbox-1',
      status: NotificationHubOutboxStatus.PENDING,
    });
    const service = new NotificationHubOutboxService(
      prisma as never,
      notifications as never,
      queue as never,
    );

    await service.deliver('outbox-1');

    expect(notifications.send).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'outbox-1' },
        data: expect.objectContaining({
          status: NotificationHubOutboxStatus.SKIPPED,
        }),
      }),
    );
  });

  it('records hub acceptance after a successful asynchronous delivery', async () => {
    process.env.NOTIFICATION_HUB_ENABLED = 'true';
    findUnique.mockResolvedValue({
      id: 'outbox-2',
      status: NotificationHubOutboxStatus.PENDING,
      recipientEmail: 'member@example.test',
      subject: 'ImpactC',
      body: '<p>OK</p>',
      priority: 'HIGH',
      metadata: { event: 'appointment-scheduled' },
      idempotencyKey: 'impactc:appointment-scheduled:journey-1:member-1',
    });
    notifications.send.mockResolvedValue(
      'c269251d-45fc-45fe-b2c6-dd841a5bc1c4',
    );
    const service = new NotificationHubOutboxService(
      prisma as never,
      notifications as never,
      queue as never,
    );

    await service.deliver('outbox-2');

    expect(notifications.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['member@example.test'],
        priority: 'HIGH',
      }),
      'impactc:appointment-scheduled:journey-1:member-1',
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'outbox-2' },
        data: expect.objectContaining({
          status: NotificationHubOutboxStatus.SENT,
          hubNotificationId: 'c269251d-45fc-45fe-b2c6-dd841a5bc1c4',
        }),
      }),
    );
  });
});
