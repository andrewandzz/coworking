import {
  ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, linkedSignal, output, signal, viewChild,
} from '@angular/core';
import { BOOKING_NAME_MAX_LENGTH, normalizeUkrainianPhone } from '@coworking/contracts';
import { LucideX } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { BookingApi } from '../../../booking-api';
import { ModalDialog } from '../../../shared/ui/modal-dialog';
import { formatUkrainianPhone } from '../../../shared/ukrainian-phone.pipe';
import { BookingCancelDialog } from '../booking-cancel-dialog/booking-cancel-dialog';
import { BookingNotice } from '../booking-notice/booking-notice';
import type { BookingContact, BookingContactSubmission, BookingReservation } from '../booking-reservation';
import { ReservationTimer } from '../reservation-timer/reservation-timer';

const CONTACT_FIELDS = ['firstName', 'lastName', 'phone'] as const;
type ContactField = keyof BookingContact;
type ContactErrors = Partial<Record<ContactField, string>>;
type ContactPhase = 'active' | 'expired' | 'cancelled';

@Component({
  selector: 'app-contact-form',
  imports: [ModalDialog, BookingCancelDialog, BookingNotice, ReservationTimer, LucideX],
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactForm {
  readonly reservation = input.required<BookingReservation>();
  readonly continued = output<BookingContactSubmission>();
  readonly retryRequested = output();
  readonly closed = output<BookingReservation | null>();

  private readonly bookingApi = inject(BookingApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cancelDialog = viewChild(BookingCancelDialog);
  private readonly phase = linkedSignal<ContactPhase>(() => Date.now() >= this.reservation().expiresAt ? 'expired' : 'active');

  protected readonly nameMaxLength = BOOKING_NAME_MAX_LENGTH;
  protected readonly expired = computed(() => this.phase() === 'expired');
  protected readonly errors = signal<ContactErrors>({});
  protected readonly confirmingCancellation = signal(false);
  protected readonly cancelling = signal(false);
  protected readonly cancellationError = signal('');

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
    if (this.confirmingCancellation() || this.cancelling() || !this.keepReservation()) return;

    const reservation = this.reservation();
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

  protected requestCancellation(): void {
    if (!this.cancelling() && this.keepReservation()) this.confirmingCancellation.set(true);
  }

  protected resumeBooking(): void {
    this.confirmingCancellation.set(false);
    this.keepReservation();
  }

  protected async confirmCancellation(dialog: ModalDialog): Promise<void> {
    if (!this.confirmingCancellation() || this.cancelling() || !this.keepReservation()) return;

    this.cancellationError.set('');
    this.cancelling.set(true);
    try {
      await firstValueFrom(this.bookingApi.releaseSpace(this.reservation().token));
      if (this.destroyRef.destroyed) return;

      this.phase.set('cancelled');
      this.closeCancellation();
      dialog.close();
    } catch {
      if (this.destroyRef.destroyed) return;
      this.cancellationError.set('Не вдалося скасувати бронювання. Спробуйте ще раз.');
      this.closeCancellation();
    } finally {
      this.cancelling.set(false);
      if (!this.destroyRef.destroyed) this.keepReservation();
    }
  }

  protected close(): void {
    this.closed.emit(this.phase() === 'cancelled' ? null : this.reservation());
  }

  protected expire(): void {
    if (this.cancelling() || this.phase() !== 'active') return;

    this.phase.set('expired');
    this.closeCancellation();
  }

  protected retry(dialog: ModalDialog): void {
    this.retryRequested.emit();
    dialog.close();
  }

  private keepReservation(): boolean {
    if (this.phase() !== 'active') return false;
    if (Date.now() < this.reservation().expiresAt) return true;

    this.expire();
    return false;
  }

  private closeCancellation(): void {
    this.confirmingCancellation.set(false);
    this.cancelDialog()?.close();
  }
}
