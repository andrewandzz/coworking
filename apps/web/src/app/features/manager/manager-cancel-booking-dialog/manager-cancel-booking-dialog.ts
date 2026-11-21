import { ChangeDetectionStrategy, Component, input, output, viewChild } from '@angular/core';
import { LucideX } from '@lucide/angular';
import { ModalDialog } from '../../../shared/ui/modal-dialog';

@Component({
  selector: 'app-manager-cancel-booking-dialog',
  imports: [LucideX, ModalDialog],
  templateUrl: './manager-cancel-booking-dialog.html',
  styleUrl: './manager-cancel-booking-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagerCancelBookingDialog {
  readonly bookingNumber = input.required<string>();
  readonly pending = input(false);
  readonly error = input('');
  readonly confirmed = output();
  readonly closed = output();

  private readonly dialog = viewChild.required(ModalDialog);

  close(): void {
    this.dialog().close();
  }
}
