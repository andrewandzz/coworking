import { createHash, randomBytes } from 'node:crypto';
import { HttpException, HttpStatus, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { ManagerCredentials, ManagerSession } from '@coworking/contracts';
import { z } from 'zod';
import { parseManagerPasswordHash, verifyManagerPassword } from './manager-password.js';

export const MANAGER_SESSION_SECONDS = 8 * 60 * 60;
export const managerEmailSchema = z.string().trim().max(254).toLowerCase().pipe(z.email());

function sessionKey(token: string): string {
  return createHash('sha256').update(token, 'hex').digest('hex');
}

@Injectable()
export class ManagerAuthService {
  private readonly managerEmail = managerEmailSchema.safeParse(process.env.MANAGER_EMAIL).data;
  private readonly passwordHash = parseManagerPasswordHash(process.env.MANAGER_PASSWORD_HASH);
  private readonly sessions = new Map<string, number>();
  private readonly attempts = new Map<string, number>();
  private attemptWindowEndsAt = 0;
  private verificationsInProgress = 0;

  async signIn(
    credentials: ManagerCredentials,
    ip: string,
    previousToken?: string,
  ): Promise<{ session: ManagerSession; token: string }> {
    const { managerEmail, passwordHash } = this;
    if (!managerEmail || !passwordHash) {
      throw new ServiceUnavailableException('Вхід менеджера ще не налаштовано.');
    }

    this.recordAttempt(ip);
    this.verificationsInProgress++;
    try {
      const passwordMatches = await verifyManagerPassword(credentials.password, passwordHash);
      if (credentials.email !== managerEmail || !passwordMatches) {
        throw new UnauthorizedException('Неправильний логін або пароль.');
      }
    } finally {
      this.verificationsInProgress--;
    }

    this.signOut(previousToken);
    const now = Date.now();
    for (const [key, expiresAt] of this.sessions) {
      if (expiresAt <= now) this.sessions.delete(key);
    }

    const token = randomBytes(32).toString('hex');
    this.sessions.set(sessionKey(token), now + MANAGER_SESSION_SECONDS * 1000);
    return { token, session: { manager: { email: managerEmail } } };
  }

  getSession(token?: string): ManagerSession {
    if (!token || !this.managerEmail) return { manager: null };

    const key = sessionKey(token);
    const expiresAt = this.sessions.get(key);
    if (expiresAt && expiresAt > Date.now()) return { manager: { email: this.managerEmail } };

    this.sessions.delete(key);
    return { manager: null };
  }

  signOut(token?: string): void {
    if (token) this.sessions.delete(sessionKey(token));
  }

  private recordAttempt(ip: string): void {
    const now = Date.now();
    if (now >= this.attemptWindowEndsAt) {
      this.attempts.clear();
      this.attemptWindowEndsAt = now + 60_000;
    }

    const attempts = this.attempts.get(ip) ?? 0;
    if (attempts >= 10 || this.verificationsInProgress >= 4) {
      throw new HttpException('Забагато спроб входу. Спробуйте за хвилину.', HttpStatus.TOO_MANY_REQUESTS);
    }
    this.attempts.set(ip, attempts + 1);
  }
}
