import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './common/services/health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  @HttpCode(HttpStatus.OK)
  live(): { status: 'live' } {
    return { status: 'live' };
  }

  @Get('ready')
  async ready(@Res({ passthrough: true }) response: Response) {
    const readiness = await this.health.readiness();
    response.status(
      readiness.status === 'ready'
        ? HttpStatus.OK
        : HttpStatus.SERVICE_UNAVAILABLE,
    );
    return readiness;
  }
}
