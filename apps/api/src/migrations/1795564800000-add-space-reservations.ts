import { IsNull, Not, TableColumn, TableIndex } from 'typeorm';
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { BOOKING_PASS_DATE_SPACE_INDEX, BookingPassEntity } from '../booking-passes/booking-pass.entity.js';

export class AddSpaceReservations1795564800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('booking_passes', new TableColumn({
      name: 'hold_expires_at', type: 'varchar', length: '24', isNullable: true,
    }));
    await queryRunner.createIndex('booking_passes', new TableIndex({
      name: BOOKING_PASS_DATE_SPACE_INDEX,
      columnNames: ['booking_date', 'space_id'],
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.delete(BookingPassEntity, { holdExpiresAt: Not(IsNull()) });
    await queryRunner.dropIndex('booking_passes', BOOKING_PASS_DATE_SPACE_INDEX);
    await queryRunner.dropColumn('booking_passes', 'hold_expires_at');
  }
}
