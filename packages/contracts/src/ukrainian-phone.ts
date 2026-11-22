export function normalizeUkrainianPhone(value: string): string | undefined {
  const dialString = value.replace(/[\s().-]/g, '').replace(/^(?:\+|00)/, '');
  const digits = /^0\d{9}$/.test(dialString) ? `38${dialString}` : dialString;
  return /^380[1-9]\d{8}$/.test(digits) ? digits : undefined;
}
