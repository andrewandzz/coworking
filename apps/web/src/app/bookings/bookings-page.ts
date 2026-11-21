import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Booking } from '@coworking/contracts';
import { LucideCalendarCheck } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { BookingApi, bookingErrorMessage, storageMessage } from '../booking-api';
import { ConfirmDialog } from '../confirm-dialog';
import { formatDate, zoneLabel } from '../labels';

@Component({
  imports: [RouterLink, ConfirmDialog, LucideCalendarCheck],
  templateUrl: './bookings-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingsPage {
  private readonly api = inject(BookingApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmation = viewChild.required(ConfirmDialog);

  protected readonly formatDate = formatDate;
  protected readonly zoneLabel = zoneLabel;
  protected readonly storageWarning = this.api.headers ? '' : storageMessage;
  protected readonly bookings = httpResource<Booking[]>(() => this.api.headers ? {
    url: '/api/bookings',
    headers: this.api.headers,
    timeout: 12_000,
  } : undefined);
  protected readonly selectedBooking = signal<Booking | null>(null);
  protected readonly pending = signal(false);
  protected readonly confirmationError = signal('');
  protected readonly notice = signal('');
  protected readonly confirmationDescription = computed(() => {
    const booking = this.selectedBooking();
    return booking ? `Місце ${booking.desk.id} знову стане вільним на ${formatDate(booking.date, 'long')}.` : '';
  });

  protected selectBooking(booking: Booking): void {
    this.selectedBooking.set(booking);
    this.confirmationError.set('');
    this.confirmation().show();
  }

  protected async confirmCancellation(): Promise<void> {
    const booking = this.selectedBooking();
    if (!booking || this.pending()) return;
    this.pending.set(true);
    this.confirmationError.set('');
    try {
      await firstValueFrom(this.api.cancel(booking.id));
      if (this.destroyRef.destroyed) return;
      this.notice.set(`Бронювання місця ${booking.desk.id} скасовано.`);
      this.confirmation().close();
      this.bookings.reload();
    } catch (error) {
      if (this.destroyRef.destroyed) return;
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.notice.set(bookingErrorMessage(error, 'Поточне бронювання не знайдено.'));
        this.confirmation().close();
        this.bookings.reload();
      } else {
        this.confirmationError.set(bookingErrorMessage(error, 'Не вдалося скасувати бронювання. Спробуйте ще раз.'));
      }
    } finally {
      this.pending.set(false);
    }
  }
}
