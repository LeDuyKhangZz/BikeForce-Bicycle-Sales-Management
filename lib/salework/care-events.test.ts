import { describe, expect, it, vi } from 'vitest';
import {
  buildSaleWorkCareEvents, saleWorkCareWindow, saleWorkMessageSchema,
  type SaleWorkConversation, type SaleWorkMessage,
} from './care-events';
import { getSalesNameForSaleWorkAccount } from './sales-account-map';
import {
  listSaleWorkCareConversations, listSaleWorkCareMessages, type SaleWorkReader,
} from '@/services/salework-care-source';

const since = Date.parse('2026-11-14T17:00:00Z');
const until = Date.parse('2026-11-16T03:00:00Z');
const conversation: SaleWorkConversation = {
  id: 'conv-1', accountId: '123', toId: '456', group: false, lastMessageTime: until,
};
function message(overrides: Partial<SaleWorkMessage> = {}): SaleWorkMessage {
  return {
    id: { msgId: '1', conversationId: 'conv-1', uidFrom: '0', idTo: '456' },
    msgType: 'webchat', ts: since, ...overrides,
  };
}

describe('bằng chứng chăm sóc SaleWork', () => {
  it('chỉ lấy tin sale gửi, không dùng tin khách đến làm ngày đã chăm', () => {
    const incoming = message({ id: { ...message().id, msgId: '2', uidFrom: '456' } });
    expect(buildSaleWorkCareEvents(conversation, [message(), incoming], 'Sales A', since, until)).toEqual([{
      account_id: '123', peer_id: '456', message_id: '1', sales_name: 'Sales A',
      occurred_at: '2026-11-14T17:00:00.000Z',
    }]);
  });
  it.each(['chat.undo', 'chat.delete', 'chat.todo', 'unknown'])('không tính sự kiện %s', (msgType) => {
    expect(buildSaleWorkCareEvents(conversation, [message({ msgType })], 'A', since, until)).toEqual([]);
  });
  it('không tính nhóm, tin trước khoảng ngày hoặc trong tương lai', () => {
    expect(buildSaleWorkCareEvents({ ...conversation, group: true }, [message()], 'A', since, until)).toEqual([]);
    expect(buildSaleWorkCareEvents(conversation, [message({ ts: since - 1 }), message({ ts: until + 1 })], 'A', since, until)).toEqual([]);
  });
  it('khử trùng theo mã tin, giữ thời điểm gốc thay vì thời điểm đồng bộ', () => {
    expect(buildSaleWorkCareEvents(conversation, [message(), message()], 'A', since, until)).toHaveLength(1);
  });
  it('dừng khi tin nhắn lẫn hội thoại', () => {
    expect(() => buildSaleWorkCareEvents(conversation,
      [message({ id: { ...message().id, conversationId: 'another' } })], 'A', since, until)).toThrow();
  });
  it('đọc timestamp chuỗi nhưng không chấp nhận NaN, Infinity hoặc boolean', () => {
    expect(saleWorkMessageSchema.parse({ ...message(), ts: String(since) }).ts).toBe(since);
    for (const ts of [Number.NaN, Infinity, true, 'rác']) {
      expect(saleWorkMessageSchema.safeParse({ ...message(), ts }).success).toBe(false);
    }
  });
  it('ngày bắt đầu theo UTC+7 và từ chối ngày không tồn tại', () => {
    expect(saleWorkCareWindow('2026-11-15', until).since).toBe(since);
    for (const value of ['2026-02-30', '2026-13-01', '2027-01-01', '15/11/2026']) {
      expect(() => saleWorkCareWindow(value, until)).toThrow();
    }
  });
  it('chỉ ghép tài khoản đã cấu hình và từ chối hai tên thuộc hai sale khác nhau', () => {
    expect(getSalesNameForSaleWorkAccount(['(OFF) Abraham San Miền Trung'])).toBe('Ngô Thế San');
    expect(getSalesNameForSaleWorkAccount(['Abraham San Miền Trun'])).toBeNull();
    expect(getSalesNameForSaleWorkAccount(['Abraham San Miền Trung', 'Abraham Khải Hcm'])).toBeNull();
  });
});

describe('đọc lịch sử SaleWork đầy đủ', () => {
  it('đọc tiếp trang sau để tìm tin sale cũ hơn tin khách', async () => {
    const firstPage = Array.from({ length: 30 }, (_, index) => message({
      id: { ...message().id, msgId: `incoming-${index}`, uidFrom: '456' }, ts: until - index,
    }));
    const read = vi.fn<SaleWorkReader>()
      .mockResolvedValueOnce({ status: 'success', data: firstPage })
      .mockResolvedValueOnce({ status: 'success', data: [message()] });
    const rows = await listSaleWorkCareMessages(read, conversation, since);
    expect(rows).toHaveLength(31);
    expect(read.mock.calls[1]?.[1]?.timestamp).toBe(until - 29);
    expect(buildSaleWorkCareEvents(conversation, rows, 'A', since, until)).toHaveLength(1);
  });
  it('dừng với lỗi khi API lặp lại cursor; không coi là đọc đủ', async () => {
    const read = vi.fn<SaleWorkReader>().mockResolvedValue({
      status: 'success', data: Array.from({ length: 30 }, () => message({ ts: until })),
    });
    await expect(listSaleWorkCareMessages(read, conversation, since)).rejects.toThrow('Cursor');
  });
  it('không nhận hội thoại ngoài tài khoản đang đồng bộ', async () => {
    const read = vi.fn<SaleWorkReader>().mockResolvedValue({ status: 'success', data: [conversation] });
    await expect(async () => {
      for await (const row of listSaleWorkCareConversations(read, 'other-account', since)) void row;
    }).rejects.toThrow('tài khoản khác');
  });
});
