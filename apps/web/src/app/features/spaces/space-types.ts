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
