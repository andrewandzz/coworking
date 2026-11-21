import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Booking, CreateBooking } from '@coworking/contracts';

const KEY_STORAGE_NAME = 'coworking.browser-key';

@Injectable({ providedIn: 'root' })
export class BookingApi {
  private readonly http = inject(HttpClient);
  private readonly key = getBrowserKey();
  readonly headers = this.key ? { Authorization: `Bearer ${this.key}` } : undefined;

  book(booking: CreateBooking) {
    return this.http.post<Booking>('/api/bookings', booking, { headers: this.headers, timeout: 12_000 });
  }

  cancel(id: string) {
    return this.http.delete<void>(`/api/bookings/${id}`, { headers: this.headers, timeout: 12_000 });
  }
}

export const storageMessage = 'Дозвольте локальне сховище браузера, щоб керувати бронюваннями.';

export function bookingErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500) {
    const message: unknown = error.error?.message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}

function getBrowserKey(): string | null {
  try {
    const existing = localStorage.getItem(KEY_STORAGE_NAME);
    if (existing && /^[a-f0-9]{64}$/.test(existing)) return existing;

    const key = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    localStorage.setItem(KEY_STORAGE_NAME, key);
    return key;
  } catch {
    return null;
  }
}
