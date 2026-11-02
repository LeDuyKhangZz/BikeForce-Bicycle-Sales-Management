import { afterEach, describe, expect, it, vi } from 'vitest';
import { syncSaleWorkToPolymind } from './polymind-sync';

const reports = ['Cô Lê', 'Cô Thy', 'Other'].map((accountName) => ({
  accountName, conversations: 12, sentMessages: 30, receivedMessages: 24,
  incomingCalls: 7, outgoingCalls: 9, missedCalls: 2, callDuration: '25.17 phút',
}));
const date = '2026-10-21';
const timestamp = '2026-10-21T07:30:00Z';
const log = vi.fn();
afterEach(() => vi.useRealTimers());

describe('Polymind snapshot delivery', () => {
  it('gửi đúng hai người, chỉ số gốc, thời lượng giây và key trong header', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"ok":true}'));
    // Mỗi request có body phản hồi riêng.
    fetcher.mockImplementation(async () => new Response('{"ok":true}'));
    await syncSaleWorkToPolymind(reports, date, timestamp, 'secret', fetcher, log);
    expect(fetcher).toHaveBeenCalledTimes(2);
    for (const [index, person] of ['co-le', 'co-thy'].entries()) {
      const call = fetcher.mock.calls[index];
      expect(call?.[0]).toBe('https://www.polymind.vn/api/integrations/bikeforce/salework');
      expect(call?.[1]?.headers).toEqual({ 'Content-Type': 'application/json', 'x-api-key': 'secret' });
      expect(JSON.parse(String(call?.[1]?.body))).toEqual({ person, date, snapshot: {
        conversations: 12, sentMessages: 30, receivedMessages: 24, incomingCalls: 7,
        outgoingCalls: 9, missedCalls: 2, callDurationSeconds: 1517, syncedAt: timestamp,
      } });
    }
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret');
  });

  it('không gửi khi chưa cấu hình key hoặc thiếu một người', async () => {
    const fetcher = vi.fn<typeof fetch>();
    await syncSaleWorkToPolymind(reports, date, timestamp, undefined, fetcher, log);
    await expect(syncSaleWorkToPolymind([], date, timestamp, 'key', fetcher, log)).rejects.toThrow('Thiếu');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([400, 401])('không retry HTTP %i nhưng vẫn thử người thứ hai', async (status) => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response('', { status }));
    await expect(syncSaleWorkToPolymind(reports, date, timestamp, 'key', fetcher, log)).rejects.toThrow('co-le, co-thy');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each(['server', 'timeout'])('retry lỗi %s với cùng payload', async (kind) => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>()
      .mockImplementationOnce(async () => {
        if (kind === 'timeout') throw new DOMException('timeout', 'TimeoutError');
        return new Response('', { status: 503 });
      })
      .mockImplementation(async () => new Response('{"ok":true}'));
    const delivery = syncSaleWorkToPolymind(reports, date, timestamp, 'key', fetcher, log);
    await vi.runAllTimersAsync();
    await delivery;
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[0]?.[1]?.body).toBe(fetcher.mock.calls[1]?.[1]?.body);
  });

  it('HTTP 200 thiếu xác nhận không được coi là thành công', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response('{}'));
    await expect(syncSaleWorkToPolymind(reports, date, timestamp, 'key', fetcher, log)).rejects.toThrow('thất bại');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
