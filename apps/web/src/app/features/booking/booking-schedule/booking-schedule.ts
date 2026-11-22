import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, linkedSignal, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  addCalendarDays, COWORKING_CLOSING_HOUR as CLOSING_HOUR,
  COWORKING_OPENING_HOUR as OPENING_HOUR, getBookingTime, getBookingWindow,
} from '@coworking/contracts';
import type { SpaceBookingRange } from '@coworking/contracts';
import { LucideCalendarDays, LucideX } from '@lucide/angular';
import { firstValueFrom, Subject, switchMap } from 'rxjs';
import { BookingApi, bookingErrorMessage } from '../../../booking-api';
import { ModalDialog } from '../../../shared/ui/modal-dialog';
import { showDatePicker } from '../../../shared/ui/native-date-picker';
import type { BookingMode, SpaceDetails } from '../../spaces/space-details-dialog/space-details-dialog';
import { SPACE_TYPE_LABELS } from '../../spaces/space-types';
import { formatBookingAmount, formatBookingDate, formatBookingHour } from '../booking-format';
import type { BookingReservation } from '../booking-reservation';

export interface BookingScheduleSelection extends Readonly<SpaceBookingRange> {
  readonly mode: BookingMode;
  readonly totalInKopiykas: number;
}

interface HourSelection {
  readonly anchor: number;
  readonly end: number;
}

const WORKDAY_HOURS = CLOSING_HOUR - OPENING_HOUR;
const TIME_SLOTS = Array.from({ length: WORKDAY_HOURS }, (_, index) => {
  const hour = OPENING_HOUR + index;
  const start = formatBookingHour(hour);
  return { hour, start, label: `${start} - ${formatBookingHour(hour + 1)}` };
});

@Component({
  selector: 'app-booking-schedule',
  imports: [ModalDialog, LucideCalendarDays, LucideX],
  templateUrl: './booking-schedule.html',
  styleUrl: './booking-schedule.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingSchedule {
  readonly space = input.required<SpaceDetails>();
  readonly initialMode = input.required<BookingMode>();
  readonly continued = output<BookingReservation>();
  readonly closed = output();

  private readonly bookingApi = inject(BookingApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refreshAvailability = new Subject<void>();
  private readonly openedAt = new Date();
  private readonly selectedHours = signal<HourSelection | null>(null);

  protected readonly today = getBookingWindow(this.openedAt).today;
  protected readonly showDatePicker = showDatePicker;
  protected readonly mode = linkedSignal(() => this.initialMode());
  protected readonly date = linkedSignal(() => {
    const latestStart = this.initialMode() === 'daily' ? OPENING_HOUR : CLOSING_HOUR - 1;
    return getBookingTime(this.openedAt) <= `${formatBookingHour(latestStart)}:00`
      ? this.today : addCalendarDays(this.today, 1);
  });
  private readonly availability = toSignal(toObservable(this.date).pipe(
    switchMap((date) => this.bookingApi.watchSpaceAvailability(date, this.refreshAvailability)),
  ));
  protected readonly reserving = signal(false);
  protected readonly reserveError = signal('');
  protected readonly availabilityReady = computed(() => this.availability()?.date === this.date());
  protected readonly availabilityFailed = computed(() => this.availability() === null);
  protected readonly dateLabel = computed(() => formatBookingDate(this.date()));
  protected readonly title = computed(() => {
    const { type, number } = this.space();
    return `Бронювання - ${SPACE_TYPE_LABELS[type].singular} ${number}`;
  });
  protected readonly workday = `${formatBookingHour(OPENING_HOUR)} - ${formatBookingHour(CLOSING_HOUR)} (${WORKDAY_HOURS} год)`;
  protected readonly slots = computed(() => {
    const day = this.availability();
    if (!day || day.date !== this.date()) return TIME_SLOTS.map((slot) => ({ ...slot, available: false }));

    const now = new Date(day.serverTime);
    const { today } = getBookingWindow(now);
    const cutoff = day.date === today ? getBookingTime(now) : '00:00:00';
    const occupied = day.occupied.filter(({ spaceId }) => spaceId === this.space().id);
    return TIME_SLOTS.map((slot) => ({
      ...slot,
      available: day.date >= today && `${slot.start}:00` >= cutoff
        && !occupied.some(({ startHour, endHour }) => slot.hour >= startHour && slot.hour < endHour),
    }));
  });
  protected readonly dayAvailable = computed(() => this.slots().every(({ available }) => available));
  protected readonly hoursAvailable = computed(() => this.slots().some(({ available }) => available));

  private readonly hourlyRange = computed(() => {
    const hours = this.selectedHours();
    if (!hours) return null;

    const startHour = Math.min(hours.anchor, hours.end);
    const endHour = Math.max(hours.anchor, hours.end) + 1;
    return this.isRangeFree(startHour, endHour) ? { startHour, endHour } : null;
  });
  protected readonly selection = computed<BookingScheduleSelection | null>(() => {
    const mode = this.mode();
    const range = mode === 'daily'
      ? (this.dayAvailable() ? { startHour: OPENING_HOUR, endHour: CLOSING_HOUR } : null)
      : this.hourlyRange();
    if (!range) return null;

    const space = this.space();
    const totalInKopiykas = space.ratesInKopiykas[mode]
      * (mode === 'hourly' ? range.endHour - range.startHour : 1);
    return { spaceId: space.id, mode, date: this.date(), ...range, totalInKopiykas };
  });
  protected readonly duration = computed(() => {
    const range = this.hourlyRange();
    return range ? range.endHour - range.startHour : 0;
  });
  protected readonly price = computed(() => formatBookingAmount(
    this.mode() === 'daily' ? this.space().ratesInKopiykas.daily : this.selection()?.totalInKopiykas ?? 0,
  ));

  protected selectDate(input: HTMLInputElement): void {
    if (!input.validity.valid) {
      input.value = this.date();
      return;
    }
    if (input.value === this.date()) return;

    this.date.set(input.value);
    this.selectedHours.set(null);
    this.reserveError.set('');
  }

  protected selectMode(mode: BookingMode): void {
    this.mode.set(mode);
    this.reserveError.set('');
  }

  protected selectHour(hour: number): void {
    this.reserveError.set('');
    const selection = this.selectedHours();
    if (selection?.anchor === hour && selection.end === hour) {
      this.selectedHours.set(null);
      return;
    }

    const anchor = selection?.anchor ?? hour;
    const extendsRange = this.isRangeFree(Math.min(anchor, hour), Math.max(anchor, hour) + 1);
    this.selectedHours.set({ anchor: extendsRange ? anchor : hour, end: hour });
  }

  protected isSelected(hour: number): boolean {
    const range = this.hourlyRange();
    return !!range && hour >= range.startHour && hour < range.endHour;
  }

  protected async continue(dialog: ModalDialog): Promise<void> {
    const schedule = this.selection();
    if (!schedule || this.reserving()) return;

    const { spaceId, date, startHour, endHour } = schedule;
    const token = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    this.reserving.set(true);
    this.reserveError.set('');
    try {
      const { expiresAt, serverTime } = await firstValueFrom(
        this.bookingApi.reserveSpace({ token, spaceId, date, startHour, endHour }),
      );
      if (this.destroyRef.destroyed) {
        this.releaseUnacknowledgedHold(token);
        return;
      }
      this.continued.emit({ token, schedule, expiresAt: Date.now() + expiresAt - serverTime });
      dialog.close();
    } catch (error) {
      if (!(error instanceof HttpErrorResponse) || error.status === 0 || error.status >= 500) {
        this.releaseUnacknowledgedHold(token);
      }
      if (!this.destroyRef.destroyed) {
        this.reserveError.set(bookingErrorMessage(error, 'Не вдалося зарезервувати час. Спробуйте ще раз.'));
        this.refreshAvailability.next();
      }
    } finally {
      this.reserving.set(false);
    }
  }

  private isRangeFree(startHour: number, endHour: number): boolean {
    return this.slots().every((slot) => slot.hour < startHour || slot.hour >= endHour || slot.available);
  }

  private releaseUnacknowledgedHold(token: string): void {
    this.bookingApi.releaseSpace(token).subscribe({ error: () => undefined });
  }
}
