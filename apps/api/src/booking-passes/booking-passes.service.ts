import { createHash } from 'node:crypto';
import {
  BadRequestException, ConflictException, GoneException, Injectable, NotFoundException, ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  calculateBookingTotal, COWORKING_SPACES, getBookingTime, getBookingWindow, getSpaceBookingRates, RESERVATION_DURATION_MS,
} from '@coworking/contracts';
import type {
  BookingCheckIn, BookingMode, IssueBookingPassRequest, IssuedBookingPass, ReservationDeadline,
  ReserveSpaceRequest, SpaceAvailability, SpaceBookingRange,
} from '@coworking/contracts';
import { IsNull, LessThan, LessThanOrEqual, MoreThan, Not, Or, QueryFailedError, Repository } from 'typeorm';
import { BOOKING_PASS_TOKEN_INDEX, BookingPassEntity } from './booking-pass.entity.js';
import { describeBookingPass, isWholeWorkday } from './booking-pass-summary.js';
import { tryLockBookingSpace } from './space-lock.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'hex').digest('hex');
}

function matchesRange(pass: BookingPassEntity, range: SpaceBookingRange): boolean {
  return pass.spaceId === range.spaceId && pass.date === range.date
    && pass.startHour === range.startHour && pass.endHour === range.endHour;
}

function matchesBookingMode(pass: BookingPassEntity, mode?: BookingMode): boolean {
  return mode === undefined || pass.bookingMode === null || pass.bookingMode === mode;
}

function quoteBooking(range: SpaceBookingRange, mode: BookingMode): number {
  const space = COWORKING_SPACES.find(({ id }) => id === range.spaceId);
  if (!space) throw new BadRequestException('Простір не знайдено.');

  return calculateBookingTotal(getSpaceBookingRates(space), mode, range.endHour - range.startHour);
}

function activeBooking(now: string) {
  return Or(IsNull(), MoreThan(now));
}

function expiredReservation(): GoneException {
  return new GoneException('Термін дії резерву минув або резерв скасовано.');
}

@Injectable()
export class BookingPassesService {
  private sqliteBookingWrites = Promise.resolve();

  constructor(@InjectRepository(BookingPassEntity) private readonly passes: Repository<BookingPassEntity>) {}

  async getAvailability(requestedDate?: string): Promise<SpaceAvailability> {
    const now = new Date();
    const date = requestedDate ?? getBookingWindow(now).today;
    const occupied = await this.passes.find({
      select: { spaceId: true, startHour: true, endHour: true },
      where: { date, cancelledAt: IsNull(), holdExpiresAt: activeBooking(now.toISOString()) },
    });
    return { date, serverTime: now.getTime(), occupied };
  }

  async reserve({ token, mode, ...range }: ReserveSpaceRequest): Promise<ReservationDeadline> {
    const tokenHash = hashToken(token);
    const hold = await this.withSpaceLock(range.spaceId, async (passes) => {
      const now = new Date();
      const nowIso = now.toISOString();
      const existing = await passes.findOneBy({ tokenHash });
      if (existing) {
        if (!matchesRange(existing, range) || !matchesBookingMode(existing, mode) || existing.holdExpiresAt === null) {
          throw new ConflictException('Цей запит уже використано для бронювання.');
        }
        if (existing.holdExpiresAt <= nowIso) throw expiredReservation();
        const expiresAt = Date.parse(existing.holdExpiresAt);
        if (mode !== undefined && existing.bookingMode === null) {
          const amountInKopiykas = existing.amountInKopiykas ?? quoteBooking(range, mode);
          const updated = await passes.update(
            { tokenHash, holdExpiresAt: MoreThan(new Date().toISOString()) },
            { bookingMode: mode, amountInKopiykas },
          );
          if (!updated.affected) throw expiredReservation();
          return { expiresAt, amountInKopiykas };
        }
        return { expiresAt, amountInKopiykas: existing.amountInKopiykas ?? undefined };
      }

      const { today } = getBookingWindow(now);
      const startTime = `${String(range.startHour).padStart(2, '0')}:00:00`;
      if (range.date < today || (range.date === today && startTime < getBookingTime(now))) {
        throw new BadRequestException('Виберіть майбутній час для бронювання.');
      }

      const { spaceId, date, startHour, endHour } = range;
      if (await passes.existsBy({
        spaceId, date, startHour: LessThan(endHour), endHour: MoreThan(startHour),
        cancelledAt: IsNull(), holdExpiresAt: activeBooking(nowIso),
      })) {
        throw new ConflictException('Обраний час уже зайнято. Виберіть інший проміжок.');
      }

      await passes.delete({ spaceId, holdExpiresAt: LessThanOrEqual(nowIso) });
      const expiresAt = Date.now() + RESERVATION_DURATION_MS;
      const amountInKopiykas = mode === undefined ? null : quoteBooking(range, mode);
      try {
        await passes.insert({
          ...range, tokenHash, holdExpiresAt: new Date(expiresAt).toISOString(),
          bookingMode: mode ?? null, amountInKopiykas,
        });
      } catch (error) {
        if (error instanceof QueryFailedError && error.message.includes(BOOKING_PASS_TOKEN_INDEX)) {
          throw new ConflictException('Цей запит уже використано для бронювання.');
        }
        throw error;
      }
      return { expiresAt, amountInKopiykas: amountInKopiykas ?? undefined };
    });
    return { ...hold, serverTime: Date.now() };
  }

  async release(token: string): Promise<void> {
    await this.passes.delete({ tokenHash: hashToken(token), holdExpiresAt: Not(IsNull()) });
  }

  async issue(request: IssueBookingPassRequest): Promise<IssuedBookingPass> {
    const { token, phone, customerName, mode, ...schedule } = request;
    const tokenHash = hashToken(token);
    return this.withSpaceLock(schedule.spaceId, async (passes) => {
      const pass = await passes.findOneBy({ tokenHash });
      if (!pass) throw expiredReservation();
      if (pass.cancelledAt !== null) throw new GoneException('Це бронювання скасовано.');
      if (!matchesRange(pass, schedule) || !matchesBookingMode(pass, mode)
        || (pass.phone !== null && pass.phone !== phone)
        || (pass.customerName !== null && customerName !== undefined && pass.customerName !== customerName)) {
        throw new ConflictException('Цей запит уже використано для іншого бронювання.');
      }

      if (pass.holdExpiresAt !== null) {
        const bookingMode = pass.bookingMode ?? mode ?? (isWholeWorkday(schedule) ? null : 'hourly');
        const amountInKopiykas = pass.amountInKopiykas ?? (bookingMode ? quoteBooking(schedule, bookingMode) : null);
        const confirmed = await passes.update(
          { tokenHash, holdExpiresAt: MoreThan(new Date().toISOString()) },
          { phone, customerName: customerName ?? null, bookingMode, amountInKopiykas, holdExpiresAt: null },
        );
        if (!confirmed.affected) throw expiredReservation();
      }
      return describeBookingPass(pass);
    });
  }

  async checkIn(token: string): Promise<BookingCheckIn> {
    const tokenHash = hashToken(token);
    const usedAt = new Date().toISOString();
    // The condition keeps simultaneous scans from using the same pass twice.
    const confirmed = { tokenHash, holdExpiresAt: IsNull() };
    const update = await this.passes.update({ ...confirmed, usedAt: IsNull(), cancelledAt: IsNull() }, { usedAt });
    const pass = await this.passes.findOneBy(confirmed);
    if (!pass) throw new NotFoundException('Перепустку не знайдено.');
    if (!update.affected) {
      if (pass.cancelledAt !== null) throw new GoneException('Це бронювання скасовано.');
      throw new ConflictException('Цю перепустку вже використано.');
    }

    return { ...describeBookingPass(pass), usedAt };
  }

  private withSpaceLock<T>(
    spaceId: string,
    write: (passes: Repository<BookingPassEntity>) => Promise<T>,
  ): Promise<T> {
    const manager = this.passes.manager;
    if (manager.dataSource.options.type === 'mssql') {
      return manager.transaction(async (transaction) => {
        if (!await tryLockBookingSpace(transaction, spaceId)) {
          throw new ServiceUnavailableException('Не вдалося перевірити доступність. Спробуйте ще раз.');
        }
        return write(transaction.getRepository(BookingPassEntity));
      });
    }

    // The embedded SQL.js database has a single connection shared by this process.
    const result = this.sqliteBookingWrites.then(() => write(this.passes));
    this.sqliteBookingWrites = result.then(() => undefined, () => undefined);
    return result;
  }
}
