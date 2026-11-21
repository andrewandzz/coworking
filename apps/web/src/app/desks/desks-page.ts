import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { addCalendarDays, DESK_ZONES, getBookingWindow } from '@coworking/contracts';
import type { Availability, DeskAvailability, DeskZone } from '@coworking/contracts';
import {
  LucideCalendarDays, LucideChevronLeft, LucideChevronRight, LucideHeadphones, LucideMonitor, LucideSun,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { BookingApi, bookingErrorMessage, storageMessage } from '../booking-api';
import { ConfirmDialog } from '../confirm-dialog';
import { formatDate, zoneLabel } from '../labels';

const DAYS_PER_WEEK = 7;

@Component({
  imports: [
    RouterLink, ConfirmDialog, LucideCalendarDays, LucideChevronLeft, LucideChevronRight,
    LucideHeadphones, LucideMonitor, LucideSun,
  ],
  templateUrl: './desks-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesksPage {
  private readonly api = inject(BookingApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmation = viewChild.required(ConfirmDialog);
  private readonly initialWindow = getBookingWindow();

  protected readonly formatDate = formatDate;
  protected readonly zoneLabel = zoneLabel;
  protected readonly zones = DESK_ZONES;
  protected readonly storageWarning = this.api.headers ? '' : storageMessage;
  protected readonly selectedDate = signal(this.initialWindow.today);
  protected readonly weekStart = signal(this.initialWindow.today);
  protected readonly zone = signal<DeskZone | 'all'>('all');
  protected readonly selectedDesk = signal<DeskAvailability | null>(null);
  protected readonly pending = signal(false);
  protected readonly confirmationError = signal('');
  protected readonly notice = signal<{ text: string; success: boolean } | null>(null);

  protected readonly availability = httpResource<Availability>(() => ({
    url: '/api/desks',
    params: { date: this.selectedDate() },
    timeout: 12_000,
  }));
  private readonly schedule = computed(() =>
    this.availability.hasValue() ? this.availability.value() : this.initialWindow,
  );
  protected readonly today = computed(() => this.schedule().today);
  protected readonly lastDate = computed(() => this.schedule().lastDate);
  protected readonly dates = computed(() => Array.from(
    { length: DAYS_PER_WEEK },
    (_, index) => addCalendarDays(this.weekStart(), index),
  ));
  protected readonly visibleDesks = computed(() => {
    const desks = this.availability.hasValue() ? this.availability.value().desks : [];
    return this.zone() === 'all' ? desks : desks.filter((desk) => desk.zone === this.zone());
  });
  protected readonly availableCount = computed(() => this.visibleDesks().filter((desk) => desk.available).length);
  protected readonly confirmationDescription = computed(() => {
    const desk = this.selectedDesk();
    return desk ? `Місце ${desk.id} · ${formatDate(this.selectedDate(), 'long')} · на весь день` : '';
  });

  protected changeWeek(direction: -1 | 1): void {
    const next = addCalendarDays(this.weekStart(), direction * DAYS_PER_WEEK);
    if (next < this.today() || next > this.lastDate()) return;
    this.weekStart.set(next);
    this.selectDate(next);
  }

  protected selectDate(date: string): void {
    this.notice.set(null);
    this.selectedDate.set(date);
  }

  protected selectDesk(desk: DeskAvailability): void {
    this.selectedDesk.set(desk);
    this.confirmationError.set('');
    this.confirmation().show();
  }

  protected async confirmBooking(): Promise<void> {
    const desk = this.selectedDesk();
    if (!desk || this.pending()) return;
    this.pending.set(true);
    this.confirmationError.set('');
    try {
      await firstValueFrom(this.api.book({ deskId: desk.id, date: this.selectedDate() }));
      if (this.destroyRef.destroyed) return;
      this.notice.set({ text: `Місце ${desk.id} заброньовано.`, success: true });
      this.confirmation().close();
      this.availability.reload();
    } catch (error) {
      if (this.destroyRef.destroyed) return;
      const text = bookingErrorMessage(error, 'Не вдалося забронювати місце. Спробуйте ще раз.');
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.notice.set({ text, success: false });
        this.confirmation().close();
        this.availability.reload();
      } else {
        this.confirmationError.set(text);
      }
    } finally {
      this.pending.set(false);
    }
  }
}
