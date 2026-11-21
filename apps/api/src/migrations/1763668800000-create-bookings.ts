import type { Desk } from '@coworking/contracts';
import { Table, TableIndex } from 'typeorm';
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { DESK_DATE_INDEX, DESK_FOREIGN_KEY, OWNER_DATE_INDEX } from '../bookings/entities.js';

const desks: Desk[] = [
  { id: 'A-01', zone: 'open' },
  { id: 'A-02', zone: 'open' },
  { id: 'A-03', zone: 'open' },
  { id: 'A-04', zone: 'open' },
  { id: 'B-01', zone: 'quiet' },
  { id: 'B-02', zone: 'quiet' },
  { id: 'B-03', zone: 'quiet' },
  { id: 'C-01', zone: 'window' },
  { id: 'C-02', zone: 'window' },
];

export class CreateBookings1763668800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'desks',
      columns: [
        { name: 'id', type: 'varchar', length: '12', isPrimary: true },
        { name: 'zone', type: 'varchar', length: '12' },
      ],
    }));

    await queryRunner.createTable(new Table({
      name: 'bookings',
      columns: [
        { name: 'id', type: 'varchar', length: '36', isPrimary: true },
        { name: 'desk_id', type: 'varchar', length: '12' },
        { name: 'booking_date', type: 'varchar', length: '10' },
        { name: 'owner_hash', type: 'varchar', length: '64' },
      ],
      foreignKeys: [{
        name: DESK_FOREIGN_KEY,
        columnNames: ['desk_id'],
        referencedTableName: 'desks',
        referencedColumnNames: ['id'],
      }],
    }));

    await queryRunner.createIndices('bookings', [
      new TableIndex({
        name: DESK_DATE_INDEX,
        columnNames: ['desk_id', 'booking_date'],
        isUnique: true,
      }),
      new TableIndex({
        name: OWNER_DATE_INDEX,
        columnNames: ['owner_hash', 'booking_date'],
      }),
    ]);

    await queryRunner.manager.insert('desks', desks);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bookings');
    await queryRunner.dropTable('desks');
  }
}
