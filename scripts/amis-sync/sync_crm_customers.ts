import { type Page } from '@playwright/test';
import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { connectToSharedAmisBrowser } from './shared-browser';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(HERE, '.env');
const CRM_URL = 'https://amisapp.misa.vn/crm/account/list';
const GRID_PATH = '/crm/g1/api/business/Account/Grid';
const RPC_NAME = 'sync_operational_customers_from_amis_crm';
const PAGE_SIZE = 100;
const DRY_RUN = process.argv.includes('--dry-run');

config({ path: ENV_PATH, quiet: true });

type CrmCustomer = {
  source_id: string;
  customer_code: string | null;
  customer_name: string;
  phone: string | null;
  phone_raw: string | null;
};

type GridPage = {
  requestBody: Record<string, unknown>;
  rows: CrmCustomer[];
  uiTotal: number;
  apiTotal: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseUiTotal(value: string): number {
  const normalized = value.replace(/[.\s]/g, '');
  const total = Number(normalized);
  if (!/^\d[\d.\s]*$/.test(value) || !Number.isSafeInteger(total) || total < 0) {
    throw new Error(`Không đọc được tổng khách hàng trên CRM: “${value}”.`);
  }
  return total;
}

function parseRows(value: unknown): CrmCustomer[] {
  if (!Array.isArray(value)) throw new Error('Account/Grid không trả Data dạng danh sách.');

  return value.map((item, index) => {
    if (!isRecord(item) || typeof item.ID !== 'number' || !Number.isSafeInteger(item.ID) || item.ID <= 0) {
      throw new Error(`Account/Grid có ID không hợp lệ tại dòng ${index + 1}.`);
    }
    if (typeof item.AccountName !== 'string' || !item.AccountName.trim()) {
      throw new Error(`Account/Grid thiếu AccountName tại dòng ${index + 1}.`);
    }
    if (item.AccountNumber !== null && item.AccountNumber !== undefined && typeof item.AccountNumber !== 'string') {
      throw new Error(`Account/Grid có AccountNumber sai kiểu tại dòng ${index + 1}.`);
    }
    if (item.OfficeTel !== null && item.OfficeTel !== undefined && typeof item.OfficeTel !== 'string') {
      throw new Error(`Account/Grid có OfficeTel sai kiểu tại dòng ${index + 1}.`);
    }

    const rawPhone = typeof item.OfficeTel === 'string' && item.OfficeTel.trim() ? item.OfficeTel : null;
    return {
      source_id: String(item.ID),
      customer_code: typeof item.AccountNumber === 'string' && item.AccountNumber.trim()
        ? item.AccountNumber.trim()
        : null,
      customer_name: item.AccountName.trim(),
      phone: rawPhone !== null && !hasInvalidNormalizedPhone(rawPhone) ? rawPhone.trim() : null,
      phone_raw: rawPhone,
    };
  });
}

async function getGridPage(
  page: Page,
  expectedPage: number,
  navigate: () => Promise<unknown>,
): Promise<GridPage> {
  const responsePromise = page.waitForResponse(
    (response) => response.url().endsWith(GRID_PATH),
    { timeout: 60_000 },
  );
  await navigate();
  const response = await responsePromise;
  if (!response.ok()) throw new Error(`Account/Grid trả HTTP ${response.status()}.`);

  const requestBody: unknown = response.request().postDataJSON();
  if (!isRecord(requestBody)) throw new Error('Không đọc được body request Account/Grid.');
  const rawColumns = requestBody.Columns;
  if (typeof rawColumns !== 'string') throw new Error('Account/Grid không gửi danh sách cột.');
  const requestedColumns = Buffer.from(rawColumns, 'base64').toString('utf8').split(',');
  if (!requestedColumns.includes('ID') || !requestedColumns.includes('AccountNumber') ||
      !requestedColumns.includes('AccountName') || !requestedColumns.includes('OfficeTel')) {
    throw new Error('Request Account/Grid không yêu cầu đủ ID, AccountNumber, AccountName và OfficeTel.');
  }
  if (requestBody.LayoutCode !== 'Account' || requestBody.Page !== expectedPage ||
      requestBody.Start !== (expectedPage - 1) * PAGE_SIZE || requestBody.PageSize !== PAGE_SIZE ||
      !Array.isArray(requestBody.Filters) || requestBody.Filters.length !== 0 ||
      requestBody.AISearchKeyword !== '') {
    throw new Error(`Request Account/Grid trang ${expectedPage} khác danh sách “Tất cả khách hàng” đã xác minh.`);
  }

  const payload: unknown = await response.json();
  if (!isRecord(payload) || payload.Success !== true || payload.Code !== 200 ||
      typeof payload.Total !== 'number' || !Number.isSafeInteger(payload.Total) || payload.Total < 0) {
    throw new Error(`Account/Grid trang ${expectedPage} trả cấu trúc hoặc trạng thái không hợp lệ.`);
  }

  const rows = parseRows(payload.Data);
  await page.waitForFunction(() => {
    const total = document.querySelector('.total-count')?.textContent?.trim() ?? '';
    return /^\d[\d.\s]*$/.test(total);
  }, undefined, { timeout: 60_000 });
  const uiTotal = parseUiTotal(await page.locator('.total-count').innerText());
  return { requestBody, rows, uiTotal, apiTotal: payload.Total };
}

function assertConsistentPage(result: GridPage, expectedPage: number, sourceTotal: number): void {
  if (result.uiTotal !== sourceTotal) {
    throw new Error(`Tổng CRM thay đổi giữa các trang (${sourceTotal} → ${result.uiTotal}); dừng đồng bộ.`);
  }
  if (result.apiTotal !== 0 && result.apiTotal !== sourceTotal) {
    throw new Error(`Total của Account/Grid (${result.apiTotal}) không khớp tổng CRM (${sourceTotal}).`);
  }

  const expectedRows = Math.min(PAGE_SIZE, sourceTotal - (expectedPage - 1) * PAGE_SIZE);
  if (result.rows.length !== expectedRows) {
    throw new Error(`Trang ${expectedPage} có ${result.rows.length}/${expectedRows} dòng; chưa đủ dữ liệu.`);
  }
}

function assertUniqueKeys(customers: CrmCustomer[]): void {
  const ids = new Set<string>();
  const codes = new Set<string>();
  for (const customer of customers) {
    if (ids.has(customer.source_id)) throw new Error(`ID khách hàng CRM bị trùng: ${customer.source_id}.`);
    ids.add(customer.source_id);
    if (customer.customer_code) {
      if (codes.has(customer.customer_code)) {
        throw new Error(`Mã khách hàng CRM bị trùng: ${customer.customer_code}; không thể ghi an toàn vào customers.`);
      }
      codes.add(customer.customer_code);
    }
  }
}

function hasInvalidNormalizedPhone(phone: string | null): boolean {
  if (phone === null) return false;
  const digits = phone.replace(/[^0-9]/g, '');
  if (!digits) return false;
  const normalized = /^84[0-9]{9}$/.test(digits) ? `0${digits.slice(2)}` : digits;
  return normalized.length < 9 || normalized.length > 15;
}

function invalidPhoneLengthCounts(customers: CrmCustomer[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const customer of customers) {
    const phone = customer.phone;
    if (phone === null) continue;
    const digits = phone.replace(/[^0-9]/g, '');
    if (!digits) continue;
    const normalizedLength = /^84[0-9]{9}$/.test(digits) ? 10 : digits.length;
    if (normalizedLength < 9 || normalizedLength > 15) {
      counts.set(normalizedLength, (counts.get(normalizedLength) ?? 0) + 1);
    }
  }
  return counts;
}

async function syncToSupabase(customers: CrmCustomer[], sourceTotal: number): Promise<number> {
  const supabaseUrl = process.env.BIKEFORCE_SUPABASE_URL?.trim().replace(/\/$/, '');
  const serviceRoleKey = process.env.BIKEFORCE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Thiếu BIKEFORCE_SUPABASE_URL hoặc BIKEFORCE_SERVICE_ROLE_KEY trong scripts/amis-sync/.env.');
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${RPC_NAME}`, {
    method: 'POST',
    signal: AbortSignal.timeout(120_000),
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_customers: customers, p_source_total: sourceTotal }),
  });
  if (!response.ok) {
    const errorPayload: unknown = await response.json().catch(() => null);
    const code = isRecord(errorPayload) && typeof errorPayload.code === 'string' ? errorPayload.code : 'unknown';
    const message = isRecord(errorPayload) && typeof errorPayload.message === 'string'
      ? errorPayload.message.slice(0, 300)
      : 'không đọc được thông báo';
    throw new Error(`RPC ${RPC_NAME} thất bại HTTP ${response.status} (${code}): ${message}; chưa xác nhận ghi dữ liệu.`);
  }

  const result: unknown = await response.json();
  if (!Array.isArray(result) || !isRecord(result[0]) ||
      typeof result[0].inserted_or_updated !== 'number') {
    throw new Error('RPC đã phản hồi nhưng cấu trúc kết quả không hợp lệ.');
  }
  return result[0].inserted_or_updated;
}

async function main(): Promise<void> {
  const browser = await connectToSharedAmisBrowser({
    pageUrl: /https:\/\/amisapp\.misa\.vn\/crm\/account\/list(?:[?#].*)?$/,
    closePageOnDisconnect: false,
  });
  try {
    const { page } = browser;
    let firstPage: GridPage;
    if (page.url().startsWith(CRM_URL)) {
      await page.locator('#crm-grid-0_pager_toolbar').waitFor({ state: 'visible', timeout: 60_000 });
      const firstPageLink = page.locator('a.previous-start-page');
      const firstPageClasses = await firstPageLink.getAttribute('class');
      const navigateToFirstPage = firstPageClasses?.includes('disable-next-prev')
        ? () => page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 })
        : () => firstPageLink.click();
      firstPage = await getGridPage(page, 1, navigateToFirstPage);
    } else {
      firstPage = await getGridPage(page, 1, () => page.goto(CRM_URL, { waitUntil: 'domcontentloaded', timeout: 90_000 }));
    }
    if (!page.url().startsWith(CRM_URL)) {
      throw new Error('Profile AMIS chưa đăng nhập vào danh sách khách hàng CRM. Đăng nhập rồi chạy lại lệnh.');
    }

    const sourceTotal = firstPage.uiTotal;
    if (sourceTotal <= 0) throw new Error('CRM hiển thị tổng khách hàng bằng 0; dừng để tránh ghi snapshot rỗng.');
    assertConsistentPage(firstPage, 1, sourceTotal);

    const customers = [...firstPage.rows];
    const pageCount = Math.ceil(sourceTotal / PAGE_SIZE);
    for (let pageNumber = 2; pageNumber <= pageCount; pageNumber += 1) {
      const nextPage = page.locator('a.next-one-page');
      const classes = await nextPage.getAttribute('class');
      if (!classes || classes.includes('disable-next-prev')) {
        throw new Error(`CRM không còn trang tiếp theo tại ${pageNumber}/${pageCount}; dừng vì danh sách chưa đủ.`);
      }
      const result = await getGridPage(page, pageNumber, () => nextPage.click());
      assertConsistentPage(result, pageNumber, sourceTotal);
      customers.push(...result.rows);
      console.log(`Đã đọc trang ${pageNumber}/${pageCount} (${customers.length}/${sourceTotal}).`);
    }

    if (customers.length !== sourceTotal) {
      throw new Error(`Đã gom ${customers.length}/${sourceTotal} khách; không ghi Supabase.`);
    }
    assertUniqueKeys(customers);
    const customersWithPhone = customers.filter((customer) => customer.phone_raw !== null).length;
    const invalidPhoneCount = customers.filter((customer) => customer.phone_raw !== null && customer.phone === null).length;
    const invalidLengths = invalidPhoneLengthCounts(customers.map((customer) => ({
      ...customer,
      phone: customer.phone_raw,
    })));

    console.log(`Tổng khách CRM: ${customers.length}.`);
    console.log(`Khách có điện thoại (OfficeTel): ${customersWithPhone}.`);
    console.log(`OfficeTel không đạt ràng buộc 9–15 chữ số sau chuẩn hóa: ${invalidPhoneCount}.`);
    if (invalidLengths.size > 0) {
      console.log(`Phân bố độ dài chữ số lỗi: ${[...invalidLengths].sort(([a], [b]) => a - b).map(([length, count]) => `${length} chữ số: ${count}`).join(', ')}.`);
    }
    console.log('ID khách hàng trùng: 0; mã khách hàng trùng: 0.');

    if (DRY_RUN) {
      console.log('Dry-run: không ghi Supabase.');
      return;
    }
    const changed = await syncToSupabase(customers, sourceTotal);
    console.log(`RPC Supabase hoàn tất; số dòng được thêm/cập nhật: ${changed}.`);
  } finally {
    await browser.disconnect({ closePage: false, closeBrowserConnection: false });
  }
}

void main().then(() => {
  setTimeout(() => process.exit(0), 100);
}, (error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Đồng bộ khách hàng AMIS CRM thất bại.');
  setTimeout(() => process.exit(1), 100);
});
