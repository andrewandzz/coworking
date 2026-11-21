export function showDatePicker(input: HTMLInputElement): void {
  try {
    input.showPicker?.();
  } catch {
    // Keep the native field available for keyboard entry.
  }
}
