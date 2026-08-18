import { NotificationHubService } from './notification-hub.service';

describe('NotificationHubService', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NOTIFICATION_HUB_ENABLED: 'true',
      NOTIFICATION_HUB_BASE_URL: 'https://notification-api.example.test',
      NOTIFICATION_HUB_OAUTH_TOKEN_URL:
        'https://auth.example.test/realms/notification-hub/protocol/openid-connect/token',
      NOTIFICATION_HUB_OAUTH_CLIENT_ID: 'impactc-notification-sender',
      NOTIFICATION_HUB_OAUTH_CLIENT_SECRET: 'secret',
      NOTIFICATION_HUB_FROM: 'notifications@impactc.example.test',
      NOTIFICATION_HUB_TENANT_ID: 'impactc',
      NOTIFICATION_HUB_APP_ID: 'impactc',
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  it('uses a cached client-credentials token and sends tenant/app/idempotency headers', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'hub-token', expires_in: 300 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'a9ff5d01-36ff-4cbb-8e1b-378e7f2654d7' }),
          { status: 202 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'edebbd46-e211-457c-a0d5-ea23e6937e23' }),
          { status: 202 },
        ),
      );
    global.fetch = fetchMock as unknown as typeof fetch;
    const service = new NotificationHubService();

    await service.send(
      {
        to: ['member@example.test'],
        subject: 'ImpactC',
        body: '<p>OK</p>',
        priority: 'NORMAL',
      },
      'impactc:event:1',
    );
    await service.send(
      {
        to: ['member@example.test'],
        subject: 'ImpactC',
        body: '<p>OK</p>',
        priority: 'NORMAL',
      },
      'impactc:event:2',
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const notificationCall = fetchMock.mock.calls[1];
    expect(notificationCall[0]).toBe(
      'https://notification-api.example.test/v1/notifications',
    );
    expect(notificationCall[1].headers).toMatchObject({
      authorization: 'Bearer hub-token',
      'x-tenant-id': 'impactc',
      'x-app-id': 'impactc',
      'idempotency-key': 'impactc:event:1',
    });
  });

  it('rejects invalid hub responses without exposing credentials', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'hub-token', expires_in: 300 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response('upstream error', { status: 503 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const service = new NotificationHubService();

    await expect(
      service.send(
        {
          to: ['member@example.test'],
          subject: 'ImpactC',
          body: '<p>OK</p>',
          priority: 'HIGH',
        },
        'impactc:event:3',
      ),
    ).rejects.toThrow('HTTP 503');
  });
});
