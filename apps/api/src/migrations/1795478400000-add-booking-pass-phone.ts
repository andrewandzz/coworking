import { TableCheck, TableColumn } from 'typeorm';
import type { MigrationInterface, QueryRunner } from 'typeorm';

const phoneCheck = 'CK_booking_passes_phone';

export class AddBookingPassPhone1795478400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('booking_passes', new TableColumn({
      name: 'phone', type: 'varchar', length: '12', isNullable: true,
    }));

    const operator = queryRunner.connection.options.type === 'mssql' ? 'LIKE' : 'GLOB';
    const pattern = `380[1-9]${'[0-9]'.repeat(8)}`;
    await queryRunner.createCheckConstraint('booking_passes', new TableCheck({
      name: phoneCheck,
      expression: `phone ${operator} '${pattern}'`,
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropCheckConstraint('booking_passes', phoneCheck);
    await queryRunner.dropColumn('booking_passes', 'phone');
  }
}
