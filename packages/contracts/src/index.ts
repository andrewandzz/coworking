export const DESK_ZONES = ['open', 'quiet', 'window'] as const;
export const BOOKING_TIME_ZONE = 'Europe/Kyiv';
export const BOOKING_DAYS_AHEAD = 30;

export type DeskZone = (typeof DESK_ZONES)[number];

export interface Desk {
  id: string;
  zone: DeskZone;
}

export interface DeskAvailability extends Desk {
  available: boolean;
}

export interface BookingWindow {
  today: string;
  lastDate: string;
}

export interface Availability extends BookingWindow {
  date: string;
  desks: DeskAvailability[];
}

export interface CreateBooking {
  deskId: string;
  date: string;
}

export interface Booking {
  id: string;
  date: string;
  desk: Desk;
}

const kyivDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BOOKING_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function addCalendarDays(date: string, numberOfDays: number): string {
  const calendarDate = new Date(`${date}T00:00:00Z`);
  calendarDate.setUTCDate(calendarDate.getUTCDate() + numberOfDays);
  return calendarDate.toISOString().slice(0, 10);
}

export function getBookingWindow(now = new Date()): BookingWindow {
  const { year, month, day } = Object.fromEntries(
    kyivDateFormatter.formatToParts(now).map(({ type, value }) => [type, value]),
  );
  const today = `${year}-${month}-${day}`;
  return { today, lastDate: addCalendarDays(today, BOOKING_DAYS_AHEAD) };
}
