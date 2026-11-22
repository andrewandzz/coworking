import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import type { ManagerRevenueReport } from '@coworking/contracts';
import { z } from 'zod';
import { ManagerSessionGuard } from '../manager-auth/manager-session.guard.js';
import { ManagerBookingsService } from './manager-bookings.service.js';
import { pageSchema } from './paginate-bookings.js';

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
  constructor(private readonly bookings: ManagerBookingsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  getRevenue(@Query({ schema: querySchema }) { from, to, page = 1 }: z.output<typeof querySchema>): Promise<ManagerRevenueReport> {
    return this.bookings.report({ from, to }, page);
  }
}
