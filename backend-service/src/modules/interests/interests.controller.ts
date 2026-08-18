import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, JwtAuthGuard } from '../../common/auth.guard';
import type { JwtPayload } from '../../common/auth.guard';
import { Roles, RolesGuard } from '../../common/http';
import { InterestsService } from './interests.service';

@Controller('api')
export class InterestsController {
  constructor(private readonly interests: InterestsService) {}

  @Post('interests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CELIBATAIRE)
  express(@CurrentUser() user: JwtPayload, @Body() body: { targetProfileId: string }) {
    return this.interests.express(user.sub, body.targetProfileId);
  }

  @Get('matches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESPONSABLE, UserRole.ADMIN)
  list(@Query('type') type?: 'unilateral' | 'match') {
    return this.interests.listForLeader(type);
  }

  @Patch('matches/:matchId/leader')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESPONSABLE, UserRole.ADMIN)
  assign(@CurrentUser() user: JwtPayload, @Param('matchId') matchId: string, @Body() body: { leaderId: string }) {
    return this.interests.assignLeader(user.sub, matchId, body.leaderId);
  }
}
