import { afterNextRender, Directive, ElementRef, inject, input, output } from '@angular/core';

@Directive({
  selector: 'dialog[appModalDialog]',
  exportAs: 'appModalDialog',
  host: {
    '(cancel)': 'onCancel($event)',
    '(click)': 'onBackdropClick($event)',
  },
})
export class ModalDialog {
  readonly dismissible = input(true, { alias: 'appModalDialogDismissible' });
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
    if (this.dismissible()) this.close();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (!this.dismissible() || event.target !== this.dialog) return;

    const { left, top, right, bottom } = this.dialog.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) {
      this.close();
    }
  }
}
