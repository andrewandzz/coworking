import { afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, input, output, viewChild } from '@angular/core';
import { LucideTimer, LucideX } from '@lucide/angular';

const NOTICES = {
  expired: {
    title: 'Час резервування минув!',
    message: 'Ваше тимчасове бронювання скасовано, оскільки минуло 5 хвилин.',
    action: 'Забронювати знову',
  },
  'payment-failed': {
    title: 'Не вдалося оформити бронювання!',
    message: 'Оплату не завершено. Спробуйте ще раз.',
    action: 'Спробувати знову',
  },
} as const;

@Component({
  selector: 'app-booking-notice',
  imports: [LucideTimer, LucideX],
  template: `
    <div class="booking-notice-panel relative text-center" [attr.data-kind]="kind()">
      <button type="button" class="booking-notice-close absolute grid size-11 place-items-center rounded-lg"
          aria-label="Закрити" (click)="dismissed.emit()">
        <svg lucideX size="30" strokeWidth="1.5" aria-hidden="true"></svg>
      </button>
      <span class="booking-notice-icon mx-auto grid place-items-center rounded-full" aria-hidden="true">
        @if (kind() === 'expired') {
          <svg lucideTimer size="42" strokeWidth="2.25"></svg>
        } @else {
          <svg lucideX size="52" strokeWidth="2.75"></svg>
        }
      </span>
      <h2 #heading id="booking-notice-title" class="booking-notice-title mx-auto font-bold" tabindex="-1" autofocus>
        {{ notice().title }}
      </h2>
      <p class="booking-notice-message mx-auto">{{ notice().message }}</p>
      <button type="button" class="booking-notice-action w-full font-bold" (click)="actionRequested.emit()">
        {{ notice().action }}
      </button>
    </div>
  `,
  styleUrl: './booking-notice.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingNotice {
  readonly kind = input.required<keyof typeof NOTICES>();
  readonly dismissed = output();
  readonly actionRequested = output();

  private readonly heading = viewChild.required<ElementRef<HTMLHeadingElement>>('heading');
  protected readonly notice = computed(() => NOTICES[this.kind()]);

  constructor() {
    afterNextRender({ write: () => this.heading().nativeElement.focus() });
  }
}
