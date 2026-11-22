import { ChangeDetectionStrategy, Component, input, output, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import type { ManagerBookingDetails } from '@coworking/contracts';
import { LucideX } from '@lucide/angular';
import { ModalDialog } from '../../../shared/ui/modal-dialog';
import { UkrainianPhonePipe } from '../../../shared/ukrainian-phone.pipe';
import { formatBookingAmount, formatBookingDate, formatBookingHour } from '../../booking/booking-format';
import { MANAGER_BOOKING_STATUS_LABELS } from '../manager-booking-status';

@Component({
  selector: 'app-manager-booking-details-dialog',
  imports: [LucideX, ModalDialog, UkrainianPhonePipe],
  templateUrl: './manager-booking-details-dialog.html',
  styleUrl: './manager-booking-details-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagerBookingDetailsDialog {
  readonly bookingNumber = input.required<string>();
  readonly booking = input<ManagerBookingDetails>();
  readonly loadError = input('');
  readonly closed = output();
  readonly retryRequested = output();
  readonly cancelRequested = output<string>();

  private readonly heading = viewChild.required<ElementRef<HTMLHeadingElement>>('heading');

  protected readonly formatBookingAmount = formatBookingAmount;
  protected readonly formatBookingDate = formatBookingDate;
  protected readonly formatBookingHour = formatBookingHour;
  protected readonly statusLabels = { ...MANAGER_BOOKING_STATUS_LABELS, booked: 'Оплачено' };

  focusHeading(): void {
    this.heading().nativeElement.focus();
  }
}
