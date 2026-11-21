import { Table, TableIndex } from 'typeorm';
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { BOOKING_PASS_TOKEN_INDEX } from '../booking-passes/booking-pass.entity.js';

export class CreateBookingPasses1795305600000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'booking_passes',
      columns: [
        {
          name: 'id',
          type: queryRunner.connection.options.type === 'mssql' ? 'int' : 'integer',
          isPrimary: true,
          isGenerated: true,
          generationStrategy: 'increment',
        },
        { name: 'token_hash', type: 'varchar', length: '64' },
        { name: 'space_id', type: 'varchar', length: '24' },
        { name: 'booking_date', type: 'varchar', length: '10' },
        { name: 'start_hour', type: 'int' },
        { name: 'end_hour', type: 'int' },
        { name: 'used_at', type: 'varchar', length: '24', isNullable: true },
      ],
    }));
    await queryRunner.createIndex('booking_passes', new TableIndex({
      name: BOOKING_PASS_TOKEN_INDEX,
      columnNames: ['token_hash'],
      isUnique: true,
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('booking_passes');
  }
}
