import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output, signal, untracked } from '@angular/core';
import { addCalendarDays, BOOKING_TIME_ZONE, getBookingWindow } from '@coworking/contracts';
import { LucideCalendarDays, LucideX } from '@lucide/angular';
import { ModalDialog } from '../../../shared/ui/modal-dialog';
import type { BookingMode, SpaceDetails } from '../../spaces/space-details-dialog/space-details-dialog';
import { SPACE_TYPE_LABELS } from '../../spaces/space-types';
import { formatBookingAmount, formatBookingDate, formatBookingHour } from '../booking-format';

export interface OccupiedBookingSlot {
  readonly date: string;
  readonly hour: number;
}

export interface BookingScheduleSelection {
  readonly spaceId: string;
  readonly mode: BookingMode;
  readonly date: string;
  readonly startHour: number;
  readonly endHour: number;
  readonly totalInKopiykas: number;
}

interface HourSelection {
  readonly anchor: number;
  readonly end: number;
}

const OPENING_HOUR = 9;
const CLOSING_HOUR = 18;
const WORKDAY_HOURS = CLOSING_HOUR - OPENING_HOUR;
const TIME_SLOTS = Array.from({ length: WORKDAY_HOURS }, (_, index) => {
  const hour = OPENING_HOUR + index;
  const start = formatBookingHour(hour);
  return { hour, start, label: `${start} - ${formatBookingHour(hour + 1)}` };
});

const clockFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BOOKING_TIME_ZONE,
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
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
  readonly occupiedSlots = input<readonly OccupiedBookingSlot[]>([]);
  readonly continued = output<BookingScheduleSelection>();
  readonly closed = output();

  private readonly openedAt = new Date();
  private readonly openedTime = clockFormatter.format(this.openedAt);
  private readonly selectedHours = signal<HourSelection | null>(null);

  protected readonly today = getBookingWindow(this.openedAt).today;
  protected readonly mode = linkedSignal(() => this.initialMode());
  protected readonly date = linkedSignal(() => {
    const mode = this.initialMode();
    const occupied = untracked(this.occupiedSlots);
    let date = this.today;
    while (!this.canBookDate(date, mode, occupied)) {
      date = addCalendarDays(date, 1);
    }
    return date;
  });
  protected readonly dateLabel = computed(() => formatBookingDate(this.date()));
  protected readonly title = computed(() => {
    const { type, number } = this.space();
    return `Бронювання - ${SPACE_TYPE_LABELS[type].singular} ${number}`;
  });
  protected readonly workday = `${formatBookingHour(OPENING_HOUR)} - ${formatBookingHour(CLOSING_HOUR)} (${WORKDAY_HOURS} год)`;
  protected readonly slots = computed(() => this.slotsFor(this.date(), this.occupiedSlots()));
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
  }

  protected showDatePicker(input: HTMLInputElement): void {
    try {
      input.showPicker?.();
    } catch {
      // Keep the native field available for keyboard entry.
    }
  }

  protected selectHour(hour: number): void {
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

  protected continue(dialog: ModalDialog): void {
    const selection = this.selection();
    if (!selection) return;

    this.continued.emit(selection);
    dialog.close();
  }

  private isRangeFree(startHour: number, endHour: number): boolean {
    return this.slots().every((slot) => slot.hour < startHour || slot.hour >= endHour || slot.available);
  }

  private canBookDate(date: string, mode: BookingMode, occupied: readonly OccupiedBookingSlot[]): boolean {
    const slots = this.slotsFor(date, occupied);
    return mode === 'daily' ? slots.every(({ available }) => available) : slots.some(({ available }) => available);
  }

  private slotsFor(date: string, occupied: readonly OccupiedBookingSlot[]) {
    return TIME_SLOTS.map((slot) => ({
      ...slot,
      available: (date !== this.today || `${slot.start}:00` >= this.openedTime)
        && !occupied.some((booking) => booking.date === date && booking.hour === slot.hour),
    }));
  }
}
