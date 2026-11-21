import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SpaceMarker } from '../space-marker/space-marker';
import type { SpaceType } from '../space-marker/space-marker';

export interface FloorPlanSpace {
  readonly id: string;
  readonly type: SpaceType;
  readonly number: number;
  readonly occupied: boolean;
  readonly matchesFilters?: boolean;
}

interface FloorPlanSlot {
  readonly key: `${SpaceType}-${number}`;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly walls?: 'bottom' | 'bottom-right' | 'top-right';
}

const DESK_SIZE = { width: 117, height: 61 };

// Coordinates are measured from the inside of the plan's outer wall.
const FLOOR_PLAN_SLOTS: readonly FloorPlanSlot[] = [
  { key: 'desk-1', left: 78, top: 101, ...DESK_SIZE },
  { key: 'desk-2', left: 237, top: 101, ...DESK_SIZE },
  { key: 'desk-3', left: 392, top: 101, ...DESK_SIZE },
  { key: 'desk-4', left: 78, top: 269, ...DESK_SIZE },
  { key: 'desk-5', left: 237, top: 269, ...DESK_SIZE },
  { key: 'desk-6', left: 392, top: 269, ...DESK_SIZE },
  { key: 'meeting-room-1', left: 585, top: 0, width: 308, height: 206, walls: 'bottom-right' },
  { key: 'meeting-room-2', left: 585, top: 238, width: 308, height: 193, walls: 'top-right' },
  { key: 'skype-booth-1', left: 1004, top: 0, width: 229, height: 135, walls: 'bottom' },
  { key: 'skype-booth-2', left: 1004, top: 135, width: 229, height: 148, walls: 'bottom' },
  { key: 'skype-booth-3', left: 1004, top: 283, width: 229, height: 148 },
];

@Component({
  selector: 'app-floor-plan',
  imports: [SpaceMarker],
  templateUrl: './floor-plan.html',
  styleUrl: './floor-plan.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlan {
  readonly spaces = input.required<readonly FloorPlanSpace[]>();
  readonly spaceSelected = output<string>();

  protected readonly slots = computed(() => {
    const spacesBySlot = new Map(
      this.spaces().map((space) => [`${space.type}-${space.number}`, space]),
    );

    return FLOOR_PLAN_SLOTS.map((slot) => ({
      ...slot,
      space: spacesBySlot.get(slot.key),
    }));
  });
}
