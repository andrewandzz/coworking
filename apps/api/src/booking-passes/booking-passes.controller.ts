import { Body, Controller, Get, Header, Headers, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import {
  BOOKING_NAME_MAX_LENGTH, BOOKING_PASS_TOKEN_PATTERN, COWORKING_CLOSING_HOUR, COWORKING_OPENING_HOUR,
  normalizeUkrainianPhone,
} from '@coworking/contracts';
import type {
  BookingCheckIn, IssueBookingPassRequest, IssuedBookingPass, ReservationDeadline, ReserveSpaceRequest, SpaceAvailability,
} from '@coworking/contracts';
import { z } from 'zod';
import { ManagerSessionGuard } from '../manager-auth/manager-session.guard.js';
import { requireJson } from '../manager-auth/require-json.js';
import { isWholeWorkday } from './booking-pass-summary.js';
import { BookingPassesService } from './booking-passes.service.js';

const token = z.string().regex(BOOKING_PASS_TOKEN_PATTERN);
const hour = z.int().min(COWORKING_OPENING_HOUR).max(COWORKING_CLOSING_HOUR);
const date = z.iso.date();
const reserveSchema = z.strictObject({
  token,
  spaceId: z.string().regex(/^(?:desk-[1-6]|meeting-room-[1-2]|skype-booth-[1-3])$/),
  date,
  startHour: hour,
  endHour: hour,
}).refine(({ startHour, endHour }) => startHour < endHour, { path: ['endHour'] });
const issueSchema = reserveSchema.safeExtend({
  phone: z.string().max(64).transform((value) => normalizeUkrainianPhone(value) ?? '')
    .pipe(z.string().min(1, 'Вкажіть дійсний український номер телефону.')),
  customerName: z.string().trim().min(1).max(BOOKING_NAME_MAX_LENGTH * 2 + 1).optional(),
  mode: z.enum(['hourly', 'daily']).optional(),
}).refine((request) => request.mode !== 'daily' || isWholeWorkday(request), {
  path: ['mode'],
  message: 'Денний тариф діє на весь робочий день.',
});
const checkInSchema = z.strictObject({ token });

@Controller('booking-reservations')
export class BookingReservationsController {
  constructor(private readonly passes: BookingPassesService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  availability(@Query('date', { schema: date.optional() }) date?: string): Promise<SpaceAvailability> {
    return this.passes.getAvailability(date);
  }

  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  reserve(
    @Body({ schema: reserveSchema }) request: ReserveSpaceRequest,
    @Headers('content-type') contentType?: string,
  ): Promise<ReservationDeadline> {
    requireJson(contentType);
    return this.passes.reserve(request);
  }

  @Post('cancel')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async cancel(
    @Body({ schema: checkInSchema }) request: { token: string },
    @Headers('content-type') contentType?: string,
  ): Promise<void> {
    requireJson(contentType);
    await this.passes.release(request.token);
  }
}

@Controller('booking-passes')
export class BookingPassesController {
  constructor(private readonly passes: BookingPassesService) {}

  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  issue(
    @Body({ schema: issueSchema }) request: IssueBookingPassRequest,
    @Headers('content-type') contentType?: string,
  ): Promise<IssuedBookingPass> {
    requireJson(contentType);
    return this.passes.issue(request);
  }
}

@Controller('manager/check-ins')
@UseGuards(ManagerSessionGuard)
export class ManagerCheckInsController {
  constructor(private readonly passes: BookingPassesService) {}

  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  checkIn(
    @Body({ schema: checkInSchema }) request: { token: string },
    @Headers('content-type') contentType?: string,
  ): Promise<BookingCheckIn> {
    requireJson(contentType);
    return this.passes.checkIn(request.token);
  }
}
