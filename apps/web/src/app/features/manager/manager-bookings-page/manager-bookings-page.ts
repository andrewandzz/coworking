import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, linkedSignal, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MANAGER_BOOKING_STATUSES } from '@coworking/contracts';
import type { ManagerBookingDetails, ManagerBookingsResult, ManagerBookingStatus } from '@coworking/contracts';
import { LucideChevronDown, LucideSearch } from '@lucide/angular';
import { debounceTime, firstValueFrom } from 'rxjs';
import { UkrainianPhonePipe } from '../../../shared/ukrainian-phone.pipe';
import { ManagerBookingDetailsDialog } from '../manager-booking-details-dialog/manager-booking-details-dialog';
import { MANAGER_BOOKING_STATUS_LABELS } from '../manager-booking-status';
import { ManagerCancelBookingDialog } from '../manager-cancel-booking-dialog/manager-cancel-booking-dialog';
import { ManagerPagination } from '../manager-pagination/manager-pagination';
import { ManagerPaginationQuery } from '../manager-pagination/manager-pagination-query';

const bookingsUrl = '/api/manager/bookings';
const requestTimeout = 12_000;

function bookingUrl(number: string): string {
  return `${bookingsUrl}/${encodeURIComponent(number)}`;
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 401;
}

@Component({
  selector: 'app-manager-bookings-page',
  imports: [LucideChevronDown, LucideSearch, UkrainianPhonePipe, ManagerPagination, ManagerBookingDetailsDialog, ManagerCancelBookingDialog],
  providers: [ManagerPaginationQuery],
  templateUrl: './manager-bookings-page.html',
  styleUrls: ['../manager-booking-table.css', './manager-bookings-page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagerBookingsPage {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly bookingsRevision = signal(0);
  private readonly detailsDialog = viewChild(ManagerBookingDetailsDialog);
  private readonly cancelDialog = viewChild(ManagerCancelBookingDialog);

  protected readonly pagination = inject(ManagerPaginationQuery);
  protected readonly statuses = MANAGER_BOOKING_STATUSES;
  protected readonly statusLabels = MANAGER_BOOKING_STATUS_LABELS;
  private readonly searchQuery = computed(() => this.pagination.params().get('q')?.trim().slice(0, 120) ?? '');
  protected readonly searchText = linkedSignal({
    source: this.searchQuery,
    computation: (query, previous): string => previous?.value.trim() === query ? previous.value : query,
  });
  private readonly pendingSearch = computed(() => this.router.currentNavigation() ? null : this.searchText().trim());
  protected readonly status = computed<ManagerBookingStatus | 'all'>(() => {
    const value = this.pagination.params().get('status');
    return this.statuses.find((status) => status === value) ?? 'all';
  });

  protected readonly bookings = httpResource<ManagerBookingsResult>(() => {
    // Start a fresh request when a cancellation changes which rows match the filters.
    this.bookingsRevision();
    const status = this.status();
    return {
      url: bookingsUrl,
      params: { q: this.searchQuery(), page: this.pagination.page(), ...(status === 'all' ? {} : { status }) },
      timeout: requestTimeout,
    };
  });
  protected readonly table = linkedSignal({
    source: () => this.bookings.hasValue() ? this.bookings.value() : undefined,
    computation: (result, previous): ManagerBookingsResult | undefined => result ?? previous?.value,
  });

  protected readonly selectedNumber = signal<string | null>(null);
  protected readonly cancellationNumber = signal<string | null>(null);
  protected readonly cancelling = signal(false);
  protected readonly cancellationError = signal('');
  protected readonly bookingDetails = httpResource<ManagerBookingDetails>(() => {
    const number = this.selectedNumber();
    return number ? { url: bookingUrl(number), timeout: requestTimeout } : undefined;
  });
  protected readonly selectedBooking = computed(() => {
    const booking = this.bookingDetails.hasValue() ? this.bookingDetails.value() : undefined;
    return booking?.bookingNumber === this.selectedNumber() ? booking : undefined;
  });
  protected readonly detailsError = computed(() => {
    const error = this.bookingDetails.error();
    if (error instanceof HttpErrorResponse && error.status === 404) return 'Бронювання за цим номером не знайдено.';
    return error ? 'Не вдалося завантажити деталі бронювання.' : '';
  });

  constructor() {
    toObservable(this.pendingSearch).pipe(debounceTime(200), takeUntilDestroyed()).subscribe((query) => {
      if (query !== null && query === this.pendingSearch() && query !== this.searchQuery()) {
        this.pagination.setPage(1, { queryParams: { q: query || null }, replaceUrl: true });
      }
    });

    effect(() => {
      if (isUnauthorized(this.bookings.error()) || isUnauthorized(this.bookingDetails.error())) {
        this.returnToLogin();
      } else if (this.bookings.hasValue()) {
        this.pagination.syncPage(this.bookings.value().page);
      }
    });
  }

  protected selectStatus(value: string): void {
    this.pagination.setPage(1, {
      queryParams: {
        status: this.statuses.find((status) => status === value) ?? null,
        q: this.searchText().trim() || null,
      },
    });
  }

  protected openDetails(number: string): void {
    this.selectedNumber.set(number);
  }

  protected requestCancellation(number: string): void {
    const booking = this.selectedBooking();
    if (booking?.bookingNumber !== number || booking.status !== 'booked' || this.cancellationNumber()) return;

    this.cancellationError.set('');
    this.cancellationNumber.set(number);
  }

  protected async confirmCancellation(): Promise<void> {
    const number = this.cancellationNumber();
    if (!number || this.cancelling()) return;

    this.cancelling.set(true);
    this.cancellationError.set('');
    try {
      const updated = await firstValueFrom(this.http.post<ManagerBookingDetails>(`${bookingUrl(number)}/cancel`, {}, {
        timeout: requestTimeout,
      }));
      if (this.destroyRef.destroyed) return;
      this.cancelDialog()?.close();
      if (this.selectedNumber() === number) {
        this.bookingDetails.set(updated);
        this.detailsDialog()?.focusHeading();
      }
      this.bookingsRevision.update((revision) => revision + 1);
    } catch (error) {
      if (this.destroyRef.destroyed) return;
      if (isUnauthorized(error)) {
        this.returnToLogin();
      } else {
        this.cancellationError.set('Не вдалося скасувати бронювання. Спробуйте ще раз.');
      }
    } finally {
      this.cancelling.set(false);
    }
  }

  private returnToLogin(): void {
    void this.router.navigate(['/manager', 'login'], { replaceUrl: true });
  }
}
