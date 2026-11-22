import { createHash } from 'node:crypto';
import {
  BadRequestException, ConflictException, GoneException, Injectable, NotFoundException, ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getBookingTime, getBookingWindow, RESERVATION_DURATION_MS } from '@coworking/contracts';
import type {
  BookingCheckIn, IssueBookingPassRequest, IssuedBookingPass, ReservationDeadline,
  ReserveSpaceRequest, SpaceAvailability, SpaceBookingRange,
} from '@coworking/contracts';
import { IsNull, LessThan, LessThanOrEqual, MoreThan, Not, Or, QueryFailedError, Repository } from 'typeorm';
import { BOOKING_PASS_TOKEN_INDEX, BookingPassEntity } from './booking-pass.entity.js';
import { calculateBookingAmount, describeBookingPass } from './booking-pass-summary.js';
import { tryLockBookingSpace } from './space-lock.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'hex').digest('hex');
}

function matchesRange(pass: BookingPassEntity, range: SpaceBookingRange): boolean {
  return pass.spaceId === range.spaceId && pass.date === range.date
    && pass.startHour === range.startHour && pass.endHour === range.endHour;
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

  async reserve({ token, ...range }: ReserveSpaceRequest): Promise<ReservationDeadline> {
    const tokenHash = hashToken(token);
    const expiresAt = await this.withSpaceLock(range.spaceId, async (passes) => {
      const now = new Date();
      const nowIso = now.toISOString();
      const existing = await passes.findOneBy({ tokenHash });
      if (existing) {
        if (!matchesRange(existing, range) || existing.holdExpiresAt === null) {
          throw new ConflictException('Цей запит уже використано для бронювання.');
        }
        if (existing.holdExpiresAt <= nowIso) throw expiredReservation();
        return Date.parse(existing.holdExpiresAt);
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
      try {
        await passes.insert({ ...range, tokenHash, holdExpiresAt: new Date(expiresAt).toISOString() });
      } catch (error) {
        if (error instanceof QueryFailedError && error.message.includes(BOOKING_PASS_TOKEN_INDEX)) {
          throw new ConflictException('Цей запит уже використано для бронювання.');
        }
        throw error;
      }
      return expiresAt;
    });
    return { expiresAt, serverTime: Date.now() };
  }

  async release(token: string): Promise<void> {
    await this.passes.delete({ tokenHash: hashToken(token), holdExpiresAt: Not(IsNull()) });
  }

  async issue(request: IssueBookingPassRequest): Promise<IssuedBookingPass> {
    const { token, phone, customerName, mode, ...schedule } = request;
    const tokenHash = hashToken(token);
    const amountInKopiykas = calculateBookingAmount(schedule, mode);
    return this.withSpaceLock(schedule.spaceId, async (passes) => {
      const pass = await passes.findOneBy({ tokenHash });
      if (!pass) throw expiredReservation();
      if (pass.cancelledAt !== null) throw new GoneException('Це бронювання скасовано.');
      if (!matchesRange(pass, schedule)
        || (pass.phone !== null && pass.phone !== phone)
        || (pass.customerName !== null && customerName !== undefined && pass.customerName !== customerName)
        || (pass.amountInKopiykas !== null && amountInKopiykas !== null && pass.amountInKopiykas !== amountInKopiykas)) {
        throw new ConflictException('Цей запит уже використано для іншого бронювання.');
      }

      if (pass.holdExpiresAt !== null) {
        const confirmed = await passes.update(
          { tokenHash, holdExpiresAt: MoreThan(new Date().toISOString()) },
          { phone, customerName: customerName ?? null, amountInKopiykas, holdExpiresAt: null },
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
