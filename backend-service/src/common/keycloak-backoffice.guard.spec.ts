import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { KeycloakBackofficeGuard } from './keycloak-backoffice.guard';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => 'jwks'),
  jwtVerify: jest.fn(),
}));

describe('KeycloakBackofficeGuard', () => {
  const findUnique = jest.fn();
  const update = jest.fn();
  const legacyJwt = { canActivate: jest.fn() };
  const prisma = { user: { findUnique, update } };
  const request = {
    headers: { authorization: 'Bearer keycloak-token' },
    user: undefined as unknown,
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.KEYCLOAK_BACKOFFICE_ENABLED = 'true';
    process.env.KEYCLOAK_ISSUER =
      'https://auth.optimizesolux.com/realms/impactc';
    process.env.KEYCLOAK_BACKOFFICE_CLIENT_ID = 'impactc-backoffice';
    findUnique.mockResolvedValue({
      id: '5ebcf882-973d-4cf7-af55-e2a6a3e8d3dc',
      email: 'responsable@impactc.local',
      role: UserRole.RESPONSABLE,
      isActive: true,
      keycloakSubject: null,
    });
    update.mockResolvedValue({});
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: {
        sub: '1264a572-e4e5-4ad5-874a-f51a7d710483',
        email: 'responsable@impactc.local',
        email_verified: true,
        realm_access: { roles: [UserRole.RESPONSABLE] },
      },
    });
  });

  afterEach(() => {
    delete process.env.KEYCLOAK_BACKOFFICE_ENABLED;
    delete process.env.KEYCLOAK_ISSUER;
    delete process.env.KEYCLOAK_BACKOFFICE_CLIENT_ID;
  });

  it('accepts a verified Responsable token and links the Keycloak subject once', async () => {
    const guard = new KeycloakBackofficeGuard(
      prisma as never,
      legacyJwt as never,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(createRemoteJWKSet).toHaveBeenCalledWith(
      new URL(
        'https://auth.optimizesolux.com/realms/impactc/protocol/openid-connect/certs',
      ),
    );
    expect(jwtVerify).toHaveBeenCalledWith(
      'keycloak-token',
      expect.anything(),
      {
        issuer: 'https://auth.optimizesolux.com/realms/impactc',
        audience: 'impactc-backoffice',
      },
    );
    expect(update).toHaveBeenCalledWith({
      where: { id: '5ebcf882-973d-4cf7-af55-e2a6a3e8d3dc' },
      data: { keycloakSubject: '1264a572-e4e5-4ad5-874a-f51a7d710483' },
    });
    expect(request.user).toEqual({
      sub: '5ebcf882-973d-4cf7-af55-e2a6a3e8d3dc',
      email: 'responsable@impactc.local',
      role: UserRole.RESPONSABLE,
    });
  });

  it('rejects an OIDC token without a supervision role', async () => {
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: {
        sub: '1264a572-e4e5-4ad5-874a-f51a7d710483',
        email: 'responsable@impactc.local',
        email_verified: true,
        realm_access: { roles: [] },
      },
    });
    const guard = new KeycloakBackofficeGuard(
      prisma as never,
      legacyJwt as never,
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a Keycloak subject already linked to another internal account', async () => {
    findUnique.mockResolvedValue({
      id: '5ebcf882-973d-4cf7-af55-e2a6a3e8d3dc',
      email: 'responsable@impactc.local',
      role: UserRole.RESPONSABLE,
      isActive: true,
      keycloakSubject: '731db9a0-1ad8-4b07-a74e-8059c49d7843',
    });
    const guard = new KeycloakBackofficeGuard(
      prisma as never,
      legacyJwt as never,
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a Keycloak role that differs from the provisioned ImpactC role', async () => {
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: {
        sub: '1264a572-e4e5-4ad5-874a-f51a7d710483',
        email: 'responsable@impactc.local',
        email_verified: true,
        realm_access: { roles: [UserRole.ADMIN] },
      },
    });
    const guard = new KeycloakBackofficeGuard(
      prisma as never,
      legacyJwt as never,
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('keeps the existing JWT guard as a development fallback', async () => {
    process.env.KEYCLOAK_BACKOFFICE_ENABLED = 'false';
    legacyJwt.canActivate.mockResolvedValue(true);
    const guard = new KeycloakBackofficeGuard(
      prisma as never,
      legacyJwt as never,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(legacyJwt.canActivate).toHaveBeenCalledWith(context);
    expect(jwtVerify).not.toHaveBeenCalled();
  });
});
