import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, inject, Injector, input,
  linkedSignal, output, viewChild,
} from '@angular/core';
import { LucideX } from '@lucide/angular';
import { ModalDialog } from '../../../shared/ui/modal-dialog';
import type { SpaceDetails } from '../../spaces/space-details-dialog/space-details-dialog';
import { SPACE_TYPE_LABELS } from '../../spaces/space-types';
import { formatBookingAmount, formatBookingDate, formatBookingHour } from '../booking-format';
import { BookingNotice } from '../booking-notice/booking-notice';
import type { BookingContactSubmission, BookingPayment } from '../booking-reservation';
import { ReservationTimer } from '../reservation-timer/reservation-timer';

type PaymentPhase = 'ready' | 'payment-failed' | 'expired' | 'paid';

@Component({
  selector: 'app-payment-step',
  imports: [ModalDialog, BookingNotice, ReservationTimer, LucideX],
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
  private readonly paymentHeading = viewChild<ElementRef<HTMLHeadingElement>>('paymentHeading');

  protected readonly expiresAt = computed(() => this.submission().reservation.expiresAt);
  protected readonly phase = linkedSignal<PaymentPhase>(() => Date.now() >= this.expiresAt() ? 'expired' : 'ready');
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

  protected pay(dialog: ModalDialog): void {
    const paidAt = Date.now();
    if (this.phase() !== 'ready' || !this.keepReservation(paidAt)) return;

    this.phase.set('paid');
    this.paid.emit({ ...this.submission(), paidAt });
    dialog.close();
  }

  protected simulateError(): void {
    if (this.phase() === 'ready' && this.keepReservation()) this.phase.set('payment-failed');
  }

  protected retryPayment(): void {
    if (!this.keepReservation()) return;

    this.phase.set('ready');
    afterNextRender({ write: () => this.paymentHeading()?.nativeElement.focus() }, { injector: this.injector });
  }

  protected expire(): void {
    if (this.reservationActive()) this.phase.set('expired');
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
}
