import { ChangeDetectionStrategy, Component, input, linkedSignal, output, signal } from '@angular/core';
import { BOOKING_NAME_MAX_LENGTH, normalizeUkrainianPhone } from '@coworking/contracts';
import { LucideX } from '@lucide/angular';
import { ModalDialog } from '../../../shared/ui/modal-dialog';
import { formatUkrainianPhone } from '../../../shared/ukrainian-phone.pipe';
import { BookingNotice } from '../booking-notice/booking-notice';
import type { BookingContact, BookingContactSubmission, BookingReservation } from '../booking-reservation';
import { ReservationTimer } from '../reservation-timer/reservation-timer';

const CONTACT_FIELDS = ['firstName', 'lastName', 'phone'] as const;
type ContactField = keyof BookingContact;
type ContactErrors = Partial<Record<ContactField, string>>;

@Component({
  selector: 'app-contact-form',
  imports: [ModalDialog, BookingNotice, ReservationTimer, LucideX],
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactForm {
  readonly reservation = input.required<BookingReservation>();
  readonly continued = output<BookingContactSubmission>();
  readonly retryRequested = output();
  readonly closed = output();

  protected readonly nameMaxLength = BOOKING_NAME_MAX_LENGTH;
  protected readonly expired = linkedSignal(() => Date.now() >= this.reservation().expiresAt);
  protected readonly errors = signal<ContactErrors>({});

  protected clearError(field: ContactField): void {
    if (this.errors()[field]) {
      this.errors.update((current) => ({ ...current, [field]: undefined }));
    }
  }

  protected formatPhoneInput(input: HTMLInputElement): void {
    input.value = formatUkrainianPhone(input.value) ?? input.value;
  }

  protected submit(event: SubmitEvent, form: HTMLFormElement, dialog: ModalDialog): void {
    event.preventDefault();
    const reservation = this.reservation();
    if (Date.now() >= reservation.expiresAt) {
      this.expired.set(true);
      return;
    }

    const data = new FormData(form);
    const enteredPhone = String(data.get('phone') ?? '').trim();
    const contact: BookingContact = {
      firstName: String(data.get('firstName') ?? '').trim(),
      lastName: String(data.get('lastName') ?? '').trim(),
      phone: normalizeUkrainianPhone(enteredPhone) ?? '',
    };
    const errors: ContactErrors = {};
    if (!contact.firstName) errors.firstName = 'Введіть ім’я.';
    if (!contact.lastName) errors.lastName = 'Введіть прізвище.';
    if (!contact.phone) {
      errors.phone = enteredPhone ? 'Введіть дійсний український номер телефону.' : 'Введіть номер телефону.';
    }

    this.errors.set(errors);
    const firstInvalidField = CONTACT_FIELDS.find((field) => errors[field]);
    if (firstInvalidField) {
      const field = form.elements.namedItem(firstInvalidField);
      if (field instanceof HTMLInputElement) field.focus();
      return;
    }

    this.continued.emit({ reservation, contact });
    dialog.close();
  }

  protected retry(dialog: ModalDialog): void {
    this.retryRequested.emit();
    dialog.close();
  }
}
