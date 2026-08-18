import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { JwtAuthGuard } from './common/auth.guard';
import { KeycloakBackofficeGuard } from './common/keycloak-backoffice.guard';
import { NotificationHubService } from './common/notification-hub.service';
import {
  AuditService,
  HttpExceptionFilter,
  ResponseInterceptor,
  RolesGuard,
} from './common/http';
import { HealthService } from './common/services/health.service';
import { runsBackgroundWorkers } from './common/services/process-role';
import { PrismaService } from './common/services/prisma.service';
import {
  bullmqConnectionOptions,
  bullmqPrefix,
} from './common/services/redis.config';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { ChatController, ChatGateway } from './modules/chat/chat.gateway';
import { ChatService } from './modules/chat/chat.service';
import { InterestsController } from './modules/interests/interests.controller';
import { InterestsService } from './modules/interests/interests.service';
import { JourneysController } from './modules/journeys/journeys.controller';
import {
  JourneyExpirationProcessor,
  JourneyExpirationScheduler,
  JOURNEY_EXPIRATION_QUEUE,
} from './modules/journeys/journey-expiration.worker';
import { JourneysService } from './modules/journeys/journeys.service';
import { ImpactcBusinessNotificationsService } from './modules/operations/impactc-business-notifications.service';
import { OperationsController } from './modules/operations/operations.controller';
import {
  NotificationHubOutboxProcessor,
  NotificationHubOutboxService,
  NOTIFICATION_HUB_OUTBOX_QUEUE,
} from './modules/operations/notification-hub-outbox.service';
import { ProfileMediaController } from './modules/profiles/profile-media.controller';
import { ProfileMediaStorage } from './modules/profiles/profile-media.storage';
import { ProfilesController } from './modules/profiles/profiles.controller';
import { ProfilesService } from './modules/profiles/profiles.service';

const backgroundWorkerProviders = runsBackgroundWorkers()
  ? [
      JourneyExpirationScheduler,
      JourneyExpirationProcessor,
      NotificationHubOutboxProcessor,
    ]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: bullmqConnectionOptions(),
      prefix: bullmqPrefix(),
    }),
    BullModule.registerQueue({ name: JOURNEY_EXPIRATION_QUEUE }),
    BullModule.registerQueue({ name: NOTIFICATION_HUB_OUTBOX_QUEUE }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [
    AppController,
    HealthController,
    AuthController,
    ProfilesController,
    ProfileMediaController,
    InterestsController,
    JourneysController,
    ChatController,
    OperationsController,
  ],
  providers: [
    AppService,
    PrismaService,
    HealthService,
    AuditService,
    NotificationHubService,
    NotificationHubOutboxService,
    ImpactcBusinessNotificationsService,
    AuthService,
    ProfilesService,
    ProfileMediaStorage,
    InterestsService,
    JourneysService,
    ChatService,
    ChatGateway,
    ...backgroundWorkerProviders,
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    JwtAuthGuard,
    KeycloakBackofficeGuard,
  ],
})
export class AppModule {}
