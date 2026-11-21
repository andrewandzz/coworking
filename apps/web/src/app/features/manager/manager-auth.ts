import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ManagerCredentials, ManagerSession } from '@coworking/contracts';
import { firstValueFrom } from 'rxjs';

const authUrl = '/api/manager/auth';
const requestOptions = { timeout: 12_000 };

@Injectable({ providedIn: 'root' })
export class ManagerAuth {
  private readonly http = inject(HttpClient);

  getSession() {
    return this.http.get<ManagerSession>(`${authUrl}/session`, requestOptions);
  }

  signIn(credentials: ManagerCredentials): Promise<ManagerSession> {
    return firstValueFrom(this.http.post<ManagerSession>(`${authUrl}/login`, credentials, requestOptions));
  }

  signOut(): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${authUrl}/logout`, {}, requestOptions));
  }
}
