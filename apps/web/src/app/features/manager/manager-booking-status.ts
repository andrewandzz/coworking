import type { ManagerBookingStatus } from '@coworking/contracts';

export const MANAGER_BOOKING_STATUS_LABELS: Readonly<Record<ManagerBookingStatus, string>> = {
  booked: 'Заброньовано',
  completed: 'Завершено',
  cancelled: 'Скасовано',
};
