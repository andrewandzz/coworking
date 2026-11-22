import { ChangeDetectionStrategy, Component, computed, input, output, viewChild } from '@angular/core';
import type { BookingMode } from '@coworking/contracts';
import { LucideX } from '@lucide/angular';
import { ModalDialog } from '../../../shared/ui/modal-dialog';
import { formatBookingAmount } from '../../booking/booking-format';
import { SPACE_AMENITIES, SPACE_TYPE_LABELS } from '../space-types';
import type { SpaceAmenity, SpaceType } from '../space-types';

export type { BookingMode } from '@coworking/contracts';

export interface SpaceDetails {
  readonly id: string;
  readonly type: SpaceType;
  readonly number: number;
  readonly amenities: readonly SpaceAmenity[];
  readonly ratesInKopiykas: Readonly<Record<BookingMode, number>>;
}

export interface SpaceBookingRequest {
  readonly spaceId: string;
  readonly mode: BookingMode;
}

@Component({
  selector: 'app-space-details-dialog',
  imports: [LucideX, ModalDialog],
  templateUrl: './space-details-dialog.html',
  styleUrl: './space-details-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceDetailsDialog {
  readonly space = input.required<SpaceDetails>();
  readonly bookingRequested = output<SpaceBookingRequest>();
  readonly closed = output();

  private readonly dialog = viewChild.required(ModalDialog);

  protected readonly typeLabel = computed(() => SPACE_TYPE_LABELS[this.space().type].singular);
  protected readonly title = computed(() => `${this.typeLabel()} ${this.space().number}`);
  protected readonly amenities = computed(() => {
    const available = this.space().amenities;
    return SPACE_AMENITIES.filter(({ id }) => available.includes(id));
  });
  protected readonly rates = computed(() => {
    const { hourly, daily } = this.space().ratesInKopiykas;
    return {
      hourly: formatBookingAmount(hourly),
      daily: formatBookingAmount(daily),
    };
  });

  protected requestBooking(mode: BookingMode): void {
    this.bookingRequested.emit({ spaceId: this.space().id, mode });
    this.dialog().close();
  }
}
