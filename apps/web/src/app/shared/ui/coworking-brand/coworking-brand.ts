import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-coworking-brand',
  template: `
    <a class="brand-link" href="./" aria-label="Coworking, головна сторінка">
      <span class="mark" aria-hidden="true"></span>
      <span>Coworking</span>
    </a>
  `,
  styleUrl: './coworking-brand.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoworkingBrand {}
