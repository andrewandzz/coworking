import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';
import { normalizeUkrainianPhone } from '@coworking/contracts';

export function formatUkrainianPhone(value: string): string | undefined {
  const digits = normalizeUkrainianPhone(value);
  if (!digits) return undefined;

  return `+38 (${digits.slice(2, 5)}) ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10)}`;
}

@Pipe({ name: 'ukrainianPhone' })
export class UkrainianPhonePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return (value && formatUkrainianPhone(value)) || '—';
  }
}
