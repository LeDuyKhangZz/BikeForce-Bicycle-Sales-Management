import { z } from 'zod';

import {
  saleWorkAccountSchema, saleWorkConversationSchema, saleWorkMessageSchema,
  type SaleWorkAccount, type SaleWorkConversation, type SaleWorkMessage,
} from '@/lib/salework/care-events';

export type SaleWorkReader = (path: string, body?: Record<string, unknown>) => Promise<unknown>;
const PAGE_SIZE = 30;
const MAX_PAGES = 1000;

function responseSchema<T extends z.ZodType>(item: T) {
  return z.object({ status: z.literal('success'), data: z.array(item) });
}

export async function listSaleWorkCareAccounts(read: SaleWorkReader): Promise<SaleWorkAccount[]> {
  return responseSchema(saleWorkAccountSchema).parse(await read('/api/account/getAll')).data;
}

/** Từng tài khoản có cursor riêng; không tải hết khách của mọi sale vào một trang. */
export async function* listSaleWorkCareConversations(
  read: SaleWorkReader,
  accountId: string,
  since: number,
): AsyncGenerator<SaleWorkConversation> {
  let cursor = 0;
  const seen = new Set<string>();
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const rows = responseSchema(saleWorkConversationSchema).parse(await read('/api/conversation', {
      isGroup: false, unread: false, unReplied: null, searchKey: '', accountIds: [accountId],
      lastMessageTime: cursor, selectedTags: [], noTags: false, dateRange: [],
      pageSize: PAGE_SIZE, searchId: 'bikeforce-care',
    })).data;
    for (const row of rows) {
      if (row.accountId !== accountId) throw new Error('SaleWork trả hội thoại của tài khoản khác.');
      if (!row.group && row.lastMessageTime >= since && !seen.has(row.id)) {
        seen.add(row.id);
        yield row;
      }
    }
    if (rows.length < PAGE_SIZE) return;
    const oldest = Math.min(...rows.map((row) => row.lastMessageTime));
    if (oldest < since) return;
    if (cursor !== 0 && oldest >= cursor) throw new Error('Cursor hội thoại không tiến; chưa xác nhận đủ dữ liệu.');
    cursor = oldest;
  }
  throw new Error('Vượt giới hạn phân trang hội thoại; không ghi dữ liệu chưa đầy đủ.');
}

export async function listSaleWorkCareMessages(
  read: SaleWorkReader,
  conversation: SaleWorkConversation,
  since: number,
): Promise<SaleWorkMessage[]> {
  let cursor: number | '' = '';
  const messages = new Map<string, SaleWorkMessage>();
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const rows = responseSchema(saleWorkMessageSchema).parse(await read('/api/message/filter', {
      conversationId: conversation.id, accountId: conversation.accountId,
      timestamp: cursor, pageSize: PAGE_SIZE,
    })).data;
    for (const row of rows) {
      if (row.id.conversationId !== conversation.id) throw new Error('Lịch sử bị lẫn hội thoại.');
      if (row.ts >= since) messages.set(row.id.msgId, row);
    }
    if (rows.length < PAGE_SIZE) return [...messages.values()];
    const oldest = Math.min(...rows.map((row) => row.ts));
    if (oldest < since) return [...messages.values()];
    if (cursor !== '' && oldest >= cursor) throw new Error('Cursor tin nhắn không tiến; chưa xác nhận đủ dữ liệu.');
    cursor = oldest;
  }
  throw new Error('Vượt giới hạn phân trang tin nhắn; không ghi dữ liệu chưa đầy đủ.');
}
