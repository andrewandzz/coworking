import { z } from 'zod';

export const pageSchema = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.int()).optional();

export function paginateBookings<T>(bookings: readonly T[], requestedPage: number, pageSize: number) {
  const total = bookings.length;
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)));
  const start = (page - 1) * pageSize;
  return { bookings: bookings.slice(start, start + pageSize), page, pageSize, total };
}
