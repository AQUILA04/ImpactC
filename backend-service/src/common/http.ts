import {
  ArgumentsHost,
  CallHandler,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserRole } from '@prisma/client';
import { PrismaService } from './services/prisma.service';

export type AuthUser = { id: string; role: UserRole; email: string; profileId?: string };
export const ROLES_KEY = 'impactc_roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!request.user) throw new UnauthorizedException('Authentication is required');
    return required.includes(request.user.role);
  }
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<{ statusCode?: number }>();
    return next.handle().pipe(
      map((data) => ({
        status: 'OK',
        statusCode: response.statusCode ?? HttpStatus.OK,
        message: 'default.message.success',
        service: 'OPTIMIZE-SERVICE',
        data,
      })),
    );
  }
}

@Injectable()
export class HttpExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();
    const http = exception instanceof HttpException ? exception : new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    const statusCode = http.getStatus();
    const body = http.getResponse();
    const message = typeof body === 'object' && body && 'message' in body ? (body as { message: unknown }).message : body;
    response.status(statusCode).json({
      status: 'ERROR',
      statusCode,
      message,
      service: 'OPTIMIZE-SERVICE',
      data: null,
    });
  }
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(actorId: string | undefined, action: string, targetType: string, targetId?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.prisma.auditLog.create({
      data: { actorId, action, targetType, targetId, metadata: metadata as never },
    });
  }
}

export const requireUser = (user: AuthUser | undefined): AuthUser => {
  if (!user) throw new UnauthorizedException('Authentication is required');
  return user;
};
