export const SPACE_TYPE_LABELS = {
  desk: { singular: 'Робочий стіл', plural: 'Робочі столи' },
  'meeting-room': { singular: 'Переговорна кімната', plural: 'Переговорні кімнати' },
  'skype-booth': { singular: 'Skype-кабіна', plural: 'Skype-кабіни' },
} as const;

export type SpaceType = keyof typeof SPACE_TYPE_LABELS;

export const SPACE_AMENITIES = [
  { id: 'generator', label: 'Генератор', filterLabel: 'Генератори' },
  { id: 'quiet-zone', label: 'Тиха зона', filterLabel: 'Тиха зона' },
  { id: 'dual-monitors', label: 'Два монітори', filterLabel: 'Два монітори' },
] as const;

export type SpaceAmenity = (typeof SPACE_AMENITIES)[number]['id'];
export type BookingMode = 'hourly' | 'daily';
export type BookingRates = Readonly<Record<BookingMode, number>>;

interface CoworkingSpace {
  readonly id: `${SpaceType}-${number}`;
  readonly type: SpaceType;
  readonly number: number;
  readonly amenities: readonly SpaceAmenity[];
}

export const COWORKING_SPACES: readonly CoworkingSpace[] = [
  { id: 'desk-1', type: 'desk', number: 1, amenities: ['generator', 'dual-monitors'] },
  { id: 'desk-2', type: 'desk', number: 2, amenities: ['generator'] },
  { id: 'desk-3', type: 'desk', number: 3, amenities: ['generator', 'dual-monitors'] },
  { id: 'desk-4', type: 'desk', number: 4, amenities: ['quiet-zone'] },
  { id: 'desk-5', type: 'desk', number: 5, amenities: ['generator', 'dual-monitors', 'quiet-zone'] },
  { id: 'desk-6', type: 'desk', number: 6, amenities: ['generator', 'dual-monitors'] },
  { id: 'meeting-room-1', type: 'meeting-room', number: 1, amenities: ['generator'] },
  { id: 'meeting-room-2', type: 'meeting-room', number: 2, amenities: [] },
  { id: 'skype-booth-1', type: 'skype-booth', number: 1, amenities: ['quiet-zone'] },
  { id: 'skype-booth-2', type: 'skype-booth', number: 2, amenities: ['quiet-zone'] },
  { id: 'skype-booth-3', type: 'skype-booth', number: 3, amenities: ['quiet-zone'] },
];

const BASE_HOURLY_RATES_IN_KOPIYKAS: Record<SpaceType, number> = {
  desk: 8_000,
  'skype-booth': 13_000,
  'meeting-room': 18_000,
};
const HOURLY_AMENITY_SURCHARGES_IN_KOPIYKAS: Record<SpaceAmenity, number> = {
  generator: 1_000,
  'quiet-zone': 1_500,
  'dual-monitors': 2_000,
};
const DAILY_RATE_HOURS = 6;

export function getSpaceBookingRates({ type, amenities }: Pick<CoworkingSpace, 'type' | 'amenities'>): BookingRates {
  const hourly = amenities.reduce(
    (amount, amenity) => amount + HOURLY_AMENITY_SURCHARGES_IN_KOPIYKAS[amenity],
    BASE_HOURLY_RATES_IN_KOPIYKAS[type],
  );
  return { hourly, daily: hourly * DAILY_RATE_HOURS };
}

export function calculateBookingTotal(rates: BookingRates, mode: BookingMode, durationHours: number): number {
  return mode === 'daily' ? rates.daily : rates.hourly * durationHours;
}
