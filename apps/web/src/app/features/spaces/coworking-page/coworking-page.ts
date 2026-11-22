import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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

interface ContactContext {
  readonly reservation: BookingReservation;
  readonly scheduleContext: ScheduleContext;
}

interface PaymentContext {
  readonly submission: BookingContactSubmission;
  readonly scheduleContext: ScheduleContext;
}

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
  imports: [CoworkingBrand, SpaceFilters, FloorPlan, FloorPlanLegend, SpaceDetailsDialog, BookingSchedule, ContactForm, PaymentStep, BookingResult],
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
  protected readonly selectedSpace = signal<SpaceDetails | null>(null);
  protected readonly scheduleContext = signal<ScheduleContext | null>(null);
  protected readonly contactContext = signal<ContactContext | null>(null);
  protected readonly paymentContext = signal<PaymentContext | null>(null);
  protected readonly confirmation = signal<BookingConfirmation | null>(null);
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
    if (!space) return;

    this.selectedSpace.set({ ...space, ratesInKopiykas: DEMO_BOOKING_RATES_IN_KOPIYKAS });
    this.spaceSelected.emit(spaceId);
  }

  protected startBooking(request: SpaceBookingRequest): void {
    const space = this.selectedSpace();
    if (space?.id !== request.spaceId) return;

    this.scheduleContext.set({ space, mode: request.mode });
    this.bookingRequested.emit(request);
  }

  protected enterContacts(reservation: BookingReservation): void {
    const { schedule } = reservation;
    const context = this.scheduleContext();
    if (context?.space.id !== schedule.spaceId) return;

    this.contactContext.set({
      reservation,
      scheduleContext: { ...context, mode: schedule.mode },
    });
    this.releaseError.set('');
    this.refreshAvailability.next();
    this.scheduleSelected.emit(schedule);
  }

  protected closeContacts(context: ContactContext): void {
    this.contactContext.set(null);
    if (this.paymentContext()?.submission.reservation !== context.reservation) {
      this.releaseReservation(context.reservation);
    }
  }

  protected enterPayment(submission: BookingContactSubmission): void {
    const context = this.contactContext();
    if (context?.reservation !== submission.reservation) return;

    this.paymentContext.set({ submission, scheduleContext: context.scheduleContext });
    this.contactSubmitted.emit(submission);
  }

  protected confirmBooking(payment: BookingPayment): void {
    const context = this.paymentContext();
    if (context?.submission.reservation !== payment.reservation || this.confirmation()) return;

    this.confirmation.set(payment.confirmation);
    this.paymentSucceeded.emit(payment);
  }

  protected closePayment(reservation: BookingReservation | null): void {
    this.paymentContext.set(null);
    if (reservation) this.releaseReservation(reservation);
    else this.refreshAvailability.next();
  }

  private releaseReservation(reservation: BookingReservation): void {
    this.bookingApi.releaseSpace(reservation.token).subscribe({
      next: () => this.refreshAvailability.next(),
      error: () => this.releaseError.set('Не вдалося скасувати резерв. Місце звільниться після закінчення таймера.'),
    });
  }
}
