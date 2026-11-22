import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  Booking, CreateBooking, IssueBookingPassRequest, IssuedBookingPass, ReservationDeadline, ReserveSpaceRequest, SpaceAvailability,
} from '@coworking/contracts';
import { catchError, exhaustMap, merge, of, timer } from 'rxjs';
import type { Observable } from 'rxjs';

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

  watchSpaceAvailability(date: string | undefined, refresh: Observable<void>) {
    const params = date ? { date } : undefined;
    return merge(timer(0, 5_000), refresh).pipe(
      exhaustMap(() => this.http.get<SpaceAvailability>('/api/booking-reservations', { params, timeout: 12_000 }).pipe(
        catchError(() => of(null)),
      )),
    );
  }

  reserveSpace(request: ReserveSpaceRequest) {
    return this.http.post<ReservationDeadline>('/api/booking-reservations', request, { timeout: 12_000 });
  }

  releaseSpace(token: string) {
    return this.http.post<void>('/api/booking-reservations/cancel', { token }, { timeout: 12_000 });
  }

  confirmSpace(request: IssueBookingPassRequest) {
    return this.http.post<IssuedBookingPass>('/api/booking-passes', request, { timeout: 12_000 });
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
