import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';
import { addCalendarDays, getBookingWindow } from '@coworking/contracts';
import { CoworkingBrand } from '../../../shared/ui/coworking-brand/coworking-brand';
import { RESERVATION_DURATION_MS } from '../../booking/booking-reservation';
import type { BookingConfirmation, BookingContactSubmission, BookingPayment, BookingReservation } from '../../booking/booking-reservation';
import { BookingResult } from '../../booking/booking-result/booking-result';
import { BookingSchedule } from '../../booking/booking-schedule/booking-schedule';
import type { BookingScheduleSelection, OccupiedBookingSlot } from '../../booking/booking-schedule/booking-schedule';
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

interface CoworkingSpace extends FloorPlanSpace {
  readonly amenities: readonly SpaceAmenity[];
}

interface ScheduleContext {
  readonly space: SpaceDetails;
  readonly mode: BookingMode;
  readonly occupiedSlots: readonly OccupiedBookingSlot[];
}

interface ContactContext {
  readonly reservation: BookingReservation;
  readonly scheduleContext: ScheduleContext;
}

interface PaymentContext {
  readonly submission: BookingContactSubmission;
  readonly scheduleContext: ScheduleContext;
}

const DEMO_SPACES: readonly CoworkingSpace[] = [
  { id: 'desk-1', type: 'desk', number: 1, occupied: false, amenities: ['generator', 'dual-monitors'] },
  { id: 'desk-2', type: 'desk', number: 2, occupied: false, amenities: ['generator'] },
  { id: 'desk-3', type: 'desk', number: 3, occupied: true, amenities: ['generator', 'dual-monitors'] },
  { id: 'desk-4', type: 'desk', number: 4, occupied: true, amenities: ['quiet-zone'] },
  { id: 'desk-5', type: 'desk', number: 5, occupied: false, amenities: ['generator', 'dual-monitors', 'quiet-zone'] },
  { id: 'desk-6', type: 'desk', number: 6, occupied: false, amenities: ['generator', 'dual-monitors'] },
  { id: 'meeting-room-1', type: 'meeting-room', number: 1, occupied: false, amenities: ['generator'] },
  { id: 'meeting-room-2', type: 'meeting-room', number: 2, occupied: true, amenities: [] },
  { id: 'skype-booth-1', type: 'skype-booth', number: 1, occupied: false, amenities: ['quiet-zone'] },
  { id: 'skype-booth-2', type: 'skype-booth', number: 2, occupied: true, amenities: ['quiet-zone'] },
  { id: 'skype-booth-3', type: 'skype-booth', number: 3, occupied: false, amenities: ['quiet-zone'] },
];

const DEMO_RATES_IN_KOPIYKAS = { hourly: 8000, daily: 48000 };

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

  protected readonly selectedSpace = signal<SpaceDetails | null>(null);
  protected readonly scheduleContext = signal<ScheduleContext | null>(null);
  protected readonly contactContext = signal<ContactContext | null>(null);
  protected readonly paymentContext = signal<PaymentContext | null>(null);
  protected readonly confirmation = signal<BookingConfirmation | null>(null);
  protected readonly filters = signal<SpaceFiltersValue>(DEFAULT_SPACE_FILTERS);
  protected readonly filtersActive = computed(() => {
    const { type, amenities } = this.filters();
    return type !== 'all' || amenities.length > 0;
  });

  protected readonly planSpaces = computed(() => {
    const { type, amenities } = this.filters();
    return DEMO_SPACES.map((space) => ({
      ...space,
      matchesFilters: (type === 'all' || space.type === type)
        && amenities.every((amenity) => space.amenities.includes(amenity)),
    }));
  });

  protected selectSpace(spaceId: string): void {
    const space = DEMO_SPACES.find(({ id }) => id === spaceId);
    if (!space) return;

    this.selectedSpace.set({ ...space, ratesInKopiykas: DEMO_RATES_IN_KOPIYKAS });
    this.spaceSelected.emit(spaceId);
  }

  protected startBooking(request: SpaceBookingRequest): void {
    const space = this.selectedSpace();
    if (space?.id !== request.spaceId) return;

    const { today } = getBookingWindow();
    const occupiedSlots = space.id === 'desk-3'
      ? [{ date: today, hour: 9 }, { date: addCalendarDays(today, 1), hour: 9 }]
      : [];
    this.scheduleContext.set({ space, mode: request.mode, occupiedSlots });
    this.bookingRequested.emit(request);
  }

  protected enterContacts(schedule: BookingScheduleSelection): void {
    const context = this.scheduleContext();
    if (context?.space.id !== schedule.spaceId) return;

    this.contactContext.set({
      reservation: { schedule, expiresAt: Date.now() + RESERVATION_DURATION_MS },
      scheduleContext: { ...context, mode: schedule.mode },
    });
    this.scheduleSelected.emit(schedule);
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
}
