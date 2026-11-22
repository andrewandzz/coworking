import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DEMO_BOOKING_RATES_IN_KOPIYKAS, getBookingTime } from '@coworking/contracts';
import { Subject } from 'rxjs';
import { BookingApi } from '../../../booking-api';
import { CoworkingBrand } from '../../../shared/ui/coworking-brand/coworking-brand';
import type { BookingConfirmation, BookingContactSubmission, BookingPayment, BookingReservation } from '../../booking/booking-reservation';
import { BookingResult } from '../../booking/booking-result/booking-result';
import { BookingSchedule } from '../../booking/booking-schedule/booking-schedule';
import type { BookingScheduleSelection } from '../../booking/booking-schedule/booking-schedule';
import { ContactForm } from '../../booking/contact-form/contact-form';
import { PaymentStep } from '../../booking/payment-step/payment-step';
import { FloorPlan } from '../floor-plan/floor-plan';
import type { FloorPlanSpace } from '../floor-plan/floor-plan';
import { FloorPlanLegend } from '../floor-plan-legend/floor-plan-legend';
import { SpaceDetailsDialog } from '../space-details-dialog/space-details-dialog';
import type { BookingMode, SpaceBookingRequest, SpaceDetails } from '../space-details-dialog/space-details-dialog';
import { DEFAULT_SPACE_FILTERS, SpaceFilters } from '../space-filters/space-filters';
import type { SpaceFiltersValue } from '../space-filters/space-filters';
import type { SpaceAmenity } from '../space-types';

interface CoworkingSpace extends Omit<FloorPlanSpace, 'occupied'> {
  readonly amenities: readonly SpaceAmenity[];
}

interface ScheduleContext {
  readonly space: SpaceDetails;
  readonly mode: BookingMode;
}

type BookingStep =
  | { readonly kind: 'idle' }
  | { readonly kind: 'details'; readonly space: SpaceDetails }
  | { readonly kind: 'schedule'; readonly scheduleContext: ScheduleContext }
  | { readonly kind: 'contacts'; readonly scheduleContext: ScheduleContext; readonly reservation: BookingReservation }
  | { readonly kind: 'payment'; readonly scheduleContext: ScheduleContext; readonly submission: BookingContactSubmission }
  | { readonly kind: 'confirmation'; readonly confirmation: BookingConfirmation };

const SPACES: readonly CoworkingSpace[] = [
  { id: 'desk-1', type: 'desk', number: 1, amenities: ['generator', 'dual-monitors'] },
  { id: 'desk-2', type: 'desk', number: 2, amenities: ['generator'] },
  { id: 'desk-3', type: 'desk', number: 3, amenities: ['generator', 'dual-monitors'] },
  { id: 'desk-4', type: 'desk', number: 4, amenities: ['quiet-zone'] },
  { id: 'desk-5', type: 'desk', number: 5, amenities: ['generator', 'dual-monitors', 'quiet-zone'] },
  { id: 'desk-6', type: 'desk', number: 6, amenities: ['generator', 'dual-monitors'] },
  { id: 'meeting-room-1', type: 'meeting-room', number: 1, amenities: ['generator'] },
  { id: 'meeting-room-2', type: 'meeting-room', number: 2, amenities: [] },
  { id: 'skype-booth-1', type: 'skype-booth', number: 1, amenities: ['quiet-zone'] },
  { id: 'skype-booth-2', type: 'skype-booth', number: 2, amenities: ['quiet-zone'] },
  { id: 'skype-booth-3', type: 'skype-booth', number: 3, amenities: ['quiet-zone'] },
];

@Component({
  selector: 'app-coworking-page',
  imports: [
    RouterLink, CoworkingBrand, SpaceFilters, FloorPlan, FloorPlanLegend,
    SpaceDetailsDialog, BookingSchedule, ContactForm, PaymentStep, BookingResult,
  ],
  templateUrl: './coworking-page.html',
  styleUrl: './coworking-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoworkingPage {
  readonly spaceSelected = output<string>();
  readonly bookingRequested = output<SpaceBookingRequest>();
  readonly scheduleSelected = output<BookingScheduleSelection>();
  readonly contactSubmitted = output<BookingContactSubmission>();
  readonly paymentSucceeded = output<BookingPayment>();

  private readonly bookingApi = inject(BookingApi);
  private readonly refreshAvailability = new Subject<void>();
  private readonly availability = toSignal(this.bookingApi.watchSpaceAvailability(undefined, this.refreshAvailability));

  protected readonly availabilityFailed = computed(() => this.availability() === null);
  protected readonly releaseError = signal('');
  protected readonly bookingStep = signal<BookingStep>({ kind: 'idle' });
  protected readonly filters = signal<SpaceFiltersValue>(DEFAULT_SPACE_FILTERS);

  protected readonly planSpaces = computed(() => {
    const { type, amenities } = this.filters();
    const availability = this.availability();
    const hour = availability ? Number(getBookingTime(new Date(availability.serverTime)).slice(0, 2)) : -1;
    const occupiedSpaces = new Set(availability?.occupied
      .filter(({ startHour, endHour }) => startHour <= hour && hour < endHour)
      .map(({ spaceId }) => spaceId));
    return SPACES.map((space) => ({
      ...space,
      occupied: occupiedSpaces.has(space.id),
      matchesFilters: (type === 'all' || space.type === type)
        && amenities.every((amenity) => space.amenities.includes(amenity)),
    }));
  });

  protected selectSpace(spaceId: string): void {
    const space = SPACES.find(({ id }) => id === spaceId);
    if (!space || this.bookingStep().kind !== 'idle') return;

    this.bookingStep.set({ kind: 'details', space: { ...space, ratesInKopiykas: DEMO_BOOKING_RATES_IN_KOPIYKAS } });
    this.spaceSelected.emit(spaceId);
  }

  protected startBooking(request: SpaceBookingRequest): void {
    const step = this.bookingStep();
    if (step.kind !== 'details' || step.space.id !== request.spaceId) return;

    this.bookingStep.set({ kind: 'schedule', scheduleContext: { space: step.space, mode: request.mode } });
    this.bookingRequested.emit(request);
  }

  protected enterContacts(reservation: BookingReservation): void {
    const { schedule } = reservation;
    const step = this.bookingStep();
    if (step.kind !== 'schedule' || step.scheduleContext.space.id !== schedule.spaceId) return;

    this.bookingStep.set({
      kind: 'contacts',
      reservation,
      scheduleContext: { ...step.scheduleContext, mode: schedule.mode },
    });
    this.releaseError.set('');
    this.refreshAvailability.next();
    this.scheduleSelected.emit(schedule);
  }

  protected enterPayment(submission: BookingContactSubmission): void {
    const step = this.bookingStep();
    if (step.kind !== 'contacts' || step.reservation !== submission.reservation) return;

    this.bookingStep.set({ kind: 'payment', submission, scheduleContext: step.scheduleContext });
    this.contactSubmitted.emit(submission);
  }

  protected confirmBooking(payment: BookingPayment): void {
    const step = this.bookingStep();
    if (step.kind !== 'payment' || step.submission.reservation !== payment.reservation) return;

    this.bookingStep.set({ kind: 'confirmation', confirmation: payment.confirmation });
    this.paymentSucceeded.emit(payment);
    this.refreshAvailability.next();
  }

  protected restartBooking(step: Extract<BookingStep, { kind: 'contacts' | 'payment' }>): void {
    if (this.bookingStep() !== step) return;

    this.bookingStep.set({ kind: 'schedule', scheduleContext: step.scheduleContext });
    if (step.kind === 'contacts') this.releaseReservation(step.reservation);
    else this.refreshAvailability.next();
  }

  protected closeStep(step: BookingStep, reservation: BookingReservation | null = null): void {
    // A dialog can close immediately after it advances the flow.
    if (this.bookingStep() !== step) return;

    this.bookingStep.set({ kind: 'idle' });
    if (reservation) this.releaseReservation(reservation);
    else if (step.kind === 'contacts' || step.kind === 'payment') this.refreshAvailability.next();
  }

  private releaseReservation(reservation: BookingReservation): void {
    this.bookingApi.releaseSpace(reservation.token).subscribe({
      next: () => this.refreshAvailability.next(),
      error: () => this.releaseError.set('Не вдалося скасувати резерв. Місце звільниться після закінчення таймера.'),
    });
  }
}
