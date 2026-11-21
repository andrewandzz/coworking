import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getBookingWindow, SPACE_TYPE_LABELS } from '@coworking/contracts';
import type { BookingCheckIn, IssueBookingPassRequest, IssuedBookingPass, SpaceType } from '@coworking/contracts';
import { IsNull, QueryFailedError, Repository } from 'typeorm';
import { BookingPassEntity } from './booking-pass.entity.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'hex').digest('hex');
}

function describe(pass: BookingPassEntity): IssuedBookingPass {
  const numberStart = pass.spaceId.lastIndexOf('-');
  const type = pass.spaceId.slice(0, numberStart) as SpaceType;
  const number = pass.spaceId.slice(numberStart + 1);
  return {
    bookingNumber: `CW-${String(pass.id).padStart(4, '0')}`,
    spaceLabel: `${SPACE_TYPE_LABELS[type].singular} ${number}`,
    date: pass.date,
    startHour: pass.startHour,
    endHour: pass.endHour,
  };
}

@Injectable()
export class BookingPassesService {
  constructor(@InjectRepository(BookingPassEntity) private readonly passes: Repository<BookingPassEntity>) {}

  async issue(request: IssueBookingPassRequest): Promise<IssuedBookingPass> {
    const { token, ...schedule } = request;
    const tokenHash = hashToken(token);
    let pass = await this.passes.findOneBy({ tokenHash });
    if (!pass) {
      if (schedule.date < getBookingWindow().today) {
        throw new BadRequestException('Виберіть сьогоднішню або майбутню дату бронювання.');
      }
      try {
        await this.passes.insert({ ...schedule, tokenHash, usedAt: null });
      } catch (error) {
        if (!(error instanceof QueryFailedError)) throw error;
        pass = await this.passes.findOneBy({ tokenHash });
        if (!pass) throw error;
      }
      pass ??= await this.passes.findOneByOrFail({ tokenHash });
    }

    if (pass.spaceId !== schedule.spaceId || pass.date !== schedule.date
      || pass.startHour !== schedule.startHour || pass.endHour !== schedule.endHour) {
      throw new ConflictException('Цей запит вже створив перепустку для іншого бронювання.');
    }
    return describe(pass);
  }

  async checkIn(token: string): Promise<BookingCheckIn> {
    const tokenHash = hashToken(token);
    const usedAt = new Date().toISOString();
    // The condition keeps simultaneous scans from using the same pass twice.
    const update = await this.passes.update({ tokenHash, usedAt: IsNull() }, { usedAt });
    const pass = await this.passes.findOneBy({ tokenHash });
    if (!pass) throw new NotFoundException('Перепустку не знайдено.');
    if (!update.affected) throw new ConflictException('Цю перепустку вже використано.');

    return { ...describe(pass), usedAt };
  }
}
