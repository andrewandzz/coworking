import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-coworking-brand',
  template: '<span class="mark" aria-hidden="true"></span><span>Coworking</span>',
  styleUrl: './coworking-brand.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoworkingBrand {}
