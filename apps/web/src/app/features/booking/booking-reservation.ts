import type { BookingScheduleSelection } from './booking-schedule/booking-schedule';

export const RESERVATION_DURATION_MS = 5 * 60 * 1000;

export interface BookingReservation {
  readonly schedule: BookingScheduleSelection;
  readonly expiresAt: number;
}

export interface BookingContact {
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string;
}

export interface BookingContactSubmission {
  readonly reservation: BookingReservation;
  readonly contact: BookingContact;
}

export interface BookingPayment extends BookingContactSubmission {
  readonly paidAt: number;
}

export interface BookingConfirmation {
  readonly bookingNumber: string;
  readonly checkInToken: string;
  readonly spaceLabel: string;
  readonly schedule: BookingScheduleSelection;
}
