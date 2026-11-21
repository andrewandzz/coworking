import type { DeskZone } from '@coworking/contracts';

export const zoneLabel = {
  open: 'Відкрита зона',
  quiet: 'Тиха зона',
  window: 'Біля вікна',
} satisfies Record<DeskZone, string>;

const dates = {
  day: new Intl.DateTimeFormat('uk-UA', { day: 'numeric', timeZone: 'UTC' }),
  weekday: new Intl.DateTimeFormat('uk-UA', { weekday: 'short', timeZone: 'UTC' }),
  short: new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
  long: new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
};

export function formatDate(date: string, format: keyof typeof dates): string {
  return dates[format].format(new Date(`${date}T00:00:00Z`));
}
