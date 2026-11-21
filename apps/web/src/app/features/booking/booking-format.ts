const amountFormatter = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 });

const dateFormatter = new Intl.DateTimeFormat('uk-UA', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function formatBookingAmount(kopiykas: number): string {
  return amountFormatter.format(kopiykas / 100);
}

export function formatBookingHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function formatBookingDate(isoDate: string): string {
  const { weekday, day, month, year } = Object.fromEntries(
    dateFormatter.formatToParts(new Date(`${isoDate}T00:00:00Z`)).map(({ type, value }) => [type, value]),
  );
  const weekdayLabel = weekday.charAt(0).toLocaleUpperCase('uk-UA') + weekday.slice(1);
  return `${weekdayLabel}, ${day} ${month} ${year}`;
}
