import { ChangeDetectionStrategy, Component, output, viewChild } from '@angular/core';
import { LucideCalendar, LucideCircleX, LucideX } from '@lucide/angular';
import { ModalDialog } from '../../../shared/ui/modal-dialog';

@Component({
  selector: 'app-booking-cancel-dialog',
  imports: [LucideCalendar, LucideCircleX, LucideX, ModalDialog],
  templateUrl: './booking-cancel-dialog.html',
  styleUrl: './booking-cancel-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingCancelDialog {
  readonly confirmed = output();
  readonly closed = output();

  private readonly dialog = viewChild.required(ModalDialog);

  close(): void {
    this.dialog().close();
  }
}
