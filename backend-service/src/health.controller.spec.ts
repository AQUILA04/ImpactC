import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { HealthController } from './health.controller';
import type { HealthService } from './common/services/health.service';

describe('HealthController', () => {
  const health = {
    readiness: jest.fn(),
  } as unknown as HealthService;
  const controller = new HealthController(health);

  beforeEach(() => jest.clearAllMocks());

  it('exposes a dependency-free liveness response', () => {
    expect(controller.live()).toEqual({ status: 'live' });
  });

  it('returns 200 when every required dependency is ready', async () => {
    jest.spyOn(health, 'readiness').mockResolvedValue({
      status: 'ready',
      components: { postgresql: 'up', redis: 'up', minio: 'up' },
    });
    const response = {
      status: jest.fn().mockReturnThis(),
    } as unknown as Response;

    await expect(controller.ready(response)).resolves.toMatchObject({
      status: 'ready',
    });
    expect(response.status).toHaveBeenCalledWith(HttpStatus.OK);
  });

  it('returns 503 without exposing the dependency error', async () => {
    jest.spyOn(health, 'readiness').mockResolvedValue({
      status: 'not_ready',
      components: { postgresql: 'up', redis: 'down', minio: 'up' },
    });
    const response = {
      status: jest.fn().mockReturnThis(),
    } as unknown as Response;

    await expect(controller.ready(response)).resolves.toMatchObject({
      status: 'not_ready',
    });
    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  });
});
