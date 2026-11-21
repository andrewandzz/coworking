import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import type { ManagerRevenueReport } from '@coworking/contracts';
import { z } from 'zod';
import { ManagerSessionGuard } from '../manager-auth/manager-session.guard.js';
import { DEMO_MANAGER_BOOKINGS } from './demo-bookings.js';
import { pageSchema, paginateBookings } from './paginate-bookings.js';

const pageSize = 6;
const querySchema = z.strictObject({
  from: z.iso.date({ error: 'Вкажіть початкову дату у форматі РРРР-ММ-ДД.' }),
  to: z.iso.date({ error: 'Вкажіть кінцеву дату у форматі РРРР-ММ-ДД.' }),
  page: pageSchema,
}).refine(({ from, to }) => from <= to, {
  path: ['to'],
  error: 'Кінцева дата має бути не раніше за початкову.',
});

@Controller('manager/reports')
@UseGuards(ManagerSessionGuard)
export class ManagerReportsController {
  @Get()
  @Header('Cache-Control', 'no-store')
  getRevenue(@Query({ schema: querySchema }) { from, to, page = 1 }: z.output<typeof querySchema>): ManagerRevenueReport {
    const matching = DEMO_MANAGER_BOOKINGS
      .filter(({ status, date }) => status === 'completed' && date >= from && date <= to)
      .sort((left, right) => right.date.localeCompare(left.date) || left.bookingNumber.localeCompare(right.bookingNumber));
    const totalRevenueInKopiykas = matching.reduce((total, booking) => total + booking.amountInKopiykas, 0);
    const { bookings, ...pagination } = paginateBookings(matching, page, pageSize);

    return {
      ...pagination,
      period: { from, to },
      totalRevenueInKopiykas,
      bookings: bookings.map(({ bookingNumber, customerName, phone, amountInKopiykas }) => ({
        bookingNumber, customerName, phone, amountInKopiykas,
      })),
    };
  }
}
