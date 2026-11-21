import {
  ChangeDetectionStrategy, Component, ElementRef, input, output, viewChild,
} from '@angular/core';
import { LucideX } from '@lucide/angular';

@Component({
  selector: 'app-confirm-dialog',
  imports: [LucideX],
  template: `
    <dialog #dialog class="confirm-dialog" aria-labelledby="confirm-title"
        aria-describedby="confirm-description" (cancel)="onCancel($event)" (close)="closed.emit()">
      <div class="flex items-start justify-between gap-4">
        <h2 id="confirm-title" class="text-xl font-extrabold">{{ title() }}</h2>
        <button type="button" class="icon-button -mt-1 -mr-1" aria-label="Закрити"
            [disabled]="pending()" (click)="close()">
          <svg lucideX size="19" aria-hidden="true"></svg>
        </button>
      </div>
      <p id="confirm-description" class="mt-2 text-muted">{{ description() }}</p>
      @if (error()) {
        <p role="alert" class="mt-4 text-sm font-semibold text-danger">{{ error() }}</p>
      }
      <div class="dialog-actions">
        <button type="button" class="button button-secondary" [disabled]="pending()" (click)="close()" autofocus>
          {{ dismissLabel() }}
        </button>
        <button type="button" class="button" [class.button-primary]="!dangerous()"
            [class.button-danger]="dangerous()" [disabled]="pending()" (click)="confirmed.emit()">
          {{ pending() ? pendingLabel() : confirmLabel() }}
        </button>
      </div>
    </dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly pendingLabel = input.required<string>();
  readonly dismissLabel = input('Назад');
  readonly pending = input(false);
  readonly dangerous = input(false);
  readonly error = input('');
  readonly confirmed = output();
  readonly closed = output();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  show(): void {
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  protected onCancel(event: Event): void {
    if (this.pending()) event.preventDefault();
  }
}
