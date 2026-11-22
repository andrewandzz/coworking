import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, linkedSignal, signal, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { getBookingWindow } from '@coworking/contracts';
import type { ManagerReportPeriod, ManagerRevenueReport } from '@coworking/contracts';
import { LucideCalendarDays } from '@lucide/angular';
import { showDatePicker } from '../../../shared/ui/native-date-picker';
import { UkrainianPhonePipe } from '../../../shared/ukrainian-phone.pipe';
import { formatBookingAmount, formatBookingDate, formatBookingHour } from '../../booking/booking-format';
import { ManagerPagination } from '../manager-pagination/manager-pagination';
import { ManagerPaginationQuery } from '../manager-pagination/manager-pagination-query';

type PeriodField = keyof ManagerReportPeriod;

function defaultPeriod(): ManagerReportPeriod {
  const { today } = getBookingWindow();
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

function isCalendarDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;

  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

@Component({
  selector: 'app-manager-reports-page',
  imports: [LucideCalendarDays, ManagerPagination, UkrainianPhonePipe],
  providers: [ManagerPaginationQuery],
  templateUrl: './manager-reports-page.html',
  styleUrls: ['../manager-booking-table.css', './manager-reports-page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagerReportsPage {
  private readonly router = inject(Router);
  private readonly pagination = inject(ManagerPaginationQuery);
  private readonly fromField = viewChild<ElementRef<HTMLInputElement>>('fromInput');
  private readonly toField = viewChild<ElementRef<HTMLInputElement>>('toInput');
  private readonly fallbackPeriod = defaultPeriod();
  private readonly period = computed<ManagerReportPeriod>(() => {
    const params = this.pagination.params();
    const from = params.get('from');
    const to = params.get('to');
    return isCalendarDate(from) && isCalendarDate(to) && from <= to ? { from, to } : this.fallbackPeriod;
  }, { equal: (previous, next) => previous.from === next.from && previous.to === next.to });

  protected readonly fromDate = linkedSignal(() => this.period().from);
  protected readonly toDate = linkedSignal(() => this.period().to);
  protected readonly periodError = signal<{ field: PeriodField; message: string } | null>(null);

  protected readonly report = httpResource<ManagerRevenueReport>(() => ({
    url: '/api/manager/reports',
    params: { ...this.period(), page: this.pagination.page() },
    timeout: 12_000,
  }));
  protected readonly result = linkedSignal({
    source: () => ({ period: this.period(), report: this.report.hasValue() ? this.report.value() : undefined }),
    computation: ({ period, report }, previous): ManagerRevenueReport | undefined => {
      if (report?.period.from === period.from && report.period.to === period.to) return report;
      return previous?.source.period === period ? previous.value : undefined;
    },
  });

  protected readonly showDatePicker = showDatePicker;
  protected readonly formatBookingAmount = formatBookingAmount;
  protected readonly formatBookingDate = formatBookingDate;
  protected readonly formatBookingHour = formatBookingHour;

  constructor() {
    effect(() => {
      // Sync both native fields when restoring an applied period from browser history.
      const { from, to } = this.period();
      const fromInput = this.fromField()?.nativeElement;
      const toInput = this.toField()?.nativeElement;
      if (fromInput && fromInput.value !== from) fromInput.value = from;
      if (toInput && toInput.value !== to) toInput.value = to;
      this.periodError.set(null);
    });

    effect(() => {
      const error = this.report.error();
      if (error instanceof HttpErrorResponse && error.status === 401) {
        void this.router.navigate(['/manager', 'login'], { replaceUrl: true });
      } else if (this.report.hasValue()) {
        this.pagination.syncPage(this.report.value().page);
      }
    });
  }

  protected formatDate(date: string): string {
    return date ? date.split('-').reverse().join('.') : 'ДД.ММ.РРРР';
  }

  protected selectPage(page: number): void {
    this.pagination.setPage(page, { queryParams: this.period() });
  }

  protected generateReport(event: SubmitEvent, from: HTMLInputElement, to: HTMLInputElement): void {
    event.preventDefault();
    if (!from.validity.valid) {
      this.periodError.set({ field: 'from', message: 'Вкажіть дійсну початкову дату.' });
      from.focus();
      return;
    }
    if (!to.validity.valid || to.value < from.value) {
      this.periodError.set({
        field: 'to',
        message: to.validity.valid ? 'Кінцева дата має бути не раніше за початкову.' : 'Вкажіть дійсну кінцеву дату.',
      });
      to.focus();
      return;
    }

    this.periodError.set(null);
    const current = this.period();
    if (from.value === current.from && to.value === current.to && this.pagination.page() === 1) {
      this.report.reload();
    }
    this.pagination.setPage(1, { queryParams: { from: from.value, to: to.value } });
  }
}
