import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BOOKING_PASS_PREFIX, BOOKING_TIME_ZONE, parseBookingPassToken } from '@coworking/contracts';
import type { BookingCheckIn } from '@coworking/contracts';
import { LucideCheck, LucideQrCode } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { formatBookingDate, formatBookingHour } from '../../booking/booking-format';
import { readQrImage } from './read-qr-image';

const checkInTimeFormatter = new Intl.DateTimeFormat('uk-UA', {
  timeZone: BOOKING_TIME_ZONE,
  dateStyle: 'short',
  timeStyle: 'short',
});

@Component({
  selector: 'app-manager-check-in-page',
  imports: [LucideCheck, LucideQrCode],
  templateUrl: './manager-check-in-page.html',
  styleUrl: './manager-check-in-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagerCheckInPage {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly code = signal('');
  protected readonly readingImage = signal(false);
  protected readonly submitting = signal(false);
  protected readonly busy = computed(() => this.readingImage() || this.submitting());
  protected readonly error = signal('');
  protected readonly result = signal<BookingCheckIn | null>(null);
  protected readonly formatBookingDate = formatBookingDate;
  protected readonly formatBookingHour = formatBookingHour;
  protected readonly checkInTime = computed(() => {
    const result = this.result();
    return result ? checkInTimeFormatter.format(new Date(result.usedAt)) : '';
  });

  protected updateCode(code: string): void {
    this.code.set(code);
    this.error.set('');
    this.result.set(null);
  }

  protected async readImage(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.busy()) return;

    this.updateCode('');
    this.readingImage.set(true);
    try {
      const code = await readQrImage(file);
      if (this.destroyRef.destroyed) return;

      const token = code ? parseBookingPassToken(code) : undefined;
      if (token) this.code.set(`${BOOKING_PASS_PREFIX}${token}`);
      else this.error.set('На зображенні не знайдено QR-код перепустки.');
    } catch {
      if (!this.destroyRef.destroyed) this.error.set('Не вдалося прочитати зображення. Спробуйте інший файл.');
    } finally {
      this.readingImage.set(false);
    }
  }

  protected async checkIn(event: SubmitEvent, field: HTMLInputElement): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;

    this.result.set(null);
    this.error.set('');
    const token = parseBookingPassToken(this.code());
    if (!token) {
      this.error.set('Введіть коректний код перепустки.');
      field.focus();
      return;
    }

    this.submitting.set(true);
    try {
      const result = await firstValueFrom(this.http.post<BookingCheckIn>('/api/manager/check-ins', { token }, { timeout: 12_000 }));
      if (this.destroyRef.destroyed) return;

      this.code.set('');
      this.result.set(result);
      field.focus();
    } catch (error) {
      if (this.destroyRef.destroyed) return;
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      if (status === 401) {
        void this.router.navigate(['/manager', 'login'], { replaceUrl: true });
      } else if (status === 404) {
        this.error.set('Перепустку не знайдено.');
      } else if (status === 409) {
        this.error.set('Цю перепустку вже використано.');
      } else {
        this.error.set('Не вдалося перевірити перепустку. Спробуйте ще раз.');
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
