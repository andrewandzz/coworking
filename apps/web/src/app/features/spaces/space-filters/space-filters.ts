import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { LucideCheck, LucideChevronDown, LucideRefreshCw } from '@lucide/angular';
import { SPACE_AMENITIES, SPACE_TYPE_LABELS } from '../space-types';
import type { SpaceAmenity, SpaceType } from '../space-types';

export type { SpaceAmenity } from '../space-types';

export interface SpaceFiltersValue {
  readonly type: SpaceType | 'all';
  readonly amenities: readonly SpaceAmenity[];
}

export const DEFAULT_SPACE_FILTERS: SpaceFiltersValue = { type: 'all', amenities: [] };

@Component({
  selector: 'app-space-filters',
  imports: [LucideCheck, LucideChevronDown, LucideRefreshCw],
  templateUrl: './space-filters.html',
  styleUrl: './space-filters.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceFilters {
  readonly filters = model<SpaceFiltersValue>(DEFAULT_SPACE_FILTERS);

  protected readonly amenities = SPACE_AMENITIES;
  protected readonly spaceTypes = Object.keys(SPACE_TYPE_LABELS) as SpaceType[];
  protected readonly spaceTypeLabels = SPACE_TYPE_LABELS;

  protected selectType(selected: string): void {
    const type = this.spaceTypes.find((spaceType) => spaceType === selected) ?? 'all';
    this.filters.update((current) => ({ ...current, type }));
  }

  protected toggleAmenity(amenity: SpaceAmenity, checked: boolean): void {
    this.filters.update((current) => {
      const selected = current.amenities.filter((item) => item !== amenity);
      if (checked) selected.push(amenity);
      return { ...current, amenities: selected };
    });
  }

  protected resetFilters(): void {
    this.filters.set(DEFAULT_SPACE_FILTERS);
  }
}
