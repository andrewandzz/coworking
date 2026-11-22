import { Body, Controller, Header, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  BOOKING_PASS_TOKEN_PATTERN, COWORKING_CLOSING_HOUR, COWORKING_OPENING_HOUR, normalizeUkrainianPhone,
} from '@coworking/contracts';
import type { BookingCheckIn, IssueBookingPassRequest, IssuedBookingPass } from '@coworking/contracts';
import { z } from 'zod';
import { ManagerSessionGuard } from '../manager-auth/manager-session.guard.js';
import { requireJson } from '../manager-auth/require-json.js';
import { BookingPassesService } from './booking-passes.service.js';

const token = z.string().regex(BOOKING_PASS_TOKEN_PATTERN);
const hour = z.int().min(COWORKING_OPENING_HOUR).max(COWORKING_CLOSING_HOUR);
const issueSchema = z.strictObject({
  token,
  phone: z.string().max(64).transform((value) => normalizeUkrainianPhone(value) ?? '')
    .pipe(z.string().min(1, 'Вкажіть дійсний український номер телефону.')),
  spaceId: z.string().regex(/^(?:desk-[1-6]|meeting-room-[1-2]|skype-booth-[1-3])$/),
  date: z.iso.date(),
  startHour: hour,
  endHour: hour,
}).refine(({ startHour, endHour }) => startHour < endHour, { path: ['endHour'] });
const checkInSchema = z.strictObject({ token });

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
