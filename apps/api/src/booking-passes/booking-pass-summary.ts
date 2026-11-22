import {
  COWORKING_CLOSING_HOUR, COWORKING_OPENING_HOUR, DEMO_BOOKING_RATES_IN_KOPIYKAS, SPACE_TYPE_LABELS,
} from '@coworking/contracts';
import type { BookingMode, IssuedBookingPass, SpaceBookingRange, SpaceType } from '@coworking/contracts';
import type { BookingPassEntity } from './booking-pass.entity.js';

type BookingHours = Pick<SpaceBookingRange, 'startHour' | 'endHour'>;

export function describeBookingPass(pass: BookingPassEntity): IssuedBookingPass {
  const numberStart = pass.spaceId.lastIndexOf('-');
  const type = pass.spaceId.slice(0, numberStart) as SpaceType;
  const number = pass.spaceId.slice(numberStart + 1);
  return {
    bookingNumber: `CW-${String(pass.id).padStart(4, '0')}`,
    spaceLabel: `${SPACE_TYPE_LABELS[type].singular} ${number}`,
    date: pass.date,
    startHour: pass.startHour,
    endHour: pass.endHour,
  };
}

export function isWholeWorkday({ startHour, endHour }: BookingHours): boolean {
  return startHour === COWORKING_OPENING_HOUR && endHour === COWORKING_CLOSING_HOUR;
}

export function calculateBookingAmount(hours: BookingHours, mode?: BookingMode): number | null {
  const { hourly, daily } = DEMO_BOOKING_RATES_IN_KOPIYKAS;
  if (mode === 'daily') return daily;
  // Older full-day bookings can use either tariff for the same interval.
  if (mode === undefined && isWholeWorkday(hours)) return null;
  return hourly * (hours.endHour - hours.startHour);
}
