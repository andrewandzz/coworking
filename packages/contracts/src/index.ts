export { normalizeUkrainianPhone } from './ukrainian-phone.js';

export const DESK_ZONES = ['open', 'quiet', 'window'] as const;
export const BOOKING_TIME_ZONE = 'Europe/Kyiv';
export const BOOKING_DAYS_AHEAD = 30;
export const COWORKING_OPENING_HOUR = 9;
export const COWORKING_CLOSING_HOUR = 18;
export const DEMO_BOOKING_RATES_IN_KOPIYKAS = { hourly: 8_000, daily: 48_000 } as const;
export const RESERVATION_DURATION_MS = 5 * 60 * 1000;

export const SPACE_TYPE_LABELS = {
  desk: { singular: 'Робочий стіл', plural: 'Робочі столи' },
  'meeting-room': { singular: 'Переговорна кімната', plural: 'Переговорні кімнати' },
  'skype-booth': { singular: 'Skype-кабіна', plural: 'Skype-кабіни' },
} as const;

export type SpaceType = keyof typeof SPACE_TYPE_LABELS;

export const BOOKING_PASS_PREFIX = 'coworking:';
export const BOOKING_PASS_TOKEN_PATTERN = /^[a-f0-9]{32}$/;

export interface SpaceBookingRange {
  spaceId: string;
  date: string;
  startHour: number;
  endHour: number;
}

export interface ReserveSpaceRequest extends SpaceBookingRange {
  token: string;
}

export interface ReservationDeadline {
  expiresAt: number;
  serverTime: number;
}

export interface SpaceAvailability {
  date: string;
  serverTime: number;
  occupied: Omit<SpaceBookingRange, 'date'>[];
}

export interface IssueBookingPassRequest extends ReserveSpaceRequest {
  phone: string;
}

export interface IssuedBookingPass {
  bookingNumber: string;
  spaceLabel: string;
  date: string;
  startHour: number;
  endHour: number;
}

export interface BookingCheckIn extends IssuedBookingPass {
  usedAt: string;
}

export function parseBookingPassToken(value: string): string | undefined {
  const code = value.trim().toLowerCase();
  const token = code.startsWith(BOOKING_PASS_PREFIX) ? code.slice(BOOKING_PASS_PREFIX.length) : code;
  return BOOKING_PASS_TOKEN_PATTERN.test(token) ? token : undefined;
}

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

export interface ManagerCredentials {
  email: string;
  password: string;
}

export interface ManagerSession {
  manager: { email: string } | null;
}

export const MANAGER_BOOKING_STATUSES = ['booked', 'completed', 'cancelled'] as const;

export type ManagerBookingStatus = (typeof MANAGER_BOOKING_STATUSES)[number];

export interface ManagerBookingSummary {
  bookingNumber: string;
  customerName: string;
  phone: string;
  date: string;
  startHour: number;
  endHour: number;
  status: ManagerBookingStatus;
}

export interface ManagerBookingDetails extends ManagerBookingSummary {
  spaceLabel: string;
  amountInKopiykas: number;
}

export interface ManagerBookingsResult {
  bookings: ManagerBookingSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ManagerReportPeriod {
  from: string;
  to: string;
}

export type ManagerReportBooking = Pick<
  ManagerBookingDetails, 'bookingNumber' | 'customerName' | 'phone' | 'date' | 'startHour' | 'endHour' | 'amountInKopiykas'
>;

export interface ManagerRevenueReport {
  period: ManagerReportPeriod;
  bookings: ManagerReportBooking[];
  page: number;
  pageSize: number;
  total: number;
  totalRevenueInKopiykas: number;
}

const kyivDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BOOKING_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const kyivTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BOOKING_TIME_ZONE,
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export function getBookingTime(now: Date): string {
  return kyivTimeFormatter.format(now);
}

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
