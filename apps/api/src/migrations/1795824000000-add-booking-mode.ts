import { COWORKING_CLOSING_HOUR, COWORKING_OPENING_HOUR } from '@coworking/contracts';
import { TableColumn } from 'typeorm';
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { LEGACY_BOOKING_RATES_IN_KOPIYKAS } from '../booking-passes/booking-pass-summary.js';

export class AddBookingMode1795824000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('booking_passes', new TableColumn({
      name: 'booking_mode', type: 'varchar', length: '6', isNullable: true,
    }));

    const { hourly, daily } = LEGACY_BOOKING_RATES_IN_KOPIYKAS;
    await queryRunner.sql`
      UPDATE booking_passes
      SET booking_mode = CASE
        WHEN start_hour = ${COWORKING_OPENING_HOUR} AND end_hour = ${COWORKING_CLOSING_HOUR}
          AND amount_in_kopiykas = ${daily} THEN 'daily'
        WHEN amount_in_kopiykas = (end_hour - start_hour) * ${hourly} THEN 'hourly'
      END
      WHERE hold_expires_at IS NULL AND amount_in_kopiykas IS NOT NULL
    `;
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('UPDATE booking_passes SET amount_in_kopiykas = NULL WHERE hold_expires_at IS NOT NULL');
    await queryRunner.dropColumn('booking_passes', 'booking_mode');
  }
}
