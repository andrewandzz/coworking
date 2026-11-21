import { Body, Controller, Get, Header, Headers, HttpCode, Ip, Post, Res } from '@nestjs/common';
import type { ManagerCredentials, ManagerSession } from '@coworking/contracts';
import { z } from 'zod';
import { MANAGER_SESSION_SECONDS, ManagerAuthService, managerEmailSchema } from './manager-auth.service.js';
import { MAX_MANAGER_PASSWORD_LENGTH } from './manager-password.js';
import { readSessionToken, sessionCookie } from './manager-session-cookie.js';
import { requireJson } from './require-json.js';

const loginSchema = z.strictObject({
  email: managerEmailSchema,
  password: z.string().min(1).max(MAX_MANAGER_PASSWORD_LENGTH),
});

interface CookieResponse {
  setHeader(name: string, value: string): void;
}

@Controller('manager/auth')
export class ManagerAuthController {
  constructor(private readonly auth: ManagerAuthService) {}

  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async login(
    @Body({ schema: loginSchema }) credentials: ManagerCredentials,
    @Ip() ip: string,
    @Headers('cookie') cookie: string | undefined,
    @Headers('content-type') contentType: string | undefined,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<ManagerSession> {
    requireJson(contentType);
    const { token, session } = await this.auth.signIn(credentials, ip, readSessionToken(cookie));
    response.setHeader('Set-Cookie', sessionCookie(token, MANAGER_SESSION_SECONDS));
    return session;
  }

  @Get('session')
  @Header('Cache-Control', 'no-store')
  session(@Headers('cookie') cookie: string | undefined): ManagerSession {
    return this.auth.getSession(readSessionToken(cookie));
  }

  @Post('logout')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  logout(
    @Headers('cookie') cookie: string | undefined,
    @Headers('content-type') contentType: string | undefined,
    @Res({ passthrough: true }) response: CookieResponse,
  ): void {
    requireJson(contentType);
    this.auth.signOut(readSessionToken(cookie));
    response.setHeader('Set-Cookie', sessionCookie('', 0));
  }
}
