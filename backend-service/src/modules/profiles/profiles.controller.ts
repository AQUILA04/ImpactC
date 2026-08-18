import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, JwtAuthGuard } from '../../common/auth.guard';
import type { JwtPayload } from '../../common/auth.guard';
import { KeycloakBackofficeGuard } from '../../common/keycloak-backoffice.guard';
import { Roles, RolesGuard } from '../../common/http';
import { ProfilesService } from './profiles.service';
import type { ProfileInput } from './profiles.service';

@Controller('api')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Post('profiles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CELIBATAIRE)
  create(@CurrentUser() user: JwtPayload, @Body() body: ProfileInput) {
    return this.profiles.createOrResubmit(user.sub, body);
  }

  @Get('profiles/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CELIBATAIRE)
  me(@CurrentUser() user: JwtPayload) {
    return this.profiles.me(user.sub);
  }

  @Put('profiles/me/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CELIBATAIRE)
  availability(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      slots: Array<{ weekday: number; startTime: string; endTime: string }>;
    },
  ) {
    return this.profiles.updateAvailability(user.sub, body.slots ?? []);
  }

  @Get('discover')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CELIBATAIRE)
  discover(
    @CurrentUser() user: JwtPayload,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.profiles.discover(user.sub, cursor, take ? Number(take) : 12);
  }

  @Get('moderation/profiles')
  @UseGuards(KeycloakBackofficeGuard, RolesGuard)
  @Roles(UserRole.RESPONSABLE, UserRole.ADMIN)
  pending() {
    return this.profiles.pending();
  }

  @Patch('moderation/profiles/:profileId')
  @UseGuards(KeycloakBackofficeGuard, RolesGuard)
  @Roles(UserRole.RESPONSABLE, UserRole.ADMIN)
  moderate(
    @CurrentUser() user: JwtPayload,
    @Param('profileId') profileId: string,
    @Body() body: { decision: 'approve' | 'reject'; note?: string },
  ) {
    return this.profiles.moderate(
      user.sub,
      profileId,
      body.decision,
      body.note,
    );
  }

  @Get('privacy/export')
  @UseGuards(JwtAuthGuard)
  export(@CurrentUser() user: JwtPayload) {
    return this.profiles.exportData(user.sub);
  }

  @Post('privacy/deletion-requests')
  @UseGuards(JwtAuthGuard)
  deletion(@CurrentUser() user: JwtPayload) {
    return this.profiles.requestDeletion(user.sub);
  }
}
