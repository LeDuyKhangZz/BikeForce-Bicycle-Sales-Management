import { describe, expect, it } from 'vitest';

import { isJwtSessionUsable } from './jwt-session';

function tokenWithExpiry(exp: number): string {
  const payload = Buffer.from(JSON.stringify({ exp }), 'utf8').toString('base64url');
  return `header.${payload}.signature`;
}

describe('isJwtSessionUsable', () => {
  it('tái sử dụng token còn hơn ngưỡng an toàn', () => {
    expect(isJwtSessionUsable(tokenWithExpiry(3_000), 1_000_000, 900)).toBe(true);
  });

  it('từ chối token sắp hết hạn hoặc không hợp lệ', () => {
    expect(isJwtSessionUsable(tokenWithExpiry(1_800), 1_000_000, 900)).toBe(false);
    expect(isJwtSessionUsable('invalid', 1_000_000, 900)).toBe(false);
  });
});
