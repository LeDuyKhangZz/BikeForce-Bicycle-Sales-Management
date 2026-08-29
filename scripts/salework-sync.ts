import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

import type { SaleWorkReport } from '../services/salework';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const token = process.env.SALEWORK_USER_TOKEN?.trim();
const username = process.env.SALEWORK_USERNAME?.trim();
const password = process.env.SALEWORK_PASSWORD?.trim();
if (!token && (!username || !password)) {
  throw new Error('Cần SALEWORK_USERNAME/SALEWORK_PASSWORD hoặc SALEWORK_USER_TOKEN trong môi trường.');
}

const TARGET_ACCOUNT_NAME = 'Kế Toán Bánhàng Xe Đạp Abraham';
const PROFILE_PATH = resolve(process.cwd(), '.salework-browser-profile');

function numberAfter(text: string, label: string): number {
  const match = text.match(new RegExp(`${label}\\s*:\\s*(\\d+)`, 'i'));
  return Number(match?.[1] ?? 0);
}

function parseRow(cells: string[]): SaleWorkReport | null {
  const accountName = cells[0]?.trim();
  if (!accountName) return null;

  const conversation = cells[1] ?? '';
  const sent = cells[2] ?? '';
  const received = cells[3] ?? '';
  const calls = cells[4] ?? '';

  return {
    accountName,
    conversations: numberAfter(conversation, 'Số lượng'),
    sentMessages: numberAfter(sent, 'Số lượng'),
    receivedMessages: numberAfter(received, 'Số lượng'),
    incomingCalls: numberAfter(calls, 'Cuộc gọi đến'),
    outgoingCalls: numberAfter(calls, 'Cuộc gọi đi'),
    missedCalls: numberAfter(calls, 'Cuộc gọi nhỡ'),
    callDuration: calls.match(/Thời lượng\s*:\s*([^\n]+)/i)?.[1]?.trim() ?? '0 phút',
  };
}

async function main(): Promise<void> {
  const context = await chromium.launchPersistentContext(PROFILE_PATH, {
    headless: false,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    viewport: { width: 1440, height: 900 },
  });

  const page = context.pages()[0] ?? (await context.newPage());
  page.on('pageerror', (error) => console.error(`[SaleWork pageerror] ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`[SaleWork console] ${message.text()}`);
  });
  await page.goto('https://zalo.salework.net/statistical', {
    waitUntil: 'domcontentloaded',
    timeout: 90_000,
  });

  if (page.url().includes('/login') && username && password) {
    await page.getByRole('textbox', { name: 'Tên đăng nhập hoặc email' }).fill(username);
    await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await page.waitForURL('**://zalo.salework.net/statistical', { timeout: 90_000 });
  }

  if (!page.url().includes('/statistical')) {
    throw new Error(`SaleWork chuyển hướng tới URL không mong đợi: ${page.url()}`);
  }

  const messageTab = page.getByText('Tin nhắn', { exact: true });
  if (await messageTab.count() > 0) await messageTab.first().click();

  const accountSelect = page.locator('.el-select').first();
  await accountSelect.waitFor({ state: 'visible', timeout: 30_000 });
  await accountSelect.click();
  const accountOption = page
    .locator('.el-select-dropdown__item')
    .filter({ hasText: TARGET_ACCOUNT_NAME });
  await accountOption.first().waitFor({ state: 'visible', timeout: 30_000 });
  await accountOption.first().click();

  const summarizePage = async (): Promise<string> =>
    JSON.stringify({
      url: page.url(),
      title: await page.title(),
      totalRows: await page.locator('.el-table__body tbody tr').count(),
      visibleText: (await page.locator('body').innerText()).slice(0, 300),
    });

  const aggregateButton = page.getByRole('button', { name: 'Tổng hợp' });
  try {
    await aggregateButton.waitFor({ state: 'visible', timeout: 30_000 });
  } catch {
    throw new Error(
      `Không thấy nút Tổng hợp sau khi chọn ${TARGET_ACCOUNT_NAME}. Trang hiện tại: ${await summarizePage()}`,
    );
  }
  await aggregateButton.click();

  const rows = page.locator('.el-table__body tbody tr');
  try {
    await rows.first().waitFor({ state: 'visible', timeout: 60_000 });
  } catch {
    throw new Error(`SaleWork không hiển thị dữ liệu sau khi tổng hợp: ${await summarizePage()}`);
  }

  const reports = (await page.locator('.el-table__body tbody tr').evaluateAll((rows) =>
    rows.map((row) => Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent ?? '')),
  ))
    .map(parseRow)
    .filter((report): report is SaleWorkReport => report !== null);

  mkdirSync(resolve(process.cwd(), 'data'), { recursive: true });
  writeFileSync(resolve(process.cwd(), 'data/salework-report.json'), JSON.stringify(reports, null, 2), 'utf8');
  console.log(`Đã đồng bộ ${reports.length} tài khoản SaleWork.`);
  await context.close();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Đồng bộ SaleWork thất bại.');
  process.exitCode = 1;
});
