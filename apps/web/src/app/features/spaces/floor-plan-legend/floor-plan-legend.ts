import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SpaceTypeIcon } from '../space-type-icon/space-type-icon';
import { SPACE_TYPE_LABELS } from '../space-types';
import type { SpaceType } from '../space-types';

@Component({
  selector: 'app-floor-plan-legend',
  imports: [SpaceTypeIcon],
  templateUrl: './floor-plan-legend.html',
  styleUrls: ['../space-status.css', './floor-plan-legend.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanLegend {
  readonly filtersActive = input(false);

  protected readonly statuses = [
    { state: 'available', label: 'Вільно' },
    { state: 'occupied', label: 'Зайнято' },
    { state: 'filtered', label: 'Не відповідає фільтрам' },
  ] as const;
  protected readonly spaceTypes = Object.keys(SPACE_TYPE_LABELS) as SpaceType[];
  protected readonly spaceTypeLabels = SPACE_TYPE_LABELS;
}
