import { calculateBookingTotal } from '@coworking/contracts';
import type { SpaceType } from '@coworking/contracts';
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { calculateLegacyBookingAmount, isWholeWorkday } from '../booking-passes/booking-pass-summary.js';
import { bookingHistorySamples } from './1795737600000-seed-booking-history.js';

// Rates at the time of the migration keep upgrades and rollbacks reproducible.
const hourlyRates: Readonly<Partial<Record<`${SpaceType}-${number}`, number>>> = {
  'desk-1': 11_000,
  'desk-2': 9_000,
  'desk-3': 11_000,
  'desk-4': 9_500,
  'desk-5': 12_500,
  'desk-6': 11_000,
  'meeting-room-1': 19_000,
  'meeting-room-2': 18_000,
  'skype-booth-1': 14_500,
  'skype-booth-2': 14_500,
  'skype-booth-3': 14_500,
};

async function repriceSamples(queryRunner: QueryRunner, direction: 'up' | 'down'): Promise<void> {
  for (const { tokenHash, spaceId, startHour, endHour } of bookingHistorySamples) {
    const hourly = hourlyRates[spaceId];
    if (hourly === undefined) throw new Error(`Missing sample booking rate for ${spaceId}.`);

    const mode = isWholeWorkday({ startHour, endHour }) ? 'daily' : 'hourly';
    const legacyAmount = calculateLegacyBookingAmount({ startHour, endHour }, mode);
    const newAmount = calculateBookingTotal({ hourly, daily: hourly * 6 }, mode, endHour - startHour);
    const [from, to] = direction === 'up' ? [legacyAmount, newAmount] : [newAmount, legacyAmount];

    await queryRunner.sql`
      UPDATE booking_passes
      SET amount_in_kopiykas = ${to}
      WHERE token_hash = ${tokenHash} AND hold_expires_at IS NULL AND amount_in_kopiykas = ${from}
    `;
  }
}

export class RepriceSeedBookingHistory1795910400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await repriceSamples(queryRunner, 'up');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await repriceSamples(queryRunner, 'down');
  }
}
