import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, Injector, input,
  linkedSignal, output, signal, viewChild,
} from '@angular/core';
import { LucideX } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { BookingApi, bookingErrorMessage } from '../../../booking-api';
import { ModalDialog } from '../../../shared/ui/modal-dialog';
import type { SpaceDetails } from '../../spaces/space-details-dialog/space-details-dialog';
import { SPACE_TYPE_LABELS } from '../../spaces/space-types';
import { BookingCancelDialog } from '../booking-cancel-dialog/booking-cancel-dialog';
import { formatBookingAmount, formatBookingDate, formatBookingHour } from '../booking-format';
import { BookingNotice } from '../booking-notice/booking-notice';
import type { BookingContactSubmission, BookingPayment, BookingReservation } from '../booking-reservation';
import { ReservationTimer } from '../reservation-timer/reservation-timer';

type PaymentPhase = 'ready' | 'payment-failed' | 'expired' | 'paid' | 'cancelled';

@Component({
  selector: 'app-payment-step',
  imports: [ModalDialog, BookingCancelDialog, BookingNotice, ReservationTimer, LucideX],
  templateUrl: './payment-step.html',
  styleUrl: './payment-step.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentStep {
  readonly space = input.required<SpaceDetails>();
  readonly submission = input.required<BookingContactSubmission>();
  readonly paid = output<BookingPayment>();
  readonly retryRequested = output();
  readonly closed = output<BookingReservation | null>();

  private readonly injector = inject(Injector);
  private readonly bookingApi = inject(BookingApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly paymentHeading = viewChild<ElementRef<HTMLHeadingElement>>('paymentHeading');
  private readonly cancelDialog = viewChild(BookingCancelDialog);
  protected readonly expiresAt = computed(() => this.submission().reservation.expiresAt);
  protected readonly phase = linkedSignal<PaymentPhase>(() => Date.now() >= this.expiresAt() ? 'expired' : 'ready');
  protected readonly pending = signal(false);
  protected readonly issueError = signal('');
  protected readonly confirmingCancellation = signal(false);
  private readonly paymentReady = computed(() => this.phase() === 'ready' && !this.pending() && !this.confirmingCancellation());
  protected readonly reservationActive = computed(() => this.phase() === 'ready' || this.phase() === 'payment-failed');
  protected readonly showsNotice = computed(() => this.phase() === 'expired' || this.phase() === 'payment-failed');
  protected readonly spaceLabel = computed(() => {
    const { type, number } = this.space();
    return `${SPACE_TYPE_LABELS[type].singular} ${number}`;
  });
  protected readonly date = computed(() => formatBookingDate(this.submission().reservation.schedule.date));
  protected readonly time = computed(() => {
    const { startHour, endHour } = this.submission().reservation.schedule;
    return `${formatBookingHour(startHour)} - ${formatBookingHour(endHour)} (${endHour - startHour} год)`;
  });
  protected readonly price = computed(() => formatBookingAmount(this.submission().reservation.schedule.totalInKopiykas));

  protected async pay(dialog: ModalDialog): Promise<void> {
    const paidAt = Date.now();
    if (!this.paymentReady() || !this.keepReservation(paidAt)) return;

    const submission = this.submission();
    const { schedule, token } = submission.reservation;
    const { spaceId, date, startHour, endHour, mode } = schedule;
    const { firstName, lastName, phone } = submission.contact;
    this.issueError.set('');
    this.pending.set(true);
    try {
      const pass = await firstValueFrom(
        this.bookingApi.confirmSpace({
          token, phone, customerName: `${firstName} ${lastName}`, spaceId, date, startHour, endHour, mode,
        }),
      );
      if (this.destroyRef.destroyed) return;

      this.phase.set('paid');
      this.paid.emit({
        ...submission,
        paidAt,
        confirmation: { bookingNumber: pass.bookingNumber, spaceLabel: pass.spaceLabel, checkInToken: token, schedule },
      });
      dialog.close();
    } catch (error) {
      if (this.destroyRef.destroyed) return;
      if ((error instanceof HttpErrorResponse && error.status === 410) || Date.now() >= this.expiresAt()) {
        this.phase.set('expired');
      } else {
        this.issueError.set(bookingErrorMessage(error, 'Не вдалося підтвердити оплату. Спробуйте ще раз.'));
      }
    } finally {
      this.pending.set(false);
    }
  }

  protected simulateError(): void {
    if (this.paymentReady() && this.keepReservation()) this.phase.set('payment-failed');
  }

  protected requestCancellation(): void {
    if (this.paymentReady() && this.keepReservation()) this.confirmingCancellation.set(true);
  }

  protected resumeBooking(): void {
    this.confirmingCancellation.set(false);
    this.keepReservation();
  }

  protected async confirmCancellation(dialog: ModalDialog): Promise<void> {
    if (!this.confirmingCancellation() || this.pending() || !this.keepReservation()) return;

    this.issueError.set('');
    this.pending.set(true);
    try {
      await firstValueFrom(this.bookingApi.releaseSpace(this.submission().reservation.token));
      if (this.destroyRef.destroyed) return;

      this.phase.set('cancelled');
      this.closeCancellation();
      dialog.close();
    } catch {
      if (this.destroyRef.destroyed) return;
      this.issueError.set('Не вдалося скасувати бронювання. Спробуйте ще раз.');
      this.closeCancellation();
    } finally {
      this.pending.set(false);
      if (this.reservationActive()) this.keepReservation();
    }
  }

  protected close(): void {
    this.closed.emit(this.reservationActive() ? this.submission().reservation : null);
  }

  protected retryPayment(): void {
    if (!this.keepReservation()) return;

    this.phase.set('ready');
    afterNextRender({ write: () => this.paymentHeading()?.nativeElement.focus() }, { injector: this.injector });
  }

  protected expire(): void {
    if (this.pending() || !this.reservationActive()) return;

    this.phase.set('expired');
    this.closeCancellation();
  }

  protected retryBooking(dialog: ModalDialog): void {
    this.retryRequested.emit();
    dialog.close();
  }

  private keepReservation(now = Date.now()): boolean {
    if (now < this.expiresAt()) return true;

    this.expire();
    return false;
  }

  private closeCancellation(): void {
    this.confirmingCancellation.set(false);
    this.cancelDialog()?.close();
  }
}
