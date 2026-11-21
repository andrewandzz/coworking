import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SpaceTypeIcon } from '../space-type-icon/space-type-icon';
import { SPACE_TYPE_LABELS } from '../space-types';
import type { SpaceType } from '../space-types';

export type { SpaceType } from '../space-types';

@Component({
  selector: 'app-space-marker',
  imports: [SpaceTypeIcon],
  templateUrl: './space-marker.html',
  styleUrls: ['../space-status.css', './space-marker.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceMarker {
  readonly spaceId = input.required<string>();
  readonly type = input.required<SpaceType>();
  readonly number = input.required<number>();
  readonly occupied = input.required<boolean>();
  readonly matchesFilters = input(true);
  readonly spaceSelected = output<string>();

  protected readonly visualState = computed(() => {
    if (!this.matchesFilters()) return 'filtered';
    return this.occupied() ? 'occupied' : 'available';
  });

  protected readonly accessibleLabel = computed(() => {
    const space = `${SPACE_TYPE_LABELS[this.type()].singular} ${this.number()}`;
    const availability = this.occupied() ? 'зайнято' : 'вільно';
    return this.matchesFilters()
      ? `${space}, ${availability}`
      : `${space}, ${availability}, не відповідає фільтрам`;
  });
}
