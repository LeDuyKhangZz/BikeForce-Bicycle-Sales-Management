import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

type SaleWorkContact = {
  id?: string | number;
  accountId?: string | number;
  uid?: string | number;
  name?: string;
  phone?: string;
  addFr?: boolean | number;
  tagIds?: string | number[];
  createdAt?: string | number;
};

function csvCell(value: string | number | boolean): string {
  const text = String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

async function main() {
  const username = process.env.SALEWORK_USERNAME?.trim();
  const password = process.env.SALEWORK_PASSWORD?.trim();
  if (!username || !password) {
    throw new Error('Cần SALEWORK_USERNAME và SALEWORK_PASSWORD trong .env.local.');
  }

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ locale: 'vi-VN' });
    await page.goto('https://zalo.salework.net/login', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    const usernameInput = page.getByRole('textbox', { name: 'Tên đăng nhập hoặc email' });
    await usernameInput.waitFor({ timeout: 20_000 });
    await usernameInput.fill(username);
    await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL((url) => url.pathname.startsWith('/v2'), { timeout: 30_000 });

    const contactResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/contact/swContact',
      { timeout: 30_000 },
    );
    await page.goto('https://zalo.salework.net/v2/contact', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    const response = await contactResponse;
    if (!response.ok()) {
      throw new Error(`SaleWork lấy danh bạ trả HTTP ${response.status()}.`);
    }

    const payload: unknown = await response.json();
    if (
      typeof payload !== 'object' || payload === null || !('status' in payload) ||
      payload.status !== 'success' || !('data' in payload) || !Array.isArray(payload.data)
    ) {
      throw new Error('SaleWork trả dữ liệu danh bạ không đúng cấu trúc.');
    }

    const contacts = payload.data as SaleWorkContact[];
    const headers = [
      'SaleWork Contact ID', 'Tài khoản Zalo ID', 'Zalo User ID',
      'Tên khách hàng', 'Số điện thoại', 'Đã kết bạn', 'Tag IDs', 'Ngày tạo',
    ];
    const rows = contacts.map((contact) => [
      contact.id ?? '',
      contact.accountId ?? '',
      contact.uid ?? '',
      contact.name ?? '',
      contact.phone ?? '',
      contact.addFr ?? '',
      Array.isArray(contact.tagIds) ? contact.tagIds.join(';') : contact.tagIds ?? '',
      contact.createdAt ?? '',
    ]);

    const outputDirectory = resolve(process.cwd(), 'tmp');
    mkdirSync(outputDirectory, { recursive: true });
    const outputPath = resolve(outputDirectory, 'salework-zalo-contacts.csv');
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    writeFileSync(outputPath, csv, 'utf8');
    process.stdout.write(`Đã xuất ${contacts.length} khách từ Danh bạ Salework: ${outputPath}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Không thể xuất danh bạ SaleWork.'}\n`);
  process.exitCode = 1;
});
