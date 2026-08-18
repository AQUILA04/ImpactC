import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

export type JwtPayload = { sub: string; email: string; role: UserRole; profileId?: string };

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): JwtPayload => {
  const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
  if (!request.user) throw new UnauthorizedException('Authentication is required');
  return request.user;
});

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: JwtPayload }>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token is required');
    try {
      request.user = await this.jwt.verifyAsync<JwtPayload>(authorization.slice(7));
      return true;
    } catch {
      throw new UnauthorizedException('Access token is invalid or expired');
    }
  }
}
