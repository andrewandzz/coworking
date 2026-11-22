import {
  Controller, Get, Header, Headers, HttpCode, Param, Post, Query, UseGuards,
} from '@nestjs/common';
import { MANAGER_BOOKING_STATUSES } from '@coworking/contracts';
import type { ManagerBookingDetails, ManagerBookingsResult } from '@coworking/contracts';
import { z } from 'zod';
import { ManagerSessionGuard } from '../manager-auth/manager-session.guard.js';
import { requireJson } from '../manager-auth/require-json.js';
import { ManagerBookingsService } from './manager-bookings.service.js';
import { pageSchema } from './paginate-bookings.js';

const bookingNumberSchema = z.string().max(32).regex(/^CW-\d{4,}$/);

const querySchema = z.strictObject({
  q: z.string().trim().max(120).default(''),
  status: z.enum(MANAGER_BOOKING_STATUSES).optional(),
  page: pageSchema,
});

@Controller('manager/bookings')
@UseGuards(ManagerSessionGuard)
export class ManagerBookingsController {
  constructor(private readonly bookings: ManagerBookingsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Query({ schema: querySchema }) { q, status, page = 1 }: z.output<typeof querySchema>): Promise<ManagerBookingsResult> {
    return this.bookings.list(q, status, page);
  }

  @Get(':bookingNumber')
  @Header('Cache-Control', 'no-store')
  getBooking(@Param('bookingNumber', { schema: bookingNumberSchema }) bookingNumber: string): Promise<ManagerBookingDetails> {
    return this.bookings.getBooking(bookingNumber);
  }

  @Post(':bookingNumber/cancel')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  cancelBooking(
    @Param('bookingNumber', { schema: bookingNumberSchema }) bookingNumber: string,
    @Headers('content-type') contentType: string | undefined,
  ): Promise<ManagerBookingDetails> {
    requireJson(contentType);
    return this.bookings.cancelBooking(bookingNumber);
  }
}
