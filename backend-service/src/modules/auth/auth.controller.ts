import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, JwtAuthGuard } from '../../common/auth.guard';
import type { JwtPayload } from '../../common/auth.guard';
import { AuthService } from './auth.service';

class CredentialsDto {
  email!: string;
  password!: string;
}

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() body: CredentialsDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.register(body.email ?? '', body.password ?? '');
    this.setRefreshCookie(response, result.tokens.refreshToken);
    return { userId: result.userId, accessToken: result.tokens.accessToken };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: CredentialsDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(body.email ?? '', body.password ?? '');
    this.setRefreshCookie(response, result.tokens.refreshToken);
    return { userId: result.userId, role: result.role, accessToken: result.tokens.accessToken };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: { refreshToken?: string }, @Res({ passthrough: true }) response: Response) {
    const token = body.refreshToken ?? response.req?.cookies?.impactc_refresh;
    const tokens = await this.auth.refresh(token ?? '');
    this.setRefreshCookie(response, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  private setRefreshCookie(response: Response, refreshToken: string): void {
    response.cookie('impactc_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });
  }
}
