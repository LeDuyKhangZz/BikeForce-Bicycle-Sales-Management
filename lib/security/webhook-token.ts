import { timingSafeEqual } from 'node:crypto';

export function hasValidWebhookToken(provided: string | null, expected: string | undefined): boolean {
  if (provided === null || expected === undefined || expected.trim() === '') return false;

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
