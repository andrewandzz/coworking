import type { Desk, DeskZone } from '@coworking/contracts';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

export const DESK_DATE_INDEX = 'UQ_bookings_desk_date';
export const OWNER_DATE_INDEX = 'IX_bookings_owner_date';
export const DESK_FOREIGN_KEY = 'FK_bookings_desk';

@Entity('desks')
export class DeskEntity implements Desk {
  @PrimaryColumn({ type: 'varchar', length: 12 })
  id!: string;

  @Column({ type: 'varchar', length: 12 })
  zone!: DeskZone;
}

@Entity('bookings')
@Index(DESK_DATE_INDEX, ['deskId', 'date'], { unique: true })
@Index(OWNER_DATE_INDEX, ['ownerHash', 'date'])
export class BookingEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'desk_id', type: 'varchar', length: 12 })
  deskId!: string;

  @ManyToOne(() => DeskEntity, { nullable: false })
  @JoinColumn({ name: 'desk_id', foreignKeyConstraintName: DESK_FOREIGN_KEY })
  desk!: DeskEntity;

  @Column({ name: 'booking_date', type: 'varchar', length: 10 })
  date!: string;

  @Column({ name: 'owner_hash', type: 'varchar', length: 64 })
  ownerHash!: string;
}
