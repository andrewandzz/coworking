export { SPACE_TYPE_LABELS } from '@coworking/contracts';
export type { SpaceType } from '@coworking/contracts';

export const SPACE_AMENITIES = [
  { id: 'generator', label: 'Генератор', filterLabel: 'Генератори' },
  { id: 'quiet-zone', label: 'Тиха зона', filterLabel: 'Тиха зона' },
  { id: 'dual-monitors', label: 'Два монітори', filterLabel: 'Два монітори' },
] as const;

export type SpaceAmenity = (typeof SPACE_AMENITIES)[number]['id'];
