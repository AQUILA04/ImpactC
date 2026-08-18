import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ConsentDecision, UserRole } from '@prisma/client';
import { CurrentUser, JwtAuthGuard } from '../../common/auth.guard';
import type { JwtPayload } from '../../common/auth.guard';
import { Roles, RolesGuard } from '../../common/http';
import { JourneysService } from './journeys.service';

@Controller('api')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.RESPONSABLE, UserRole.ADMIN)
export class JourneysController {
  constructor(private readonly journeys: JourneysService) {}

  @Post('matches/:matchId/appointments')
  schedule(@CurrentUser() user: JwtPayload, @Param('matchId') matchId: string, @Body() body: { scheduledAt: string; location: string; notes?: string }) {
    return this.journeys.schedule(user.sub, matchId, body.scheduledAt, body.location, body.notes);
  }

  @Post('journeys/:journeyId/appointment-decisions')
  decision(@CurrentUser() user: JwtPayload, @Param('journeyId') journeyId: string, @Body() body: { partner: 1 | 2; decision: ConsentDecision }) {
    return this.journeys.recordDecision(user.sub, journeyId, body.partner, body.decision);
  }

  @Post('journeys/:journeyId/promote-step-2')
  step2(@CurrentUser() user: JwtPayload, @Param('journeyId') journeyId: string) { return this.journeys.promoteToStep2(user.sub, journeyId); }

  @Post('journeys/:journeyId/promote-step-3')
  step3(@CurrentUser() user: JwtPayload, @Param('journeyId') journeyId: string) { return this.journeys.promoteToStep3(user.sub, journeyId); }

  @Post('journeys/:journeyId/promote-step-4')
  step4(@CurrentUser() user: JwtPayload, @Param('journeyId') journeyId: string) { return this.journeys.promoteToStep4(user.sub, journeyId); }

  @Post('journeys/:journeyId/terminate')
  terminate(@CurrentUser() user: JwtPayload, @Param('journeyId') journeyId: string, @Body() body: { reason: string }) { return this.journeys.terminate(user.sub, journeyId, body.reason); }

  @Get('journeys/kanban')
  board(@CurrentUser() user: JwtPayload) { return this.journeys.board(user.sub); }

  @Get('dashboard')
  dashboard(@CurrentUser() user: JwtPayload) { return this.journeys.dashboard(user.sub); }

  @Post('internal/journeys/check-expirations')
  check() { return this.journeys.checkExpirations(); }
}
