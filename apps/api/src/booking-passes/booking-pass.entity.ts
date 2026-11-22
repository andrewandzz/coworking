import { BOOKING_NAME_MAX_LENGTH } from '@coworking/contracts';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const BOOKING_PASS_TOKEN_INDEX = 'UQ_booking_passes_token_hash';
export const BOOKING_PASS_DATE_SPACE_INDEX = 'IX_booking_passes_date_space';

@Entity('booking_passes')
@Index(BOOKING_PASS_TOKEN_INDEX, ['tokenHash'], { unique: true })
@Index(BOOKING_PASS_DATE_SPACE_INDEX, ['date', 'spaceId'])
export class BookingPassEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash!: string;

  @Column({ name: 'space_id', type: 'varchar', length: 24 })
  spaceId!: string;

  @Column({ name: 'booking_date', type: 'varchar', length: 10 })
  date!: string;

  @Column({ name: 'start_hour', type: 'int' })
  startHour!: number;

  @Column({ name: 'end_hour', type: 'int' })
  endHour!: number;

  @Column({ type: 'varchar', length: 12, nullable: true })
  phone!: string | null;

  @Column({ name: 'customer_name', type: 'nvarchar', length: BOOKING_NAME_MAX_LENGTH * 2 + 1, nullable: true })
  customerName!: string | null;

  @Column({ name: 'amount_in_kopiykas', type: 'int', nullable: true })
  amountInKopiykas!: number | null;

  @Column({ name: 'cancelled_at', type: 'varchar', length: 24, nullable: true })
  cancelledAt!: string | null;

  @Column({ name: 'hold_expires_at', type: 'varchar', length: 24, nullable: true })
  holdExpiresAt!: string | null;

  @Column({ name: 'used_at', type: 'varchar', length: 24, nullable: true })
  usedAt!: string | null;
}
