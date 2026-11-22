import { afterNextRender, Directive, ElementRef, inject, input, output } from '@angular/core';

@Directive({
  selector: 'dialog[appModalDialog]',
  exportAs: 'appModalDialog',
  host: {
    '[attr.closedby]': 'dismissible() && !confirmDismissal() ? null : "none"',
    '(cancel)': 'onCancel($event)',
    '(keydown)': 'onKeyDown($event)',
    '(click)': 'onBackdropClick($event)',
  },
})
export class ModalDialog {
  readonly dismissible = input(true, { alias: 'appModalDialogDismissible' });
  readonly confirmDismissal = input(false, { alias: 'appModalDialogConfirmDismissal' });
  readonly dismissRequested = output();
  readonly dialogClosed = output();

  private readonly dialog = inject<ElementRef<HTMLDialogElement>>(ElementRef).nativeElement;

  constructor() {
    afterNextRender({ write: () => this.dialog.showModal() });
  }

  close(): void {
    if (!this.dialog.open) return;

    this.dialog.close();
    this.dialogClosed.emit();
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.requestDismissal();
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !this.confirmDismissal()) return;

    event.preventDefault();
    if (!event.repeat) this.requestDismissal();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target !== this.dialog) return;

    const { left, top, right, bottom } = this.dialog.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) {
      this.requestDismissal();
    }
  }

  private requestDismissal(): void {
    if (!this.dismissible()) return;

    if (this.confirmDismissal()) this.dismissRequested.emit();
    else this.close();
  }
}
