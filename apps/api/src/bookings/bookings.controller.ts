import { createHash } from 'node:crypto';
import type { Availability, Booking, CreateBooking } from '@coworking/contracts';
import {
  Body, Controller, Delete, Get, Header, Headers, HttpCode,
  Param, Post, Query, UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';
import { BookingsService } from './bookings.service.js';

const dateSchema = z.iso.date({ error: 'Вкажіть дату у форматі РРРР-ММ-ДД.' });
const createBookingSchema = z.strictObject({
  deskId: z.string().regex(/^[A-Z]-\d{2}$/, 'Вкажіть номер робочого місця.'),
  date: dateSchema,
});

function getOwnerHash(authorization: string | undefined): string {
  const token = authorization?.match(/^Bearer ([a-f0-9]{64})$/i)?.[1];
  if (!token) throw new UnauthorizedException('Потрібен ключ цього браузера.');
  return createHash('sha256').update(token.toLowerCase(), 'hex').digest('hex');
}

@Controller()
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get('desks')
  @Header('Cache-Control', 'no-store')
  listDesks(@Query('date', { schema: dateSchema.optional() }) date?: string): Promise<Availability> {
    return this.bookings.listDesks(date);
  }

  @Get('bookings')
  @Header('Cache-Control', 'no-store')
  listBookings(@Headers('authorization') authorization?: string): Promise<Booking[]> {
    return this.bookings.listBookings(getOwnerHash(authorization));
  }

  @Post('bookings')
  @Header('Cache-Control', 'no-store')
  createBooking(
    @Body({ schema: createBookingSchema }) booking: CreateBooking,
    @Headers('authorization') authorization?: string,
  ): Promise<Booking> {
    return this.bookings.createBooking(booking, getOwnerHash(authorization));
  }

  @Delete('bookings/:id')
  @HttpCode(204)
  cancelBooking(
    @Param('id', { schema: z.uuidv4() }) id: string,
    @Headers('authorization') authorization?: string,
  ): Promise<void> {
    return this.bookings.cancelBooking(id, getOwnerHash(authorization));
  }
}
