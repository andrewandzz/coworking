import { createHash } from 'node:crypto';
import { addCalendarDays, getBookingWindow } from '@coworking/contracts';
import type { SpaceType } from '@coworking/contracts';
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { calculateLegacyBookingAmount, isWholeWorkday } from '../booking-passes/booking-pass-summary.js';
import { tryLockBookingSpace } from '../booking-passes/space-lock.js';

type SampleBooking = readonly [
  customerName: string,
  spaceId: `${SpaceType}-${number}`,
  dayOffset: number,
  startHour: number,
  endHour: number,
  cancelled?: true,
];

const bookings: readonly SampleBooking[] = [
  ['Олена Борисенко', 'desk-3', -1, 12, 14],
  ['Андрій Коваль', 'desk-6', 1, 12, 14],
  ['Ірина Мельник', 'meeting-room-1', -1, 14, 16, true],
  ['Максим Шевченко', 'skype-booth-2', -1, 10, 11],
  ['Катерина Савчук', 'desk-1', -2, 9, 18],
  ['Дмитро Кравченко', 'meeting-room-1', 4, 15, 17],
  ['Софія Бондар', 'desk-2', -1, 9, 12],
  ['Назар Ткаченко', 'skype-booth-1', 2, 11, 12],
  ['Марія Лисенко', 'meeting-room-2', -2, 10, 13],
  ['Владислав Романюк', 'desk-4', -3, 9, 13],
  ['Анна Мороз', 'desk-5', 3, 13, 18, true],
  ['Олександр Ковтун', 'desk-5', 3, 9, 12],
  ['Злата Петренко', 'skype-booth-3', -3, 16, 18, true],
  ['Артем Гриценко', 'desk-2', -4, 9, 18],
  ['Вероніка Шевчук', 'meeting-room-1', -4, 11, 14],
  ['Данило Левченко', 'desk-1', 7, 9, 18, true],
  ['Юлія Марченко', 'skype-booth-1', -3, 13, 14],
  ['Богдан Зінченко', 'desk-5', -5, 10, 16],
  ['Вікторія Олійник', 'desk-6', -2, 15, 18],
  ['Павло Сидоренко', 'meeting-room-2', -5, 10, 12, true],
  ['Ольга Костенко', 'desk-3', -6, 9, 18],
  ['Роман Поліщук', 'skype-booth-2', 1, 10, 11, true],
  ['Анастасія Дяченко', 'desk-2', 4, 9, 18],
  ['Сергій Мазур', 'skype-booth-3', -6, 11, 13],
  ['Дарина Козак', 'meeting-room-2', 5, 9, 12],
  ['Микита Климчук', 'desk-4', 1, 13, 16],
  ['Аліна Степаненко', 'desk-4', -7, 13, 17],
  ['Тарас Гнатюк', 'skype-booth-2', 6, 16, 18],
  ['Наталія Білоус', 'desk-1', -8, 9, 11],
  ['Ілля Павленко', 'meeting-room-1', -7, 14, 18],
  ['Єва Бойко', 'desk-1', 8, 10, 16],
  ['Олег Василенко', 'skype-booth-1', -9, 12, 13],
  ['Маргарита Юрченко', 'desk-5', -8, 9, 18],
  ['Віталій Гончар', 'desk-6', -10, 11, 15],
  ['Олена Стеценко', 'meeting-room-1', -9, 14, 17, true],
  ['Кіра Шаповал', 'desk-3', -11, 10, 13],
  ['Лев Гаврилюк', 'desk-6', 9, 10, 14, true],
  ['Надія Кучеренко', 'skype-booth-3', -10, 16, 17],
  ['Кирило Руденко', 'desk-2', -7, 9, 14],
  ['Валерія Рибак', 'desk-4', -11, 9, 18, true],
  ['Денис Соловей', 'meeting-room-2', -12, 14, 18],
  ['Соломія Кушнір', 'skype-booth-3', 3, 11, 12],
  ['Ярослав Осадчук', 'desk-3', 2, 9, 18],
  ['Поліна Ткачук', 'desk-5', -13, 10, 12],
  ['Михайло Іванчук', 'skype-booth-2', -14, 14, 15],
  ['Інна Литвин', 'meeting-room-1', -10, 9, 11],
  ['Олексій Кравець', 'desk-6', 10, 10, 15],
  ['Яна Бабенко', 'meeting-room-2', 12, 13, 18],
  ['Марко Романенко', 'desk-4', -14, 9, 18],
  ['Христина Ковальчук', 'desk-2', -15, 10, 12],
];

const mobileCodes = ['067', '050', '063', '068', '066', '073', '096', '095', '093', '097', '099', '077', '098', '075'];

// Stable hashes identify the seed rows for retries and rollback without issuing QR passes.
const samples = bookings.map(([customerName, spaceId, dayOffset, startHour, endHour, cancelled], index) => ({
  customerName, spaceId, dayOffset, startHour, endHour, cancelled,
  tokenHash: createHash('sha256').update(`coworking:booking-history:1795737600000:${index}`).digest('hex'),
  phone: `38${mobileCodes[index % mobileCodes.length]}${1_234_567 + index * 9_173}`,
}));

export class SeedBookingHistory1795737600000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.options.type === 'mssql') {
      const spaceIds = [...new Set(samples.map(({ spaceId }) => spaceId))].sort();
      for (const spaceId of spaceIds) {
        if (!await tryLockBookingSpace(queryRunner, spaceId)) {
          throw new Error(`Could not lock ${spaceId} to seed booking history.`);
        }
      }
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const { today } = getBookingWindow(now);
    for (const sample of samples) {
      const { tokenHash, customerName, spaceId, dayOffset, startHour, endHour, phone, cancelled } = sample;
      const date = addCalendarDays(today, dayOffset);
      const hours = { startHour, endHour };
      const amount = calculateLegacyBookingAmount(hours, isWholeWorkday(hours) ? 'daily' : 'hourly');
      const cancelledAt = cancelled ? (dayOffset < 0 ? `${date}T00:00:00.000Z` : nowIso) : null;

      await queryRunner.sql`
        INSERT INTO booking_passes (
          token_hash, space_id, booking_date, start_hour, end_hour, phone, customer_name,
          amount_in_kopiykas, cancelled_at
        )
        SELECT ${tokenHash}, ${spaceId}, ${date}, ${startHour}, ${endHour}, ${phone}, ${customerName},
          ${amount}, ${cancelledAt}
        WHERE NOT EXISTS (SELECT 1 FROM booking_passes WHERE token_hash = ${tokenHash})
          AND NOT EXISTS (
            SELECT 1 FROM booking_passes
            WHERE space_id = ${spaceId} AND booking_date = ${date}
              AND start_hour < ${endHour} AND end_hour > ${startHour}
              AND cancelled_at IS NULL AND (hold_expires_at IS NULL OR hold_expires_at > ${nowIso})
          )
      `;
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.sql`
      DELETE FROM booking_passes WHERE token_hash IN (${() => samples.map(({ tokenHash }) => tokenHash)})
    `;
  }
}
