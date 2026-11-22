import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const BOOKING_PASS_TOKEN_INDEX = 'UQ_booking_passes_token_hash';

@Entity('booking_passes')
@Index(BOOKING_PASS_TOKEN_INDEX, ['tokenHash'], { unique: true })
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

  @Column({ name: 'used_at', type: 'varchar', length: 24, nullable: true })
  usedAt!: string | null;
}
