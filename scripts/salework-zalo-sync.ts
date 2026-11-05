import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Database, Json } from '../types/database.types';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

type Friend = {
  id?: string | number;
  uid?: string | number;
  displayName?: string;
  zaloName?: string;
  username?: string;
  phoneNumber?: string;
};

type SaleWorkContact = {
  id?: string | number;
  uid?: string | number;
  name?: string;
  phone?: string;
  createdAt?: string | number;
};

type RequestedFriend = {
  userId?: string | number;
  displayName?: string;
  zaloName?: string;
};

type CustomerInput = {
  [key: string]: Json;
  source_system: 'SALEWORK_ZALO';
  source_id: string;
  customer_name: string;
  phone: string | null;
  zalo_account: string;
  source_updated_at: string | null;
  synced_at: string;
};

function csvCell(value: string | number): string {
  const text = String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

async function main(): Promise<void> {
  const username = process.env.SALEWORK_USERNAME?.trim();
  const password = process.env.SALEWORK_PASSWORD?.trim();
  const supabaseUrl = process.env.BIKEFORCE_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.BIKEFORCE_SERVICE_ROLE_KEY?.trim();
  if (!username || !password) throw new Error('Cần SALEWORK_USERNAME và SALEWORK_PASSWORD trong .env.local.');
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Cần BIKEFORCE_SUPABASE_URL và BIKEFORCE_SERVICE_ROLE_KEY trong .env.local.');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ locale: 'vi-VN' });
    await page.goto('https://zalo.salework.net/login', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.getByRole('textbox', { name: 'Tên đăng nhập hoặc email' }).fill(username);
    await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL((url) => url.pathname.startsWith('/v2'), { timeout: 30_000 });

    const firstFriendsResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/contact/filter',
      { timeout: 30_000 },
    );
    await page.goto('https://zalo.salework.net/v2/contact', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const initialResponse = await firstFriendsResponse;
    if (!initialResponse.ok()) throw new Error(`SaleWork trả HTTP ${initialResponse.status()} khi tải liên hệ.`);

    const initialUrl = new URL(initialResponse.url());
    const accountId = initialUrl.searchParams.get('accountId');
    const searchKey = initialUrl.searchParams.get('searchKey') ?? '';
    const authorization = await initialResponse.request().headerValue('authorization');
    if (!accountId || !authorization) throw new Error('Không lấy được phiên và tài khoản Zalo đang chọn trong SaleWork.');

    const lists = await page.evaluate(async ({ accountId, authorization, searchKey }) => {
      type PageResult = {
        content?: Friend[];
        totalElements?: number;
        totalPages?: number;
      };
      type ApiResponse = { status?: string; data?: PageResult };
      const friendPages: Friend[] = [];
      let totalElements = 0;
      let totalPages = 0;

      for (let pageNumber = 0; pageNumber < (totalPages || 1); pageNumber += 1) {
        const query = new URLSearchParams({ searchKey, accountId, page: String(pageNumber), pageSize: '20' });
        const response = await fetch(`/api/contact/filter?${query}`, { headers: { authorization } });
        if (!response.ok) throw new Error(`SaleWork tải trang bạn bè ${pageNumber + 1} lỗi HTTP ${response.status}.`);
        const payload = await response.json() as ApiResponse;
        if (payload.status !== 'success' || !Array.isArray(payload.data?.content)) {
          throw new Error(`SaleWork trả sai cấu trúc ở trang bạn bè ${pageNumber + 1}.`);
        }
        friendPages.push(...payload.data.content);
        totalElements = payload.data.totalElements ?? totalElements;
        totalPages = payload.data.totalPages ?? 0;
        if (totalPages === 0) break;
      }

      const contactQuery = new URLSearchParams({ accountId });
      const contactsResponse = await fetch(`/api/contact/swContact?${contactQuery}`, { headers: { authorization } });
      const requestsResponse = await fetch(`/api/contact/requestedFriends?${contactQuery}`, { headers: { authorization } });
      if (!contactsResponse.ok || !requestsResponse.ok) {
        throw new Error('SaleWork không tải được Danh bạ Salework hoặc Lời mời kết bạn.');
      }
      const contactsPayload = await contactsResponse.json() as { status?: string; data?: SaleWorkContact[] };
      const requestsPayload = await requestsResponse.json() as {
        status?: string;
        data?: { data?: Record<string, RequestedFriend> };
      };
      if (contactsPayload.status !== 'success' || !Array.isArray(contactsPayload.data)) {
        throw new Error('SaleWork trả sai cấu trúc Danh bạ Salework.');
      }
      const requested = requestsPayload.data?.data;
      if (requestsPayload.status !== 'success' || !requested || typeof requested !== 'object') {
        throw new Error('SaleWork trả sai cấu trúc Lời mời kết bạn.');
      }
      return {
        accountId,
        friends: friendPages,
        friendsTotal: totalElements,
        contacts: contactsPayload.data,
        requested: Object.entries(requested),
      };
    }, { accountId, authorization, searchKey });

    if (lists.friends.length !== lists.friendsTotal) {
      throw new Error(`Chỉ lấy được ${lists.friends.length}/${lists.friendsTotal} bạn bè; chưa ghi lên BikeForce.`);
    }
    const total = lists.friends.length + lists.contacts.length + lists.requested.length;
    if (total !== 1244) {
      throw new Error(`SaleWork hiện trả ${total} mục (bạn bè ${lists.friends.length}, danh bạ ${lists.contacts.length}, lời mời ${lists.requested.length}); chưa khớp 1.244 nên chưa ghi lên BikeForce.`);
    }

    const syncedAt = new Date().toISOString();
    const rows: CustomerInput[] = [
      ...lists.friends.map((friend) => ({
        source_system: 'SALEWORK_ZALO' as const,
        source_id: `FRIEND:${lists.accountId}:${String(friend.uid ?? friend.id ?? '')}`,
        customer_name: String(friend.displayName || friend.zaloName || friend.username || friend.uid || friend.id || 'Chưa có tên'),
        phone: friend.phoneNumber ? String(friend.phoneNumber) : null,
        zalo_account: lists.accountId,
        source_updated_at: null,
        synced_at: syncedAt,
      })),
      ...lists.contacts.map((contact) => ({
        source_system: 'SALEWORK_ZALO' as const,
        source_id: `CONTACT:${lists.accountId}:${String(contact.uid ?? contact.id ?? '')}`,
        customer_name: String(contact.name || contact.uid || contact.id || 'Chưa có tên'),
        phone: contact.phone ? String(contact.phone) : null,
        zalo_account: lists.accountId,
        source_updated_at: contact.createdAt ? new Date(contact.createdAt).toISOString() : null,
        synced_at: syncedAt,
      })),
      ...lists.requested.map(([userId, person]) => ({
        source_system: 'SALEWORK_ZALO' as const,
        source_id: `REQUEST:${lists.accountId}:${String(person.userId ?? userId)}`,
        customer_name: String(person.displayName || person.zaloName || person.userId || userId || 'Chưa có tên'),
        phone: null,
        zalo_account: lists.accountId,
        source_updated_at: null,
        synced_at: syncedAt,
      })),
    ];
    if (rows.some((row) => row.source_id.endsWith(':'))) {
      throw new Error('Có liên hệ thiếu mã định danh ổn định; chưa ghi để tránh đồng bộ trùng.');
    }

    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    for (let offset = 0; offset < rows.length; offset += 500) {
      const batch = rows.slice(offset, offset + 500);
      const { error } = await supabase.rpc('sync_salework_zalo_customers', { p_contacts: batch });
      if (error) throw new Error(`BikeForce Supabase từ chối ghi nhóm ${Math.floor(offset / 500) + 1}: ${error.message}`);
    }

    const outputDirectory = resolve(process.cwd(), 'tmp');
    mkdirSync(outputDirectory, { recursive: true });
    const headers = ['Nhóm SaleWork', 'SaleWork/Zalo ID', 'Tài khoản Zalo ID', 'Tên liên hệ', 'Số điện thoại'];
    const csvRows = rows.map((row) => [
      row.source_id.split(':', 1)[0] ?? '',
      row.source_id,
      row.zalo_account,
      row.customer_name,
      row.phone ?? '',
    ]);
    writeFileSync(
      resolve(outputDirectory, 'salework-zalo-contacts.csv'),
      `\uFEFF${[headers, ...csvRows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`,
      'utf8',
    );
    process.stdout.write(`Đã đồng bộ ${rows.length} liên hệ lên BikeForce (bạn bè ${lists.friends.length}, danh bạ ${lists.contacts.length}, lời mời ${lists.requested.length}).\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Không thể đồng bộ danh bạ SaleWork.'}\n`);
  process.exitCode = 1;
});
