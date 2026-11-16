import { afterEach, expect, it, vi } from 'vitest';

import { fetchMisaAccessToken } from './misa-public-api';

const credentials = {
  apiBase: 'https://example.invalid',
  clientId: 'test-client',
  clientSecret: 'test-secret',
  defaultStockCode: null,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('logs only safe metadata when MISA returns an error envelope with HTTP 200', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
    success: false, code: 401, data: null, message: 'test-secret',
  })));
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  await expect(fetchMisaAccessToken(credentials)).rejects.toThrow('Không tìm thấy access token');
  expect(log).toHaveBeenCalledWith('[misa-account-diagnostic]', {
    httpStatus: 200, success: false, code: 401,
    payloadType: 'object', dataType: 'null', dataLength: null,
  });
  expect(JSON.stringify(log.mock.calls)).not.toContain('test-secret');
});

it('does not log a valid token', async () => {
  const token = 'test-token-'.repeat(8);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: true, code: 0, data: token })));
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  await expect(fetchMisaAccessToken(credentials)).resolves.toBe(token);
  expect(log).not.toHaveBeenCalled();
});
