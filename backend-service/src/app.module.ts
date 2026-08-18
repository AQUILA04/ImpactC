import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './common/auth.guard';
import { AuditService, HttpExceptionFilter, ResponseInterceptor, RolesGuard } from './common/http';
import { PrismaService } from './common/services/prisma.service';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { ChatController, ChatGateway } from './modules/chat/chat.gateway';
import { ChatService } from './modules/chat/chat.service';
import { InterestsController } from './modules/interests/interests.controller';
import { InterestsService } from './modules/interests/interests.service';
import { JourneysController } from './modules/journeys/journeys.controller';
import { JourneysService } from './modules/journeys/journeys.service';
import { OperationsController } from './modules/operations/operations.controller';
import { ProfilesController } from './modules/profiles/profiles.controller';
import { ProfilesService } from './modules/profiles/profiles.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true, secret: process.env.JWT_ACCESS_SECRET, signOptions: { expiresIn: '15m' } }),
  ],
  controllers: [AppController, AuthController, ProfilesController, InterestsController, JourneysController, ChatController, OperationsController],
  providers: [
    AppService,
    PrismaService,
    AuditService,
    AuthService,
    ProfilesService,
    InterestsService,
    JourneysService,
    ChatService,
    ChatGateway,
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: RolesGuard },
    JwtAuthGuard,
  ],
})
export class AppModule {}
