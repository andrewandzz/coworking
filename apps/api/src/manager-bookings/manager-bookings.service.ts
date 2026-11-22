import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getBookingTime, getBookingWindow, normalizeUkrainianPhone } from '@coworking/contracts';
import type {
  ManagerBookingDetails, ManagerBookingsResult, ManagerBookingStatus, ManagerReportPeriod, ManagerRevenueReport,
} from '@coworking/contracts';
import { Between, IsNull, Repository } from 'typeorm';
import { BookingPassEntity } from '../booking-passes/booking-pass.entity.js';
import { calculateBookingAmount, describeBookingPass } from '../booking-passes/booking-pass-summary.js';
import { paginateBookings } from './paginate-bookings.js';

const bookingsPageSize = 7;
const reportPageSize = 6;

const bookingFields = {
  id: true, spaceId: true, date: true, startHour: true, endHour: true,
  customerName: true, phone: true, amountInKopiykas: true, cancelledAt: true,
} as const;

function bookingClock(now = new Date()) {
  return { today: getBookingWindow(now).today, hour: Number(getBookingTime(now).slice(0, 2)) };
}

function describeBooking(pass: BookingPassEntity, { today, hour }: ReturnType<typeof bookingClock>): ManagerBookingDetails {
  const completed = pass.date < today || (pass.date === today && pass.endHour <= hour);
  const status = pass.cancelledAt !== null ? 'cancelled' : completed ? 'completed' : 'booked';
  return {
    ...describeBookingPass(pass),
    customerName: pass.customerName,
    phone: pass.phone,
    status,
    amountInKopiykas: pass.amountInKopiykas ?? calculateBookingAmount(pass),
  };
}

@Injectable()
export class ManagerBookingsService {
  constructor(@InjectRepository(BookingPassEntity) private readonly passes: Repository<BookingPassEntity>) {}

  async list(q: string, status: ManagerBookingStatus | undefined, page: number): Promise<ManagerBookingsResult> {
    const records = await this.passes.find({
      select: bookingFields,
      where: { holdExpiresAt: IsNull() },
      order: { date: 'DESC', startHour: 'DESC', id: 'DESC' },
    });
    const clock = bookingClock();
    const phoneQuery = /^[\d\s()+.-]+$/.test(q) ? normalizeUkrainianPhone(q) ?? q.replace(/\D/g, '') : '';
    const nameParts = q.toLocaleLowerCase('uk-UA').split(/\s+/);
    const matching = records.map((record) => describeBooking(record, clock)).filter((booking) => {
      if (status && booking.status !== status) return false;
      if (phoneQuery) return booking.phone?.includes(phoneQuery) ?? false;

      const name = booking.customerName?.toLocaleLowerCase('uk-UA') ?? '';
      return nameParts.every((part) => name.includes(part));
    });
    const { bookings, ...pagination } = paginateBookings(matching, page, bookingsPageSize);
    return {
      ...pagination,
      bookings: bookings.map(({ bookingNumber, customerName, phone, date, startHour, endHour, status }) => ({
        bookingNumber, customerName, phone, date, startHour, endHour, status,
      })),
    };
  }

  async getBooking(bookingNumber: string): Promise<ManagerBookingDetails> {
    return describeBooking(await this.findConfirmedBooking(bookingNumber), bookingClock());
  }

  async cancelBooking(bookingNumber: string): Promise<ManagerBookingDetails> {
    const pass = await this.findConfirmedBooking(bookingNumber);
    const now = new Date();
    const booking = describeBooking(pass, bookingClock(now));
    if (booking.status === 'completed') {
      throw new ConflictException('Завершене бронювання скасувати неможливо.');
    }
    if (booking.status === 'booked') {
      await this.passes.update(
        { id: pass.id, holdExpiresAt: IsNull(), cancelledAt: IsNull() },
        { cancelledAt: now.toISOString() },
      );
    }
    return { ...booking, status: 'cancelled' };
  }

  async report(period: ManagerReportPeriod, page: number): Promise<ManagerRevenueReport> {
    const records = await this.passes.find({
      select: bookingFields,
      where: { holdExpiresAt: IsNull(), cancelledAt: IsNull(), date: Between(period.from, period.to) },
      order: { date: 'DESC', id: 'ASC' },
    });
    const clock = bookingClock();
    const matching = records.map((record) => describeBooking(record, clock)).filter(({ status }) => status === 'completed');
    const totalRevenueInKopiykas = matching.reduce((total, booking) => total + (booking.amountInKopiykas ?? 0), 0);
    const { bookings, ...pagination } = paginateBookings(matching, page, reportPageSize);
    return {
      ...pagination,
      period,
      totalRevenueInKopiykas,
      hasUnknownAmounts: matching.some(({ amountInKopiykas }) => amountInKopiykas === null),
      bookings: bookings.map(({ bookingNumber, customerName, phone, date, startHour, endHour, amountInKopiykas }) => ({
        bookingNumber, customerName, phone, date, startHour, endHour, amountInKopiykas,
      })),
    };
  }

  private async findConfirmedBooking(bookingNumber: string): Promise<BookingPassEntity> {
    const id = Number(bookingNumber.slice(3));
    if (id >= 1 && id <= 2_147_483_647) {
      const pass = await this.passes.findOne({ select: bookingFields, where: { id, holdExpiresAt: IsNull() } });
      if (pass && describeBookingPass(pass).bookingNumber === bookingNumber) return pass;
    }
    throw new NotFoundException('Бронювання за цим номером не знайдено.');
  }
}
