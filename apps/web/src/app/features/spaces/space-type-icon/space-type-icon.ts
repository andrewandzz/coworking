import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideHeadphones } from '@lucide/angular';
import type { SpaceType } from '../space-types';

@Component({
  selector: 'app-space-type-icon',
  imports: [LucideHeadphones],
  host: { 'aria-hidden': 'true' },
  template: `
    @switch (type()) {
      @case ('desk') {
        <span class="space-desk-icon"><span></span></span>
      }
      @case ('meeting-room') {
        <span class="meeting-icon"><span></span><span></span><span></span></span>
      }
      @case ('skype-booth') {
        <svg lucideHeadphones strokeWidth="1.2" class="booth-icon"></svg>
      }
    }
  `,
  styleUrl: './space-type-icon.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceTypeIcon {
  readonly type = input.required<SpaceType>();
}
