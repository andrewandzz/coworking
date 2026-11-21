import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, linkedSignal, signal } from '@angular/core';
import { Router } from '@angular/router';
import { getBookingWindow } from '@coworking/contracts';
import type { ManagerReportPeriod, ManagerRevenueReport } from '@coworking/contracts';
import { LucideCalendarDays } from '@lucide/angular';
import { showDatePicker } from '../../../shared/ui/native-date-picker';
import { formatBookingAmount } from '../../booking/booking-format';
import { ManagerPagination } from '../manager-pagination/manager-pagination';

type PeriodField = keyof ManagerReportPeriod;

function defaultPeriod(): ManagerReportPeriod {
  const { today } = getBookingWindow();
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

@Component({
  selector: 'app-manager-reports-page',
  imports: [LucideCalendarDays, ManagerPagination],
  templateUrl: './manager-reports-page.html',
  styleUrls: ['../manager-booking-table.css', './manager-reports-page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagerReportsPage {
  private readonly router = inject(Router);

  protected readonly initialPeriod = defaultPeriod();
  private readonly period = signal(this.initialPeriod);

  protected readonly fromDate = signal(this.initialPeriod.from);
  protected readonly toDate = signal(this.initialPeriod.to);
  protected readonly periodError = signal<{ field: PeriodField; message: string } | null>(null);
  protected readonly page = linkedSignal({ source: this.period, computation: () => 1 });

  protected readonly report = httpResource<ManagerRevenueReport>(() => ({
    url: '/api/manager/reports',
    params: { ...this.period(), page: this.page() },
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

  constructor() {
    effect(() => {
      const error = this.report.error();
      if (error instanceof HttpErrorResponse && error.status === 401) {
        void this.router.navigate(['/manager', 'login'], { replaceUrl: true });
      }
    });
  }

  protected formatDate(date: string): string {
    return date ? date.split('-').reverse().join('.') : 'ДД.ММ.РРРР';
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
    this.period.set({ from: from.value, to: to.value });
  }
}
