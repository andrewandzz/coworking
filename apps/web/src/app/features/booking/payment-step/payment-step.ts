import { HttpClient } from '@angular/common/http';
import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, Injector, input,
  linkedSignal, output, signal, viewChild,
} from '@angular/core';
import type { IssueBookingPassRequest, IssuedBookingPass } from '@coworking/contracts';
import { LucideX } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { ModalDialog } from '../../../shared/ui/modal-dialog';
import type { SpaceDetails } from '../../spaces/space-details-dialog/space-details-dialog';
import { SPACE_TYPE_LABELS } from '../../spaces/space-types';
import { BookingCancelDialog } from '../booking-cancel-dialog/booking-cancel-dialog';
import { formatBookingAmount, formatBookingDate, formatBookingHour } from '../booking-format';
import { BookingNotice } from '../booking-notice/booking-notice';
import type { BookingContactSubmission, BookingPayment } from '../booking-reservation';
import { ReservationTimer } from '../reservation-timer/reservation-timer';

type PaymentPhase = 'ready' | 'payment-failed' | 'expired' | 'paid';

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
  readonly closed = output();

  private readonly injector = inject(Injector);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly paymentHeading = viewChild<ElementRef<HTMLHeadingElement>>('paymentHeading');
  private readonly cancelDialog = viewChild(BookingCancelDialog);
  private readonly passToken = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');

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
    const schedule = submission.reservation.schedule;
    const { spaceId, date, startHour, endHour } = schedule;
    const request: IssueBookingPassRequest = { token: this.passToken, spaceId, date, startHour, endHour };
    this.issueError.set('');
    this.pending.set(true);
    try {
      const pass = await firstValueFrom(this.http.post<IssuedBookingPass>('/api/booking-passes', request, { timeout: 12_000 }));
      if (this.destroyRef.destroyed) return;

      this.phase.set('paid');
      this.paid.emit({
        ...submission,
        paidAt,
        confirmation: { bookingNumber: pass.bookingNumber, spaceLabel: pass.spaceLabel, checkInToken: this.passToken, schedule },
      });
      dialog.close();
    } catch {
      if (this.destroyRef.destroyed) return;
      if (Date.now() >= this.expiresAt()) this.phase.set('expired');
      else this.issueError.set('Не вдалося створити перепустку. Спробуйте ще раз.');
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

  protected confirmCancellation(dialog: ModalDialog): void {
    if (!this.confirmingCancellation() || !this.keepReservation()) return;

    this.closeCancellation();
    dialog.close();
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
