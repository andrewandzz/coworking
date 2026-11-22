import {
  addCalendarDays, COWORKING_CLOSING_HOUR, COWORKING_OPENING_HOUR,
  DEMO_BOOKING_RATES_IN_KOPIYKAS, getBookingWindow, SPACE_TYPE_LABELS,
} from '@coworking/contracts';
import type { ManagerBookingDetails, ManagerBookingStatus, SpaceType } from '@coworking/contracts';

type DemoBooking = readonly [
  customerName: string,
  status: ManagerBookingStatus,
  dayOffset: number,
  space: readonly [type: SpaceType, number: number],
  hours: readonly [startHour: number, endHour: number],
];

const bookings: readonly DemoBooking[] = [
  ['Олена Борисенко', 'completed', -1, ['desk', 3], [12, 14]],
  ['Андрій Коваль', 'booked', 1, ['desk', 6], [12, 14]],
  ['Ірина Мельник', 'cancelled', -1, ['meeting-room', 1], [14, 16]],
  ['Максим Шевченко', 'completed', -1, ['skype-booth', 2], [10, 11]],
  ['Катерина Савчук', 'completed', -2, ['desk', 1], [9, 18]],
  ['Дмитро Кравченко', 'booked', 4, ['meeting-room', 1], [15, 17]],
  ['Софія Бондар', 'completed', -1, ['desk', 2], [9, 12]],

  ['Назар Ткаченко', 'booked', 2, ['skype-booth', 1], [11, 12]],
  ['Марія Лисенко', 'completed', -2, ['meeting-room', 2], [10, 13]],
  ['Владислав Романюк', 'completed', -3, ['desk', 4], [9, 13]],
  ['Анна Мороз', 'cancelled', 3, ['desk', 5], [13, 18]],
  ['Олександр Ковтун', 'booked', 3, ['desk', 5], [9, 12]],
  ['Злата Петренко', 'cancelled', -3, ['skype-booth', 3], [16, 18]],
  ['Артем Гриценко', 'completed', -4, ['desk', 2], [9, 18]],

  ['Вероніка Шевчук', 'completed', -4, ['meeting-room', 1], [11, 14]],
  ['Данило Левченко', 'cancelled', 7, ['desk', 1], [9, 18]],
  ['Юлія Марченко', 'completed', -3, ['skype-booth', 1], [13, 14]],
  ['Богдан Зінченко', 'completed', -5, ['desk', 5], [10, 16]],
  ['Вікторія Олійник', 'completed', -2, ['desk', 6], [15, 18]],
  ['Павло Сидоренко', 'cancelled', -5, ['meeting-room', 2], [10, 12]],
  ['Ольга Костенко', 'completed', -6, ['desk', 3], [9, 18]],

  ['Роман Поліщук', 'cancelled', 1, ['skype-booth', 2], [10, 11]],
  ['Анастасія Дяченко', 'booked', 4, ['desk', 2], [9, 18]],
  ['Сергій Мазур', 'completed', -6, ['skype-booth', 3], [11, 13]],
  ['Дарина Козак', 'booked', 5, ['meeting-room', 2], [9, 12]],
  ['Микита Климчук', 'booked', 1, ['desk', 4], [13, 16]],
  ['Аліна Степаненко', 'completed', -7, ['desk', 4], [13, 17]],
  ['Тарас Гнатюк', 'booked', 6, ['skype-booth', 2], [16, 18]],

  ['Наталія Білоус', 'completed', -8, ['desk', 1], [9, 11]],
  ['Ілля Павленко', 'completed', -7, ['meeting-room', 1], [14, 18]],
  ['Єва Бойко', 'booked', 8, ['desk', 1], [10, 16]],
  ['Олег Василенко', 'completed', -9, ['skype-booth', 1], [12, 13]],
  ['Маргарита Юрченко', 'completed', -8, ['desk', 5], [9, 18]],
  ['Віталій Гончар', 'completed', -10, ['desk', 6], [11, 15]],
  ['Олена Стеценко', 'cancelled', -9, ['meeting-room', 1], [14, 17]],

  ['Кіра Шаповал', 'completed', -11, ['desk', 3], [10, 13]],
  ['Лев Гаврилюк', 'cancelled', 9, ['desk', 6], [10, 14]],
  ['Надія Кучеренко', 'completed', -10, ['skype-booth', 3], [16, 17]],
  ['Кирило Руденко', 'completed', -7, ['desk', 2], [9, 14]],
  ['Валерія Рибак', 'cancelled', -11, ['desk', 4], [9, 18]],
  ['Денис Соловей', 'completed', -12, ['meeting-room', 2], [14, 18]],
  ['Соломія Кушнір', 'booked', 3, ['skype-booth', 3], [11, 12]],

  ['Ярослав Осадчук', 'booked', 2, ['desk', 3], [9, 18]],
  ['Поліна Ткачук', 'completed', -13, ['desk', 5], [10, 12]],
  ['Михайло Іванчук', 'completed', -14, ['skype-booth', 2], [14, 15]],
  ['Інна Литвин', 'completed', -10, ['meeting-room', 1], [9, 11]],
  ['Олексій Кравець', 'booked', 10, ['desk', 6], [10, 15]],
  ['Яна Бабенко', 'booked', 12, ['meeting-room', 2], [13, 18]],
  ['Марко Романенко', 'completed', -14, ['desk', 4], [9, 18]],
  ['Христина Ковальчук', 'completed', -15, ['desk', 2], [10, 12]],
];

const { today } = getBookingWindow();
const mobileCodes = ['067', '050', '063', '068', '066', '073', '096', '095', '093', '097', '099', '077', '098', '075'];

export const DEMO_MANAGER_BOOKINGS: readonly ManagerBookingDetails[] = bookings.map(
  ([customerName, status, dayOffset, [spaceType, spaceNumber], [startHour, endHour]], index) => {
    const mobileCode = mobileCodes[index % mobileCodes.length];
    const subscriberNumber = String(1_234_567 + index * 9_173);
    const fullDay = startHour === COWORKING_OPENING_HOUR && endHour === COWORKING_CLOSING_HOUR;
    const { hourly, daily } = DEMO_BOOKING_RATES_IN_KOPIYKAS;

    return {
      bookingNumber: `CW-${5742 + index}`,
      customerName,
      phone: `38${mobileCode}${subscriberNumber}`,
      status,
      spaceLabel: `${SPACE_TYPE_LABELS[spaceType].singular} ${spaceNumber}`,
      date: addCalendarDays(today, dayOffset),
      startHour,
      endHour,
      amountInKopiykas: fullDay ? daily : hourly * (endHour - startHour),
    };
  },
);
