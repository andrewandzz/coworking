import { IsNull, Not, TableColumn } from 'typeorm';
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { BookingPassEntity } from '../booking-passes/booking-pass.entity.js';

export class AddBookingDetails1795651200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('booking_passes', [
      new TableColumn({ name: 'customer_name', type: 'nvarchar', length: '201', isNullable: true }),
      new TableColumn({ name: 'amount_in_kopiykas', type: 'int', isNullable: true }),
      new TableColumn({ name: 'cancelled_at', type: 'varchar', length: '24', isNullable: true }),
    ]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Older versions treat expired holds as inactive.
    await queryRunner.manager.createQueryBuilder()
      .update(BookingPassEntity)
      .set({ holdExpiresAt: () => 'cancelled_at' })
      .where({ cancelledAt: Not(IsNull()) })
      .execute();
    await queryRunner.dropColumns('booking_passes', ['customer_name', 'amount_in_kopiykas', 'cancelled_at']);
  }
}
