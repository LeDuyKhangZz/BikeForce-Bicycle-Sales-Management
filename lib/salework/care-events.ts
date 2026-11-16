import { z } from 'zod';

const sourceIdSchema = z.string().trim().regex(/^[A-Za-z0-9_-]+$/).max(200);
const timestampSchema = z.union([z.number(), z.string().regex(/^\d+$/)])
  .transform(Number).pipe(z.number().int().positive().safe());

export const saleWorkConversationSchema = z.object({
  id: sourceIdSchema,
  accountId: sourceIdSchema,
  toId: sourceIdSchema,
  group: z.boolean(),
  lastMessageTime: timestampSchema,
});

export const saleWorkMessageSchema = z.object({
  id: z.object({
    msgId: sourceIdSchema,
    conversationId: sourceIdSchema,
    uidFrom: z.string(),
    idTo: z.string(),
  }),
  msgType: z.string(),
  ts: timestampSchema,
});

export const saleWorkAccountSchema = z.object({
  accountId: sourceIdSchema,
  displayName: z.string().nullish(),
  zaloName: z.string().nullish(),
  swName: z.string().nullish(),
});

export type SaleWorkConversation = z.infer<typeof saleWorkConversationSchema>;
export type SaleWorkMessage = z.infer<typeof saleWorkMessageSchema>;
export type SaleWorkAccount = z.infer<typeof saleWorkAccountSchema>;
export type SaleWorkCareEvent = {
  account_id: string;
  peer_id: string;
  message_id: string;
  sales_name: string;
  occurred_at: string;
};

// Các sự kiện hệ thống, thu hồi, thông báo nhóm và cuộc gọi chưa được đối soát
// không phải bằng chứng về một tin nhắn chăm sóc đã gửi.
const CARE_MESSAGE_TYPES = new Set([
  'webchat', 'chat.photo', 'chat.video.msg', 'chat.link', 'share.file', 'chat.sticker',
]);

export function buildSaleWorkCareEvents(
  conversation: SaleWorkConversation,
  messages: readonly SaleWorkMessage[],
  salesName: string,
  since: number,
  until: number,
): SaleWorkCareEvent[] {
  if (conversation.group) return [];
  const events = new Map<string, SaleWorkCareEvent>();
  for (const message of messages) {
    if (message.id.conversationId !== conversation.id) {
      throw new Error('Tin nhắn không thuộc hội thoại đang đồng bộ.');
    }
    if (message.id.uidFrom !== '0' || !CARE_MESSAGE_TYPES.has(message.msgType)
      || message.ts < since || message.ts > until) continue;
    events.set(message.id.msgId, {
      account_id: conversation.accountId,
      peer_id: conversation.toId,
      message_id: message.id.msgId,
      sales_name: salesName,
      occurred_at: new Date(message.ts).toISOString(),
    });
  }
  return [...events.values()];
}

export function saleWorkCareWindow(fromDate: string, now: number): { since: number; until: number } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) throw new Error('Ngày bắt đầu phải có dạng YYYY-MM-DD.');
  const since = Date.parse(`${fromDate}T00:00:00+07:00`);
  if (!Number.isFinite(since) || new Date(since + 7 * 3_600_000).toISOString().slice(0, 10) !== fromDate
    || since > now) throw new Error('Ngày bắt đầu không hợp lệ hoặc nằm trong tương lai.');
  return { since, until: now };
}
