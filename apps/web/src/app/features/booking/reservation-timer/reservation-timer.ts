import { ChangeDetectionStrategy, Component, computed, effect, input, linkedSignal, output, untracked } from '@angular/core';
import { LucideClock } from '@lucide/angular';

@Component({
  selector: 'app-reservation-timer',
  imports: [LucideClock],
  template: `
    <span class="reservation-timer inline-flex items-center justify-center rounded-full font-bold"
        role="timer" aria-label="Час до завершення резерву" aria-live="off">
      <svg lucideClock class="shrink-0" size="26" strokeWidth="1.5" aria-hidden="true"></svg>
      {{ label() }}
    </span>
  `,
  styles: `
    .reservation-timer {
      min-inline-size: clamp(6rem, 18.65cqi, 7.6875rem);
      min-block-size: clamp(2.5rem, 8.1cqi, 3.3125rem);
      gap: 0.625rem;
      padding-inline: 0.875rem;
      background: #d9e8ca;
      color: #346831;
      font-size: clamp(1.0625rem, 3.65cqi, 1.5rem);
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationTimer {
  readonly expiresAt = input.required<number>();
  readonly expired = output();

  private readonly seconds = linkedSignal(() => Math.max(0, Math.ceil((this.expiresAt() - Date.now()) / 1000)));
  protected readonly label = computed(() => {
    const total = this.seconds();
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  });

  constructor() {
    effect((onCleanup) => {
      const deadline = this.expiresAt();
      let timeout: ReturnType<typeof setTimeout> | undefined;

      const tick = () => {
        const remaining = Math.max(0, deadline - Date.now());
        this.seconds.set(Math.ceil(remaining / 1000));
        if (remaining === 0) {
          untracked(() => this.expired.emit());
          return;
        }
        timeout = setTimeout(tick, remaining % 1000 || 1000);
      };

      onCleanup(() => clearTimeout(timeout));
      tick();
    });
  }
}
