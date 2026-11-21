import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { BOOKING_PASS_PREFIX } from '@coworking/contracts';
import { LucideCheck, LucideX } from '@lucide/angular';
import { encode } from 'uqr';
import { ModalDialog } from '../../../shared/ui/modal-dialog';
import { formatBookingDate, formatBookingHour } from '../booking-format';
import type { BookingConfirmation } from '../booking-reservation';
import { createConfirmationPng, createQrPng } from './confirmation-image';

@Component({
  selector: 'app-booking-result',
  imports: [ModalDialog, LucideCheck, LucideX],
  templateUrl: './booking-result.html',
  styleUrl: './booking-result.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingResult {
  readonly confirmation = input.required<BookingConfirmation>();
  readonly closed = output();

  private readonly document = inject(DOCUMENT);
  private readonly qrModules = computed(() => encode(
    `${BOOKING_PASS_PREFIX}${this.confirmation().checkInToken}`,
    { border: 4, ecc: 'M' },
  ).data);

  protected readonly qrImage = computed(() => createQrPng(this.document, this.qrModules()));
  protected readonly downloadError = signal(false);
  protected readonly details = computed(() => {
    const { bookingNumber, spaceLabel, schedule } = this.confirmation();
    return {
      bookingNumber,
      spaceLabel,
      date: formatBookingDate(schedule.date),
      time: `${formatBookingHour(schedule.startHour)} - ${formatBookingHour(schedule.endHour)}`,
    };
  });

  protected downloadConfirmation(link: HTMLAnchorElement): void {
    const png = createConfirmationPng(this.document, this.qrModules(), this.details());
    this.downloadError.set(png === null);
    if (!png) return;

    link.href = png;
    link.click();
  }
}
