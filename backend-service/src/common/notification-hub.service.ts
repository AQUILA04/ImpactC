import { Injectable, Logger } from '@nestjs/common';

type NotificationHubPriority = 'HIGH' | 'NORMAL' | 'LOW';

type NotificationHubRequest = {
  to: string[];
  subject: string;
  body: string;
  priority: NotificationHubPriority;
  metadata?: Record<string, unknown>;
};

type CachedToken = { accessToken: string; expiresAt: number };

@Injectable()
export class NotificationHubService {
  private readonly logger = new Logger(NotificationHubService.name);
  private cachedToken?: CachedToken;
  private pendingToken?: Promise<string>;

  isEnabled(): boolean {
    return process.env.NOTIFICATION_HUB_ENABLED === 'true';
  }

  async send(
    request: NotificationHubRequest,
    idempotencyKey: string,
  ): Promise<string> {
    if (!this.isEnabled()) throw new Error('Notification Hub is disabled');
    const baseUrl = this.required('NOTIFICATION_HUB_BASE_URL').replace(
      /\/+$/,
      '',
    );
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      Number(process.env.NOTIFICATION_HUB_TIMEOUT_MS ?? 10_000),
    );
    try {
      const response = await fetch(`${baseUrl}/v1/notifications`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${await this.getAccessToken()}`,
          accept: 'application/json',
          'content-type': 'application/json',
          'x-tenant-id': process.env.NOTIFICATION_HUB_TENANT_ID ?? 'impactc',
          'x-app-id': process.env.NOTIFICATION_HUB_APP_ID ?? 'impactc',
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          channel: 'EMAIL',
          from: this.required('NOTIFICATION_HUB_FROM'),
          to: request.to,
          subject: request.subject,
          body: request.body,
          priority: request.priority,
          metadata: request.metadata,
        }),
        signal: controller.signal,
      });
      const raw = await response.text();
      if (!response.ok)
        throw new Error(
          `Notification Hub rejected ${idempotencyKey}: HTTP ${response.status}`,
        );
      const payload = JSON.parse(raw) as { id?: string };
      if (!payload.id)
        throw new Error(
          `Notification Hub accepted ${idempotencyKey} without an id`,
        );
      return payload.id;
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? `Notification Hub timed out for ${idempotencyKey}`
          : error instanceof Error
            ? error.message
            : `Notification Hub failed for ${idempotencyKey}`;
      this.logger.warn(message);
      throw new Error(message);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getAccessToken(): Promise<string> {
    const skewMs =
      Number(process.env.NOTIFICATION_HUB_TOKEN_REFRESH_SKEW_SECONDS ?? 60) *
      1000;
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - skewMs)
      return this.cachedToken.accessToken;
    if (!this.pendingToken) {
      this.pendingToken = this.fetchAccessToken().finally(() => {
        this.pendingToken = undefined;
      });
    }
    return this.pendingToken;
  }

  private async fetchAccessToken(): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.required('NOTIFICATION_HUB_OAUTH_CLIENT_ID'),
      client_secret: this.required('NOTIFICATION_HUB_OAUTH_CLIENT_SECRET'),
    });
    const response = await fetch(
      this.required('NOTIFICATION_HUB_OAUTH_TOKEN_URL'),
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );
    const raw = await response.text();
    if (!response.ok)
      throw new Error(
        `Notification Hub OAuth2 token request failed: HTTP ${response.status}`,
      );
    const payload = JSON.parse(raw) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!payload.access_token)
      throw new Error(
        'Notification Hub OAuth2 token response has no access_token',
      );
    this.cachedToken = {
      accessToken: payload.access_token,
      expiresAt: Date.now() + Math.max(payload.expires_in ?? 300, 1) * 1000,
    };
    return this.cachedToken.accessToken;
  }

  private required(name: string): string {
    const value = process.env[name]?.trim();
    if (!value)
      throw new Error(`${name} is required when Notification Hub is enabled`);
    return value;
  }
}
