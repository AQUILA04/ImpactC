import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/services/prisma.service';

export type TokenPair = { accessToken: string; refreshToken: string };

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async register(email: string, password: string): Promise<{ userId: string; tokens: TokenPair }> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new BadRequestException('A valid email is required');
    if (password.length < 12) throw new BadRequestException('Password must contain at least 12 characters');
    const exists = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (exists) throw new BadRequestException('Email is already registered');
    const user = await this.prisma.user.create({
      data: { email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12), role: UserRole.CELIBATAIRE },
    });
    return { userId: user.id, tokens: await this.issueTokens(user.id, user.email, user.role) };
  }

  async login(email: string, password: string): Promise<{ userId: string; role: UserRole; tokens: TokenPair }> {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, include: { profile: true } });
    if (!user?.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return { userId: user.id, role: user.role, tokens: await this.issueTokens(user.id, user.email, user.role, user.profile?.id) };
  }

  async refresh(token: string): Promise<TokenPair> {
    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync(token, { secret: process.env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
    const record = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti }, include: { user: { include: { profile: true } } } });
    if (!record || record.revokedAt || record.expiresAt <= new Date() || !(await bcrypt.compare(token, record.tokenHash))) {
      throw new UnauthorizedException('Refresh token is no longer valid');
    }
    await this.prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(record.user.id, record.user.email, record.user.role, record.user.profile?.id);
  }

  async provisionPrivileged(email: string, password: string, role: Extract<UserRole, 'RESPONSABLE' | 'ADMIN'>): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    await this.prisma.user.upsert({
      where: { email: normalizedEmail },
      update: { role, isActive: true, passwordHash: await bcrypt.hash(password, 12) },
      create: { email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12), role },
    });
  }

  private async issueTokens(userId: string, email: string, role: UserRole, profileId?: string): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync({ sub: userId, email, role, profileId }, { expiresIn: '15m' });
    const id = randomUUID();
    const refreshToken = await this.jwt.signAsync({ sub: userId, jti: id }, { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' });
    await this.prisma.refreshToken.create({
      data: { id, userId, tokenHash: await bcrypt.hash(refreshToken, 12), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
    return { accessToken, refreshToken };
  }
}
