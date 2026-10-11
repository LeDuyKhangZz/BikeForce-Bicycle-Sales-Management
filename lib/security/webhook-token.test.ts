import { describe, expect, it } from 'vitest';

import { hasValidWebhookToken } from './webhook-token';

describe('hasValidWebhookToken', () => {
  it('chỉ nhận token trùng khớp', () => {
    expect(hasValidWebhookToken('secret', 'secret')).toBe(true);
    expect(hasValidWebhookToken('wrong!', 'secret')).toBe(false);
  });

  it('fail closed khi thiếu header hoặc env trống', () => {
    expect(hasValidWebhookToken(null, 'secret')).toBe(false);
    expect(hasValidWebhookToken('secret', undefined)).toBe(false);
    expect(hasValidWebhookToken('secret', '   ')).toBe(false);
  });
});
