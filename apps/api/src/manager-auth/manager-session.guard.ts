import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ManagerAuthService } from './manager-auth.service.js';
import { readSessionToken } from './manager-session-cookie.js';

@Injectable()
export class ManagerSessionGuard implements CanActivate {
  constructor(private readonly auth: ManagerAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: { cookie?: string } }>();
    if (this.auth.getSession(readSessionToken(request.headers.cookie)).manager) return true;

    throw new UnauthorizedException('Увійдіть до розділу менеджера.');
  }
}
