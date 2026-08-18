import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { JwtAuthGuard, type JwtPayload } from './auth.guard';
import { PrismaService } from './services/prisma.service';

type KeycloakPayload = JWTPayload & {
  email?: string;
  email_verified?: boolean;
  realm_access?: { roles?: unknown };
};

@Injectable()
export class KeycloakBackofficeGuard implements CanActivate {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;
  private jwksIssuer?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly legacyJwt: JwtAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.KEYCLOAK_BACKOFFICE_ENABLED !== 'true') {
      return this.legacyJwt.canActivate(context);
    }

    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string }; user?: JwtPayload }>();
    const token = request.headers.authorization?.startsWith('Bearer ')
      ? request.headers.authorization.slice(7)
      : undefined;
    if (!token) throw new UnauthorizedException('Bearer token is required');

    const issuer = this.requiredEnvironment('KEYCLOAK_ISSUER').replace(
      /\/$/,
      '',
    );
    const clientId = this.requiredEnvironment('KEYCLOAK_BACKOFFICE_CLIENT_ID');

    try {
      const { payload } = await jwtVerify<KeycloakPayload>(
        token,
        this.remoteJwks(issuer),
        {
          issuer,
          audience: clientId,
        },
      );
      const email = this.verifiedEmail(payload);
      const role = this.supervisionRole(payload);
      const keycloakSubject = payload.sub;
      if (!keycloakSubject)
        throw new UnauthorizedException('Keycloak subject is required');

      const user = await this.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          keycloakSubject: true,
        },
      });
      if (
        !user?.isActive ||
        !this.isSupervisionRole(user.role) ||
        user.role !== role
      ) {
        throw new UnauthorizedException(
          'Keycloak account is not provisioned for ImpactC supervision',
        );
      }
      if (user.keycloakSubject && user.keycloakSubject !== keycloakSubject) {
        throw new UnauthorizedException(
          'Keycloak subject does not match the provisioned ImpactC account',
        );
      }
      if (!user.keycloakSubject) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { keycloakSubject },
        });
      }

      request.user = { sub: user.id, email: user.email, role: user.role };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(
        'Keycloak access token is invalid or expired',
      );
    }
  }

  private remoteJwks(issuer: string): ReturnType<typeof createRemoteJWKSet> {
    if (!this.jwks || this.jwksIssuer !== issuer) {
      this.jwks = createRemoteJWKSet(
        new URL(`${issuer}/protocol/openid-connect/certs`),
      );
      this.jwksIssuer = issuer;
    }
    return this.jwks;
  }

  private verifiedEmail(payload: KeycloakPayload): string {
    if (typeof payload.email !== 'string' || payload.email_verified !== true) {
      throw new UnauthorizedException('A verified Keycloak email is required');
    }
    return payload.email.trim().toLowerCase();
  }

  private supervisionRole(payload: KeycloakPayload): UserRole {
    const roles = Array.isArray(payload.realm_access?.roles)
      ? payload.realm_access.roles
      : [];
    if (roles.includes(UserRole.ADMIN)) return UserRole.ADMIN;
    if (roles.includes(UserRole.RESPONSABLE)) return UserRole.RESPONSABLE;
    throw new UnauthorizedException('A Keycloak supervision role is required');
  }

  private isSupervisionRole(role: UserRole): boolean {
    return role === UserRole.RESPONSABLE || role === UserRole.ADMIN;
  }

  private requiredEnvironment(name: string): string {
    const value = process.env[name]?.trim();
    if (!value)
      throw new UnauthorizedException(
        `${name} is required when Keycloak backoffice authentication is enabled`,
      );
    return value;
  }
}
