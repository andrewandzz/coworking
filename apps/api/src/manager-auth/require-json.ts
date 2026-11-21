import { UnsupportedMediaTypeException } from '@nestjs/common';

export function requireJson(contentType?: string): void {
  if (!/^application\/json(?:\s*;|$)/i.test(contentType ?? '')) {
    throw new UnsupportedMediaTypeException('Надішліть запит у форматі JSON.');
  }
}
