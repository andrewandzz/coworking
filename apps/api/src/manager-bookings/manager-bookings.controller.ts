import {
  ConflictException, Controller, Get, Header, Headers, HttpCode, NotFoundException, Param, Post, Query, UseGuards,
} from '@nestjs/common';
import { MANAGER_BOOKING_STATUSES } from '@coworking/contracts';
import type { ManagerBookingDetails, ManagerBookingsResult } from '@coworking/contracts';
import { z } from 'zod';
import { ManagerSessionGuard } from '../manager-auth/manager-session.guard.js';
import { requireJson } from '../manager-auth/require-json.js';
import { DEMO_MANAGER_BOOKINGS } from './demo-bookings.js';
import { pageSchema, paginateBookings } from './paginate-bookings.js';

const pageSize = 7;
const bookingNumberSchema = z.string().max(32).regex(/^CW-\d{4,}$/);

const querySchema = z.strictObject({
  q: z.string().trim().max(120).default(''),
  status: z.enum(MANAGER_BOOKING_STATUSES).optional(),
  page: pageSchema,
});

function phoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

@Controller('manager/bookings')
@UseGuards(ManagerSessionGuard)
export class ManagerBookingsController {
  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Query({ schema: querySchema }) { q, status, page = 1 }: z.output<typeof querySchema>): ManagerBookingsResult {
    const phoneQuery = /^[\d\s()+.-]+$/.test(q) ? phoneDigits(q) : '';
    const nameParts = q.toLocaleLowerCase('uk-UA').split(/\s+/);
    const matching = DEMO_MANAGER_BOOKINGS.filter((booking) => {
      if (status && booking.status !== status) return false;
      if (phoneQuery) return phoneDigits(booking.phone).includes(phoneQuery);

      const name = booking.customerName.toLocaleLowerCase('uk-UA');
      return nameParts.every((part) => name.includes(part));
    });
    const { bookings, ...pagination } = paginateBookings(matching, page, pageSize);
    return {
      ...pagination,
      bookings: bookings.map(({ bookingNumber, customerName, phone, status }) => ({
        bookingNumber, customerName, phone, status,
      })),
    };
  }

  @Get(':bookingNumber')
  @Header('Cache-Control', 'no-store')
  getBooking(@Param('bookingNumber', { schema: bookingNumberSchema }) bookingNumber: string): ManagerBookingDetails {
    return this.findBooking(bookingNumber);
  }

  @Post(':bookingNumber/cancel')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  cancelBooking(
    @Param('bookingNumber', { schema: bookingNumberSchema }) bookingNumber: string,
    @Headers('content-type') contentType: string | undefined,
  ): ManagerBookingDetails {
    requireJson(contentType);
    const booking = this.findBooking(bookingNumber);
    if (booking.status === 'completed') {
      throw new ConflictException('Завершене бронювання скасувати неможливо.');
    }

    booking.status = 'cancelled';
    return booking;
  }

  private findBooking(bookingNumber: string): ManagerBookingDetails {
    const booking = DEMO_MANAGER_BOOKINGS.find((entry) => entry.bookingNumber === bookingNumber);
    if (!booking) throw new NotFoundException('Бронювання за цим номером не знайдено.');
    return booking;
  }
}
