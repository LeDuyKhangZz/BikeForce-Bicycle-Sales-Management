import { chromium } from '@playwright/test';
import type { BrowserContext, Locator, Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import type { SaleWorkReport } from '../services/salework';
import { getVietnamMonthRange } from '../lib/date';
import { retryAsync } from '../lib/process/retry-async';
import {
  findStableCompleteSaleWorkReports,
  requireCompleteSaleWorkReports,
} from '../lib/salework/report-completeness';
import {
  monthlySaleWorkPrefix,
  saleWorkCalendarMonthValue,
} from '../lib/salework/monthly-snapshot';
import {
  MONTHLY_SALEWORK_ACCOUNT_NAMES,
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

const DAILY_TARGET_ACCOUNT_NAMES = [
  'Abraham Kế Toán Bánhàng',
  'Giao - Kế Toán bán hàng',
  ...SALES_SALEWORK_ACCOUNT_NAMES,
];
const PROFILE_PATH = resolve(process.cwd(), '.salework-browser-profile');
let activeBrowserContext: BrowserContext | null = null;
const syncMode = process.env.SALEWORK_SYNC_MODE?.trim();
const requestedMonth = process.env.SALEWORK_SYNC_MONTH?.trim() ?? '';
const targetAccountNames = syncMode === 'MONTH_ONLY'
  ? [
      'Abraham Kế Toán Bánhàng',
      'Giao - Kế Toán bán hàng',
      ...MONTHLY_SALEWORK_ACCOUNT_NAMES,
    ]
  : DAILY_TARGET_ACCOUNT_NAMES;

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
  const context = await retryAsync(
    () =>
      chromium.launchPersistentContext(PROFILE_PATH, {
        // Hồ sơ này được người dùng đăng nhập bằng Chrome hệ thống. Dùng cùng
        // channel để tránh Chromium bundled cũ hơn từ chối hồ sơ đã nâng version.
        channel: 'chrome',
        headless: !!process.env.CI,
        locale: 'vi-VN',
        timezoneId: 'Asia/Ho_Chi_Minh',
        viewport: { width: 1440, height: 900 },
      }),
    {
      maxAttempts: 25,
      delayMs: 5_000,
      shouldRetry: (error) =>
        error instanceof Error &&
        /Target page, context or browser has been closed|exitCode=21|profile.*in use|ProcessSingleton/i.test(
          error.message,
        ),
      onRetry: (attempt) => {
        console.log(`Profile SaleWork đang được tác vụ khác sử dụng; chờ 5 giây rồi thử lại (${attempt}/24)…`);
      },
    },
  );
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

  for (const accountName of targetAccountNames) {
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
      `Không thấy nút Tổng hợp sau khi chọn ${targetAccountNames.join(', ')}. Trang hiện tại: ${await summarizePage()}`,
    );
  }

  // Luồng tháng dừng tại đây: không bấm/lưu bảng mặc định của ngày và không gọi CRM Report 70.
  if (syncMode === 'MONTH_ONLY') {
    if (getVietnamMonthRange(requestedMonth) === null) {
      throw new Error('SALEWORK_SYNC_MONTH không hợp lệ; cần định dạng YYYY-MM.');
    }
    await selectSaleWorkMonth(page, requestedMonth);
    await aggregateButton.click();
    console.log(`Đang đọc riêng dữ liệu SaleWork tháng ${requestedMonth}…`);
    await page.waitForTimeout(1000);
    await page
      .locator('.el-loading-mask:visible')
      .last()
      .waitFor({ state: 'hidden', timeout: 60_000 })
      .catch(() => {});
    // Bảng lịch sử tiếp tục nạp các hàng ảo vài giây sau khi loading mask biến mất.
    await page.waitForTimeout(5_000);
    const monthlyAttempts: SaleWorkReport[][] = [];
    let stableMonthlyReports: SaleWorkReport[] | null = null;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const monthlyResult = await readPaginatedReports(page);
      console.log(
        `Lượt đọc SaleWork tháng ${attempt}: ${monthlyResult.reports
          .map(
            (report) =>
              `${report.accountName}=${report.conversations}/${report.sentMessages}/${report.receivedMessages}`,
          )
          .join(' | ')}`,
      );
      monthlyAttempts.push(monthlyResult.reports);
      stableMonthlyReports = findStableCompleteSaleWorkReports(
        targetAccountNames,
        monthlyAttempts,
      );
      if (stableMonthlyReports !== null) break;
      console.log(`Bảng SaleWork tháng chưa ổn định sau lượt ${attempt}; đang cuộn đọc lại…`);
      await page.waitForTimeout(750);
    }
    if (stableMonthlyReports === null) {
      throw new Error('Không hoàn tất được dữ liệu SaleWork tháng sau năm lượt đọc.');
    }
    const accountNamePrefix = monthlySaleWorkPrefix(requestedMonth);
    if (accountNamePrefix === null) throw new Error('Không tạo được khóa snapshot tháng.');
    await saveReportsToSupabase(stableMonthlyReports, accountNamePrefix);
    console.log(
      `Đã đồng bộ ${stableMonthlyReports.length} tài khoản có dữ liệu SaleWork tháng ${requestedMonth}; dữ liệu ngày không thay đổi.`,
    );
    await context.close();
    activeBrowserContext = null;
    return;
  }

  await aggregateButton.click();
  console.log('Đã bấm Tổng hợp; đang cuộn và đọc toàn bộ bảng SaleWork…');
  const dailyResult = await readPaginatedReports(page);
  const reports = dailyResult.reports;

  let completeDailyReports: SaleWorkReport[];
  try {
    completeDailyReports = requireCompleteSaleWorkReports(targetAccountNames, reports);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'thiếu dữ liệu không xác định';
    throw new Error(
      `Chưa đọc đủ bảng sau ${dailyResult.visitedPageCount} trang (${reason}). Không ghi Supabase.`,
    );
  }

  // Vẫn giữ ghi ra file JSON cục bộ để tiện xem/debug nhanh trên máy —
  // nhưng đây không còn là nguồn dữ liệu chính mà app đọc nữa.
  mkdirSync(resolve(process.cwd(), 'data'), { recursive: true });
  writeFileSync(resolve(process.cwd(), 'data/salework-report.json'), JSON.stringify(completeDailyReports, null, 2), 'utf8');

  // ✅ Nguồn dữ liệu chính: ghi lên Supabase, để cả localhost và production
  // (Vercel) đều đọc chung một nơi, không cần commit/push mỗi lần sync.
  await saveReportsToSupabase(completeDailyReports);
  console.log(`Đã lưu ${completeDailyReports.length} tài khoản ngày vào Supabase.`);

  console.log(`Đã đồng bộ ${completeDailyReports.length} tài khoản SaleWork ngày lên Supabase.`);
  await context.close();
  activeBrowserContext = null;
}

async function readScrollableTablePage(
  page: Page,
  rows: Locator,
): Promise<string[][]> {
  const cellsBySignature = new Map<string, string[]>();
  const collectVisibleRows = async (): Promise<void> => {
    const visibleCells = await rows.evaluateAll((currentRows) =>
      currentRows.map((row) =>
        Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent ?? ''),
      ),
    );
    for (const cells of visibleCells) {
      cellsBySignature.set(JSON.stringify(cells), cells);
    }
  };

  await collectVisibleRows();

  // Element UI chỉ giữ các dòng đang nhìn thấy trong DOM. Tìm chính phần tử có
  // overflow dọc lớn nhất bên trong bảng rồi cuộn từ đầu tới cuối, thu dữ liệu
  // sau mỗi nhịp. Không suy “không thấy = 0”.
  const scrollCandidates = page.locator(
    '.el-table .el-table__body-wrapper, .el-table .el-scrollbar__wrap, .el-table [class*="body"]',
  );
  let selectedIndex: number | null = null;
  let selectedOverflow = 0;

  for (let index = 0; index < (await scrollCandidates.count()); index += 1) {
    const metrics = await scrollCandidates.nth(index).evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    const overflow = metrics.scrollHeight - metrics.clientHeight;
    if (metrics.clientHeight > 0 && overflow > selectedOverflow) {
      selectedIndex = index;
      selectedOverflow = overflow;
    }
  }

  if (selectedIndex === null) return Array.from(cellsBySignature.values());

  const scrollContainer = scrollCandidates.nth(selectedIndex);
  const clientHeight = await scrollContainer.evaluate((element) => element.clientHeight);
  const step = Math.max(Math.floor(clientHeight * 0.75), 1);

  for (let scrollTop = 0; scrollTop <= selectedOverflow; scrollTop += step) {
    await scrollContainer.evaluate((element, top) => {
      element.scrollTop = top;
      element.dispatchEvent(new Event('scroll'));
    }, scrollTop);
    await page.waitForTimeout(150);
    await collectVisibleRows();
  }

  await scrollContainer.evaluate((element, top) => {
    element.scrollTop = top;
    element.dispatchEvent(new Event('scroll'));
  }, selectedOverflow);
  await page.waitForTimeout(150);
  await collectVisibleRows();

  return Array.from(cellsBySignature.values());
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
    const currentPageCells = await readScrollableTablePage(page, rows);
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

  // SaleWork đã đổi từ một daterange sang hai date input riêng. Giữ selector cũ làm
  // đường tương thích, rồi tìm theo placeholder/aria-label thay vì vị trí toàn trang.
  const legacyInputs = page.locator('.el-date-editor--daterange input:visible');
  let startInput = (await legacyInputs.count()) >= 2
    ? legacyInputs.nth(0)
    : page.locator(
        'input:visible[placeholder*="Bắt đầu"], input:visible[placeholder*="Từ ngày"], input:visible[aria-label*="bắt đầu" i]',
      ).first();
  let endInput = (await legacyInputs.count()) >= 2
    ? legacyInputs.nth(1)
    : page.locator(
        'input:visible[placeholder*="Kết thúc"], input:visible[placeholder*="Đến ngày"], input:visible[aria-label*="kết thúc" i]',
      ).first();

  if (!(await startInput.isVisible())) {
    const rangeTrigger = page.getByText(/Từ\s+\d{1,2}\/\d{1,2}\/\d{4}\s+Đến\s+\d{1,2}\/\d{1,2}\/\d{4}/).first();
    if (await rangeTrigger.isVisible()) {
      await rangeTrigger.click();
      await page.waitForTimeout(300);
      const dateRangePicker = page.locator('.daterangepicker:visible').first();
      if (await dateRangePicker.isVisible()) {
        const [year, monthNumber, startDay] = range.from.split('-');
        const endDay = range.to.split('-')[2];
        if (!year || !monthNumber || !startDay || !endDay) {
          throw new Error(`Khoảng tháng SaleWork không hợp lệ: ${range.from} - ${range.to}`);
        }
        const calendarMonthValue = saleWorkCalendarMonthValue(month);
        if (calendarMonthValue === null) {
          throw new Error(`Tháng của lịch SaleWork không hợp lệ: ${month}`);
        }

        const leftCalendar = dateRangePicker.locator('.drp-calendar.left');
        await leftCalendar.locator('.monthselect').selectOption(calendarMonthValue);
        await leftCalendar.locator('.yearselect').fill(year);
        await leftCalendar.locator('.yearselect').press('Enter');
        const startDateCell = leftCalendar.locator(`td[data-date="${range.from}"]`).first();
        if ((await startDateCell.count()) === 0) {
          throw new Error(`Không tìm thấy ngày đầu tháng trong lịch SaleWork: ${(await dateRangePicker.innerHTML()).slice(0, 6000)}`);
        }
        await startDateCell.click();

        await leftCalendar.locator('.monthselect').selectOption(calendarMonthValue);
        await leftCalendar.locator('.yearselect').fill(year);
        await leftCalendar.locator('.yearselect').press('Enter');
        const endDateCell = leftCalendar.locator(`td[data-date="${range.to}"]`).first();
        if ((await endDateCell.count()) === 0) {
          throw new Error(`Không tìm thấy ngày cuối tháng trong lịch SaleWork: ${(await dateRangePicker.innerHTML()).slice(0, 6000)}`);
        }
        await endDateCell.click();

        const applyButton = dateRangePicker.locator('.applyBtn');
        if (await applyButton.isVisible()) await applyButton.click();
        return;
      }

      const openedInputs = page.locator(
        '.date-range-picker input:visible, input:visible[type="text"][value*="/"]',
      );
      if ((await openedInputs.count()) >= 2) {
        startInput = openedInputs.nth(0);
        endInput = openedInputs.nth(1);
      }
    }
  }

  await startInput.waitFor({ state: 'visible', timeout: 3_000 }).catch(async () => {
    const visibleInputs = await page.locator('input:visible').evaluateAll((inputs) =>
      inputs.map((input) => ({
        type: input.getAttribute('type'),
        placeholder: input.getAttribute('placeholder'),
        ariaLabel: input.getAttribute('aria-label'),
        value: input instanceof HTMLInputElement ? input.value : null,
        className: input.getAttribute('class'),
      })),
    );
    const visibleText = (await page.locator('body').innerText()).slice(0, 1200);
    const dateControlHtml = await page.locator('body *').evaluateAll((elements) =>
      elements
        .filter((element) => {
          const text = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
          return /^Từ \d{1,2}\/\d{1,2}\/\d{4} Đến \d{1,2}\/\d{1,2}\/\d{4}$/.test(text);
        })
        .slice(-5)
        .map((element) => element.outerHTML.slice(0, 1000)),
    );
    throw new Error(
      `Không tìm thấy ô ngày bắt đầu của bộ lọc SaleWork. Điều khiển hiện có: ${JSON.stringify({ visibleInputs, dateControlHtml, visibleText })}`,
    );
  });
  await endInput.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {
    throw new Error('Không tìm thấy ô ngày kết thúc của bộ lọc SaleWork.');
  });

  await startInput.fill(range.from);
  await endInput.fill(range.to);
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
