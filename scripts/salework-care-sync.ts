import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

import { getVietnamToday } from '../lib/date';
import { buildSaleWorkCareEvents, saleWorkCareWindow, type SaleWorkCareEvent } from '../lib/salework/care-events';
import { getSalesNameForSaleWorkAccount } from '../lib/salework/sales-account-map';
import {
  listSaleWorkCareAccounts, listSaleWorkCareConversations, listSaleWorkCareMessages,
  type SaleWorkReader,
} from '../services/salework-care-source';
import { syncSaleWorkCareEvents } from '../services/salework-care-sync';
import type { Database } from '../types/database.types';

dotenv.config({ path: resolve(process.cwd(), '.env.local'), quiet: true });

function readOptions() {
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--from' || arg === '--limit-conversations') { index += 1; continue; }
    if (arg !== '--dry-run' && arg !== '--write' && arg !== '--scheduled') throw new Error('Tham số không hợp lệ.');
  }
  const valueFor = (flag: string) => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
  const now = Date.now();
  const defaultDate = new Date(Date.parse(`${getVietnamToday()}T00:00:00Z`) - 30 * 86_400_000)
    .toISOString().slice(0, 10);
  const from = valueFor('--from') ?? defaultDate;
  const window = saleWorkCareWindow(from, now);
  const limitValue = valueFor('--limit-conversations');
  const limit = limitValue === undefined ? null : Number(limitValue);
  if (limit !== null && (!Number.isSafeInteger(limit) || limit <= 0)) throw new Error('Giới hạn hội thoại không hợp lệ.');
  const write = args.includes('--write') || args.includes('--scheduled');
  if (write && (limit !== null || args.includes('--dry-run'))) throw new Error('Chỉ được ghi sau một lượt đọc đầy đủ, không giới hạn mẫu.');
  if ((args.includes('--from') && !valueFor('--from'))
    || (args.includes('--limit-conversations') && !limitValue)) throw new Error('Thiếu giá trị tham số.');
  return { ...window, from, limit, write };
}

async function main(): Promise<void> {
  if (process.argv.includes('--scheduled') && process.env.SALEWORK_CARE_SYNC_ENABLED !== 'true') {
    console.log('Chăm sóc SaleWork chưa bật; giữ nguyên lịch đồng bộ hiện có.');
    return;
  }
  const options = readOptions();
  const username = process.env.SALEWORK_USERNAME?.trim();
  const password = process.env.SALEWORK_PASSWORD?.trim();
  if (!username || !password) throw new Error('Thiếu cấu hình đăng nhập SaleWork.');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (options.write && (!supabaseUrl || !serviceKey)) throw new Error('Thiếu cấu hình worker BikeForce.');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ locale: 'vi-VN' });
    let authorization: string | null = null;
    const sessionRequest = page.waitForRequest((request) =>
      new URL(request.url()).pathname === '/api/conversation' && request.method() === 'POST',
    { timeout: 60_000 });
    void sessionRequest.catch(() => {});
    await page.goto('https://zalo.salework.net/login', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.getByRole('textbox', { name: 'Tên đăng nhập hoặc email' }).fill(username);
    await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL((url) => url.pathname.startsWith('/v2'), { timeout: 45_000 });
    authorization = await (await sessionRequest).headerValue('authorization');
    if (!authorization) throw new Error('Không lấy được phiên đọc hội thoại SaleWork.');
    const headers = { authorization };
    const allowedPaths = new Set(['/api/account/getAll', '/api/conversation', '/api/message/filter']);
    const read: SaleWorkReader = async (path, body) => {
      if (!allowedPaths.has(path)) throw new Error('Endpoint ngoài phạm vi đọc chăm sóc.');
      const url = `https://zalo.salework.net${path}`;
      const response = body === undefined
        ? await page.request.get(url, { headers, timeout: 30_000 })
        : await page.request.post(url, { headers, data: body, timeout: 30_000 });
      if (!response.ok()) throw new Error(`SaleWork HTTP ${response.status()} khi đọc chăm sóc.`);
      return response.json();
    };

    const accounts = await listSaleWorkCareAccounts(read);
    const events = new Map<string, SaleWorkCareEvent>();
    let mappedAccounts = 0;
    let conversations = 0;
    let messages = 0;
    accountLoop: for (const account of accounts) {
      const salesName = getSalesNameForSaleWorkAccount(
        [account.displayName, account.zaloName, account.swName].filter((name) => typeof name === 'string'),
      );
      if (salesName === null) continue;
      mappedAccounts += 1;
      for await (const conversation of listSaleWorkCareConversations(read, account.accountId, options.since)) {
        const history = await listSaleWorkCareMessages(read, conversation, options.since);
        messages += history.length;
        conversations += 1;
        for (const event of buildSaleWorkCareEvents(conversation, history, salesName, options.since, options.until)) {
          events.set(`${event.account_id}:${event.peer_id}:${event.message_id}`, event);
        }
        if (events.size > 250_000) throw new Error('Vượt giới hạn sự kiện; chia nhỏ khoảng ngày trước khi ghi.');
        if (conversations % 25 === 0) console.log(JSON.stringify({ progress: { mappedAccounts, conversations, messages, events: events.size } }));
        if (options.limit !== null && conversations >= options.limit) break accountLoop;
      }
    }
    if (mappedAccounts === 0) throw new Error('Không có tài khoản SaleWork khớp ánh xạ Sales hiện có.');
    const summary = {
      mode: options.write ? 'WRITE' : 'DRY_RUN', from: options.from, sampled: options.limit !== null,
      accounts: accounts.length, mappedAccounts, conversations, messages, outboundEvents: events.size,
    };
    console.log(JSON.stringify(summary));
    if (options.write) {
      if (!supabaseUrl || !serviceKey) throw new Error('Thiếu cấu hình worker BikeForce.');
      const client = createClient<Database>(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const result = await syncSaleWorkCareEvents(client, [...events.values()]);
      console.log(JSON.stringify({ imported: result }));
      if (result.unmatched_customers > 0 || result.unmatched_sales > 0 || result.unlinked > 0) {
        process.exitCode = 2;
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch(() => {
  // Playwright có thể đưa input hoặc request vào error message; không in lỗi thô chứa token/chat.
  console.error('Đồng bộ chăm sóc SaleWork chưa hoàn tất. Không coi lượt này là thành công; kiểm tra phiên, ánh xạ và migration.');
  process.exitCode = 1;
});
