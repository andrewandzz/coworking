import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideCalendarCheck, LucideLayoutGrid } from '@lucide/angular';

@Component({
  selector: 'app-booking-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LucideLayoutGrid, LucideCalendarCheck],
  templateUrl: './booking-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingLayout {}
