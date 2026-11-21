import { addCalendarDays, getBookingWindow } from '@coworking/contracts';
import type { ManagerBookingDetails, ManagerBookingStatus } from '@coworking/contracts';

const customers = [
  'Олена Борисенко',
  'Андрій Коваль',
  'Ірина Мельник',
  'Максим Шевченко',
  'Катерина Савчук',
  'Дмитро Кравченко',
  'Софія Бондар',
  'Назар Ткаченко',
] as const;

const statuses: readonly ManagerBookingStatus[] = [
  'completed', 'booked', 'cancelled', 'completed', 'completed', 'completed', 'completed',
];

const spaces = [
  'Робочий стіл 3', 'Робочий стіл 6', 'Переговорна кімната 1', 'Skype-кабіна 2',
] as const;

const { today } = getBookingWindow();

export const DEMO_MANAGER_BOOKINGS: readonly ManagerBookingDetails[] = Array.from({ length: 50 }, (_, index) => {
  const customer = index % customers.length;
  const status = statuses[index % statuses.length];
  const week = Math.floor(index / statuses.length);
  const isDayBooking = index % 5 === 4;
  return {
    bookingNumber: `CW-${5742 + index}`,
    customerName: customers[customer],
    phone: `+380 00 123 45 ${67 + customer}`,
    status,
    spaceLabel: spaces[index % spaces.length],
    date: addCalendarDays(today, status === 'booked' ? week + 1 : -week - 1),
    startHour: isDayBooking ? 9 : 12,
    endHour: isDayBooking ? 18 : 14,
    amountInKopiykas: isDayBooking ? 48_000 : 16_000,
  };
});
