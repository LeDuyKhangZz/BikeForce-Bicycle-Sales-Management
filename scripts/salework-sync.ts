import { chromium } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import type { SaleWorkReport } from '../services/salework';
import { getVietnamCurrentMonth, getVietnamMonthRange } from '../lib/date';
import {
  normalizeSaleWorkAccountName,
  SALES_SALEWORK_ACCOUNT_NAMES,
} from '../lib/salework/sales-account-map';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const token = process.env.SALEWORK_USER_TOKEN?.trim();
const username = process.env.SALEWORK_USERNAME?.trim();
const password = process.env.SALEWORK_PASSWORD?.trim();
if (!token && (!username || !password)) {
  throw new Error('Cần SALEWORK_USERNAME/SALEWORK_PASSWORD hoặc SALEWORK_USER_TOKEN trong môi trường.');
}

// ✅ Mới: đích ghi chính giờ là Supabase, không phải file JSON nữa.
// Dùng chung project Supabase "đích ghi" của BikeForce (đã cấu hình sẵn
// trong .env.local cho các script sync khác như AMIS).
const supabaseUrl = process.env.BIKEFORCE_SUPABASE_URL?.trim();
const supabaseServiceRoleKey = process.env.BIKEFORCE_SERVICE_ROLE_KEY?.trim();
if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Cần BIKEFORCE_SUPABASE_URL và BIKEFORCE_SERVICE_ROLE_KEY trong .env.local.');
}
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

const TARGET_ACCOUNT_NAMES = [
  'Abraham Kế Toán Bánhàng',
  'Giao - Kế Toán bán hàng',
  ...SALES_SALEWORK_ACCOUNT_NAMES,
];
const PROFILE_PATH = resolve(process.cwd(), '.salework-browser-profile');
let activeBrowserContext: BrowserContext | null = null;
const MONTHLY_SALEWORK_ROW_PREFIX = '__SALEWORK_MONTH__:';

function numberAfter(text: string, label: string): number {
  const match = text.match(new RegExp(`${label}\\s*:\\s*(\\d+)`, 'i'));
  return Number(match?.[1] ?? 0);
}

function parseRow(cells: string[]): SaleWorkReport | null {
  const rawAccountName = cells[0];
  const accountName = rawAccountName ? normalizeSaleWorkAccountName(rawAccountName) : '';
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
    amis: null,
  };
}

/** Ghi báo cáo vào bảng Supabase salework_reports (upsert theo account_name). */
async function saveReportsToSupabase(
  reports: SaleWorkReport[],
  accountNamePrefix = '',
): Promise<void> {
  if (reports.length === 0) {
    console.warn('Không có báo cáo nào để ghi — bỏ qua Supabase.');
    return;
  }

  // Gộp các dòng trùng account_name, chỉ giữ lại bản ghi cuối cùng
  // (tránh lỗi "ON CONFLICT DO UPDATE command cannot affect row a second time"
  // xảy ra khi cùng 1 tài khoản xuất hiện nhiều hơn 1 dòng trong bảng kết quả).
  const dedupedByAccount = new Map<string, SaleWorkReport>();
  for (const report of reports) {
    dedupedByAccount.set(report.accountName, report);
  }
  const dedupedReports = Array.from(dedupedByAccount.values());

  const rows = dedupedReports.map((report) => ({
    account_name: `${accountNamePrefix}${report.accountName}`,
    conversations: report.conversations,
    sent_messages: report.sentMessages,
    received_messages: report.receivedMessages,
    incoming_calls: report.incomingCalls,
    outgoing_calls: report.outgoingCalls,
    missed_calls: report.missedCalls,
    call_duration: report.callDuration,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('salework_reports').upsert(rows, { onConflict: 'account_name' });
  if (error) {
    throw new Error(`Ghi Supabase thất bại: ${error.message}`);
  }
}

async function main(): Promise<void> {
  const context = await chromium.launchPersistentContext(PROFILE_PATH, {
    // Hồ sơ này được người dùng đăng nhập bằng Chrome hệ thống. Dùng cùng
    // channel để tránh Chromium bundled cũ hơn từ chối hồ sơ đã nâng version.
    channel: 'chrome',
    headless: !!process.env.CI,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    viewport: { width: 1440, height: 900 },
  });
  activeBrowserContext = context;

  const page = context.pages()[0] ?? (await context.newPage());
  page.on('pageerror', (error) => console.error(`[SaleWork pageerror] ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`[SaleWork console] ${message.text()}`);
  });
  // Luôn đi qua /login trước: SaleWork có thể trả 403/500 nếu một context tự
  // động mở thẳng /statistical dù cookie vừa được đăng nhập thủ công.
  await page.goto('https://zalo.salework.net/login', {
    waitUntil: 'domcontentloaded',
    timeout: 90_000,
  });

  const accountTab = page.locator('#pills-user-tab-2');
  const usernameInput = page.getByRole('textbox', { name: 'Tên đăng nhập hoặc email' });
  const entryState = await Promise.race([
    accountTab.waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'DASHBOARD' as const),
    usernameInput.waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'LOGIN' as const),
  ]).catch(() => 'UNKNOWN' as const);

  if (entryState === 'LOGIN' && username && password) {
    await usernameInput.fill(username);
    await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await accountTab.waitFor({ state: 'visible', timeout: 90_000 });
  }

  if (!(await accountTab.isVisible())) {
    throw new Error(
      entryState === 'LOGIN'
        ? 'SaleWork yêu cầu đăng nhập nhưng môi trường không có đủ tên đăng nhập và mật khẩu.'
        : `SaleWork không tải được dashboard sau 30 giây: ${page.url()}`,
    );
  }

  // Trang cần vài giây để tải dữ liệu xong rồi mới bật popup (nếu có),
  // nên chờ một chút trước khi kiểm tra.
  await page.waitForTimeout(1500);

  // Đóng popup "BẠN CÓ TÀI KHOẢN HẾT HẠN LIÊN KẾT VỚI ZALO" nếu xuất hiện —
  // popup này che ô chọn tài khoản và khiến các bước click phía dưới bị treo.
  const expiredLinkCloseButton = page.getByRole('button', { name: 'Đóng' });
  if (await expiredLinkCloseButton.count() > 0) {
    await expiredLinkCloseButton.first().click();
    await expiredLinkCloseButton.first().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
  }

  // Đúng chuỗi thao tác đã ghi bằng Playwright Codegen trên giao diện SaleWork:
  // mở nhóm tài khoản trước, sau đó chọn tab Tin nhắn bên trong nhóm đó.
  const accountTabCount = await accountTab.count();
  if (accountTabCount > 0 && (await accountTab.isVisible())) {
    await accountTab.click();
  }

  const messageTab = page.getByText('Tin nhắn').nth(1);
  await messageTab.waitFor({ state: 'visible', timeout: 30_000 });
  await messageTab.click();

  const accountSelect = page.locator('.el-select').first();
  await accountSelect.waitFor({ state: 'visible', timeout: 30_000 });
  await accountSelect.click();
  const accountSearchInput = page.getByRole('textbox').first();
  await accountSearchInput.waitFor({ state: 'visible', timeout: 30_000 });

  for (const accountName of TARGET_ACCOUNT_NAMES) {
    // SaleWork dùng danh sách dài/ảo hóa. Gõ từng tên vào ô tìm kiếm trước khi
    // click giúp kết quả luôn có trong DOM, đúng thao tác đã xác nhận thủ công.
    await accountSearchInput.fill(accountName);

    const accountOption = page
      .locator('.el-select-dropdown__item')
      .filter({ hasText: accountName })
      .first();
    await accountOption.waitFor({ state: 'visible', timeout: 30_000 });

    // Element UI dùng class/aria để đánh dấu option đã chọn. Chỉ click mục còn
    // thiếu; click lại mục đang chọn sẽ biến thao tác "chọn đủ" thành bỏ chọn.
    const optionClass = (await accountOption.getAttribute('class')) ?? '';
    const ariaSelected = await accountOption.getAttribute('aria-selected');
    // Giao diện SaleWork hiện đặt trạng thái chọn trên checkbox CON thay vì
    // chính dòng option. Chỉ nhìn class/aria của dòng ngoài sẽ tưởng tài khoản
    // đang chọn là chưa chọn rồi click lần nữa, tức vô tình bỏ chọn nó.
    const hasCheckedDescendant =
      (await accountOption.locator('.is-checked, [aria-checked="true"]').count()) > 0;
    const isSelected =
      ariaSelected === 'true' ||
      hasCheckedDescendant ||
      /(^|\s)(is-selected|selected)(\s|$)/.test(optionClass);

    if (!isSelected) await accountOption.click();
  }

  await page.keyboard.press('Escape');

  const summarizePage = async (): Promise<string> =>
    JSON.stringify({
      url: page.url(),
      title: await page.title(),
      totalRows: await page.locator('.el-table__body tbody tr').count(),
      visibleText: (await page.locator('body').innerText()).slice(0, 300),
      tableText: (await page.locator('.el-table__body tbody tr').allTextContents()).join(' | '),
      paginationText: (await page.locator('.el-pagination').allTextContents()).join(' | '),
    });

  const aggregateButton = page.getByRole('button', { name: 'Tổng hợp' });
  try {
    await aggregateButton.waitFor({ state: 'visible', timeout: 30_000 });
  } catch {
    throw new Error(
      `Không thấy nút Tổng hợp sau khi chọn ${TARGET_ACCOUNT_NAMES.join(', ')}. Trang hiện tại: ${await summarizePage()}`,
    );
  }
  await aggregateButton.click();

  const rows = page.locator('.el-table__body tbody tr');
  await rows.first().waitFor({ state: 'visible', timeout: 60_000 });

  // SaleWork hiện phân trang bảng kết quả với 5 dòng/trang. Đọc tuần tự mọi
  // trang thay vì đòi cả tập tài khoản cùng tồn tại trong DOM của trang đầu.
  const reportCells: string[][] = [];
  const visitedPages = new Set<string>();

  while (true) {
    const currentPageCells = await rows.evaluateAll((currentRows) =>
      currentRows.map((row) =>
        Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent ?? ''),
      ),
    );
    const pageSignature = JSON.stringify(currentPageCells);
    if (visitedPages.has(pageSignature)) break;

    visitedPages.add(pageSignature);
    reportCells.push(...currentPageCells);

    const nextPageButton = page.locator('.el-pagination .btn-next').last();
    if ((await nextPageButton.count()) === 0) break;

    const nextButtonClass = (await nextPageButton.getAttribute('class')) ?? '';
    const hasDisabledAttribute = (await nextPageButton.getAttribute('disabled')) !== null;
    if (hasDisabledAttribute || /(^|\s)is-disabled(\s|$)/.test(nextButtonClass)) break;

    const previousTableText = (await rows.allTextContents()).join('\n');
    await nextPageButton.click();
    await page.waitForFunction(
      (previousText) =>
        Array.from(
          document.querySelectorAll('.el-table__body tbody tr'),
          (row) => row.textContent ?? '',
        ).join('\n') !== previousText,
      previousTableText,
      { timeout: 30_000 },
    );
  }

  const reports = reportCells
    .map(parseRow)
    .filter((report): report is SaleWorkReport => report !== null);

  const reportsByAccountName = new Map(reports.map((report) => [report.accountName, report]));
  const missingAccountNames = TARGET_ACCOUNT_NAMES.filter(
    (accountName) => !reportsByAccountName.has(accountName),
  );
  if (missingAccountNames.length > 0) {
    // Báo cáo ngày của SaleWork có thể chỉ trả các tài khoản phát sinh hoạt
    // động. Nếu giữ snapshot hôm trước cho tài khoản vắng mặt, báo cáo ngày sẽ
    // mang số cũ. Ghi một dòng 0 tường minh để reset đúng ngày (ISSUE-037).
    console.warn(
      `SaleWork không trả ${missingAccountNames.length} tài khoản hôm nay; ghi 0 cho: ${missingAccountNames.join(', ')}`,
    );
  }

  const completeDailyReports = TARGET_ACCOUNT_NAMES.map(
    (accountName): SaleWorkReport =>
      reportsByAccountName.get(accountName) ?? {
        accountName,
        conversations: 0,
        sentMessages: 0,
        receivedMessages: 0,
        incomingCalls: 0,
        outgoingCalls: 0,
        missedCalls: 0,
        callDuration: '0.00 giây',
        amis: null,
      },
  );

  // Vẫn giữ ghi ra file JSON cục bộ để tiện xem/debug nhanh trên máy —
  // nhưng đây không còn là nguồn dữ liệu chính mà app đọc nữa.
  mkdirSync(resolve(process.cwd(), 'data'), { recursive: true });
  writeFileSync(resolve(process.cwd(), 'data/salework-report.json'), JSON.stringify(completeDailyReports, null, 2), 'utf8');

  // ✅ Nguồn dữ liệu chính: ghi lên Supabase, để cả localhost và production
  // (Vercel) đều đọc chung một nơi, không cần commit/push mỗi lần sync.
  await saveReportsToSupabase(completeDailyReports);

  // SaleWork và AMIS đều có bộ lọc tháng. Snapshot tháng dùng khoá riêng để dữ liệu
  // lịch sử không bị lần đồng bộ ngày sau ghi đè bằng số của tháng hiện tại.
  const monthlySyncMonth = process.env.SALEWORK_SYNC_MONTH?.trim() || getVietnamCurrentMonth();
  let monthlyReportCount = 0;
  try {
    await selectSaleWorkMonth(page, monthlySyncMonth);
    await aggregateButton.click();
    const monthlyResult = await readPaginatedReports(page);
    await saveReportsToSupabase(
      monthlyResult.reports,
      `${MONTHLY_SALEWORK_ROW_PREFIX}${monthlySyncMonth}-01:`,
    );
    monthlyReportCount = monthlyResult.reports.length;
  } catch (error) {
    // Snapshot tháng là nhánh phụ. Giao diện SaleWork có thể đổi/ẩn bộ chọn
    // khoảng ngày; không được để lỗi đó chặn snapshot NGÀY đã ghi và script
    // CRM Report 70 chạy kế tiếp trong `npm run salework:sync` (ISSUE-037).
    console.warn(
      `CẢNH BÁO: chưa cập nhật được snapshot SaleWork tháng ${monthlySyncMonth}: ${
        error instanceof Error ? error.message : 'lỗi không xác định'
      }`,
    );
  }

  console.log(
    `Đã đồng bộ ${completeDailyReports.length} tài khoản SaleWork ngày và ${monthlyReportCount} tài khoản tháng ${monthlySyncMonth} lên Supabase.`,
  );
  await context.close();
  activeBrowserContext = null;
}

async function readPaginatedReports(page: Page): Promise<{
  reports: SaleWorkReport[];
  visitedPageCount: number;
}> {
  const rows = page.locator('.el-table__body tbody tr');
  await rows.first().waitFor({ state: 'visible', timeout: 60_000 });

  const reportCells: string[][] = [];
  const visitedPages = new Set<string>();

  while (true) {
    const currentPageCells = await rows.evaluateAll((currentRows) =>
      currentRows.map((row) =>
        Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent ?? ''),
      ),
    );
    const pageSignature = JSON.stringify(currentPageCells);
    if (visitedPages.has(pageSignature)) break;

    visitedPages.add(pageSignature);
    reportCells.push(...currentPageCells);

    const nextPageButton = page.locator('.el-pagination .btn-next').last();
    if ((await nextPageButton.count()) === 0) break;

    const nextButtonClass = (await nextPageButton.getAttribute('class')) ?? '';
    const hasDisabledAttribute = (await nextPageButton.getAttribute('disabled')) !== null;
    if (hasDisabledAttribute || /(^|\s)is-disabled(\s|$)/.test(nextButtonClass)) break;

    const previousTableText = (await rows.allTextContents()).join('\n');
    await nextPageButton.click();
    await page.waitForFunction(
      (previousText) =>
        Array.from(
          document.querySelectorAll('.el-table__body tbody tr'),
          (row) => row.textContent ?? '',
        ).join('\n') !== previousText,
      previousTableText,
      { timeout: 30_000 },
    );
  }

  return {
    reports: reportCells
      .map(parseRow)
      .filter((report): report is SaleWorkReport => report !== null),
    visitedPageCount: visitedPages.size,
  };
}

async function selectSaleWorkMonth(page: Page, month: string): Promise<void> {
  const range = getVietnamMonthRange(month);
  if (range === null) throw new Error(`SALEWORK_SYNC_MONTH không hợp lệ: ${month}`);

  const dateRange = page.locator('.el-date-editor--daterange').first();
  await dateRange.waitFor({ state: 'visible', timeout: 30_000 });
  const inputs = dateRange.locator('input');
  if ((await inputs.count()) < 2) {
    throw new Error('Không tìm thấy đủ hai ô ngày bắt đầu/kết thúc của bộ lọc SaleWork.');
  }

  await inputs.nth(0).fill(range.from);
  await inputs.nth(1).fill(range.to);
  await page.keyboard.press('Enter');
}

main().catch(async (error: unknown) => {
  if (activeBrowserContext) {
    await activeBrowserContext.close().catch(() => {});
    activeBrowserContext = null;
  }
  console.error(error instanceof Error ? error.message : 'Đồng bộ SaleWork thất bại.');
  process.exitCode = 1;
});
