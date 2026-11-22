import type { BookingScheduleSelection } from './booking-schedule/booking-schedule';

export interface BookingReservation {
  readonly token: string;
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
  readonly confirmation: BookingConfirmation;
}

export interface BookingConfirmation {
  readonly bookingNumber: string;
  readonly checkInToken: string;
  readonly spaceLabel: string;
  readonly schedule: BookingScheduleSelection;
}
