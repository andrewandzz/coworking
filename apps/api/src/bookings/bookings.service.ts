import { randomUUID } from 'node:crypto';
import { getBookingWindow } from '@coworking/contracts';
import type { Availability, Booking, BookingWindow, CreateBooking, Desk } from '@coworking/contracts';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, QueryFailedError, Repository } from 'typeorm';
import { BookingEntity, DESK_DATE_INDEX, DeskEntity } from './entities.js';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(DeskEntity) private readonly desks: Repository<DeskEntity>,
    @InjectRepository(BookingEntity) private readonly bookings: Repository<BookingEntity>,
  ) {}

  async listDesks(requestedDate?: string): Promise<Availability> {
    const window = getBookingWindow();
    const date = requestedDate ?? window.today;
    validateBookingDate(date, window);

    const [desks, bookedDesks] = await Promise.all([
      this.desks.find({ order: { id: 'ASC' } }),
      this.bookings.find({ select: { deskId: true }, where: { date } }),
    ]);
    const bookedIds = new Set(bookedDesks.map(({ deskId }) => deskId));

    return { ...window, date, desks: desks.map((desk) => ({ ...desk, available: !bookedIds.has(desk.id) })) };
  }

  async listBookings(ownerHash: string): Promise<Booking[]> {
    const records = await this.bookings.find({
      where: { ownerHash, date: MoreThanOrEqual(getBookingWindow().today) },
      order: { date: 'ASC', deskId: 'ASC' },
      relations: { desk: true },
    });
    return records.map(({ id, date, desk }) => ({ id, date, desk }));
  }

  async createBooking({ deskId, date }: CreateBooking, ownerHash: string): Promise<Booking> {
    validateBookingDate(date, getBookingWindow());
    const desk: Desk | null = await this.desks.findOneBy({ id: deskId });
    if (!desk) throw new NotFoundException('Робоче місце не знайдено.');

    const id = randomUUID();
    try {
      await this.bookings.insert({ id, deskId, date, ownerHash });
    } catch (error) {
      if (!isDeskDateConflict(error)) throw error;

      const existing = await this.bookings.findOneBy({ deskId, date, ownerHash });
      if (existing) return { id: existing.id, date, desk };
      throw new ConflictException('Це місце вже зайняте на обрану дату.');
    }
    return { id, date, desk };
  }

  async cancelBooking(id: string, ownerHash: string): Promise<void> {
    const result = await this.bookings.delete({
      id,
      ownerHash,
      date: MoreThanOrEqual(getBookingWindow().today),
    });
    if (!result.affected) throw new NotFoundException('Поточне бронювання не знайдено.');
  }
}

function validateBookingDate(date: string, { today, lastDate }: BookingWindow): void {
  if (date < today || date > lastDate) {
    throw new BadRequestException('Дата має бути в межах доступного періоду бронювання.');
  }
}

function isDeskDateConflict(error: unknown): boolean {
  return error instanceof QueryFailedError && (
    error.message.includes(DESK_DATE_INDEX) ||
    error.message.includes('UNIQUE constraint failed: bookings.desk_id, bookings.booking_date')
  );
}
