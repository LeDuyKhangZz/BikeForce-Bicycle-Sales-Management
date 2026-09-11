/**
 * Tu lay token cho CA HAI he MISA, ghi de vao scripts/amis-sync/.env
 *
 *   CRM (amisapp.misa.vn)  -> AMIS_BEARER_TOKEN, AMIS_COOKIE
 *   KE TOAN (actapp.misa.vn) -> ACT_BEARER_TOKEN, ACT_DEVICE,
 *                               ACT_MISA_CONTEXT, ACT_SESSION_KEY
 *
 * Lan dau:  npx tsx scripts/amis-sync/amis-harvest.ts --login
 *           -> mo browser, dang nhap CA HAI trang (co the phai nhap OTP).
 *
 * Cac lan sau: npx tsx scripts/amis-sync/amis-harvest.ts
 * Chi can CRM: npx tsx scripts/amis-sync/amis-harvest.ts --crm-only
 *
 * Neu he thong bao THIEU token (phien dang nhap trong profile da het han),
 * script se ghi canh bao ro rang vao scripts/amis-sync/alert.log va
 * thoat voi ma loi khac 0, thay vi im lang that bai nhu truoc.
 */

import { chromium, type BrowserContext, type Page } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { actReportParametersFromBody } from '../../lib/amis/act-report-parameters';
import { isJwtSessionUsable } from '../../lib/amis/jwt-session';
import { formatVietnamShortDate, getVietnamMonthRange } from '../../lib/date';
import { sendTelegramAlert } from './telegram-alert';
import { scrapeReceivableEmployeeSummaries } from './receivable-report-scraper';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(HERE, '.env');
const ALERT_PATH = resolve(HERE, 'alert.log');
const PROFILE_DIR = resolve(HERE, '../../.playwright-amis-profile');
const RECEIVABLE_SUMMARY_PATH = resolve(HERE, 'receivable-employee-summary.json');

config({ path: ENV_PATH, quiet: true });

const CRM_URL = 'https://amisapp.misa.vn/crm/dashboard/main';
const CRM_TARGET = /\/crm\/g\d\/api\/dashboard\/Dashboard\/\d+\/data/;

const ACT_URL =
  'https://actapp.misa.vn/app/RP/ReportList/RPDynamicViewer/SummaryCustomerReceivableByEmployee';
const ACT_TARGET = /\/report\/dynamic\/v2\/paging_filter/;

const WANTED_COOKIES = [
  'CompanyCode', 'MarkAuthen', 'x-culture', 'x-deviceid',
  'x-sessionid', 'x-tenantsource', 'x-tenantid',
];

const loginMode = process.argv.includes('--login');
const crmOnly = process.argv.includes('--crm-only');
const monthFlagIndex = process.argv.indexOf('--month');
const requestedMonth = monthFlagIndex >= 0 ? process.argv[monthFlagIndex + 1] : undefined;

if (monthFlagIndex >= 0 && (!requestedMonth || getVietnamMonthRange(requestedMonth) === null)) {
  throw new Error('Tham so --month phai co dang YYYY-MM hop le.');
}

type Harvested = {
  crmToken?: string;
  crmCookie?: string;
  actToken?: string;
  actDevice?: string;
  actContext?: string;
  actSessionKey?: string;
  actBranchFilter?: string;
  actIncludeDependentBranch?: boolean;
};

function upsertEnv(values: Record<string, string>): void {
  if (!existsSync(ENV_PATH)) throw new Error(`Khong thay ${ENV_PATH}`);

  const raw = readFileSync(ENV_PATH, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/);

  for (const [key, value] of Object.entries(values)) {
    if (!value) continue;
    const i = lines.findIndex((l) => l.startsWith(`${key}=`));
    if (i >= 0) lines[i] = `${key}=${value}`;
    else lines.push(`${key}=${value}`);
  }

  writeFileSync(ENV_PATH, lines.join('\r\n'), { encoding: 'utf8' });
}

function expiryOf(jwt: string): string {
  try {
    const part = jwt.split('.')[1];
    if (!part) return '(khong doc duoc)';
    const payload = JSON.parse(
      Buffer.from(part, 'base64').toString('utf8'),
    ) as { exp?: number };
    return payload.exp
      ? new Date(payload.exp * 1000).toLocaleString('vi-VN')
      : '(khong ro)';
  } catch {
    return '(khong doc duoc)';
  }
}

/** Ghi log va gui Telegram neu canh bao co khoa chong spam. */
async function logAlert(message: string, telegramKey?: string): Promise<void> {
  const stamp = new Date().toLocaleString('vi-VN');
  const line = `[${stamp}] ${message}\n`;
  appendFileSync(ALERT_PATH, line, { encoding: 'utf8' });
  console.error(`\n!! CANH BAO: ${message}`);
  console.error(`   (da ghi vao ${ALERT_PATH})`);
  if (telegramKey) await sendTelegramAlert(message, telegramKey);
}

async function harvestCrm(ctx: BrowserContext, got: Harvested): Promise<void> {
  ctx.on('request', (req) => {
    if (!CRM_TARGET.test(req.url())) return;
    const auth = req.headers()['authorization'] ?? '';
    if (auth.startsWith('Bearer ')) got.crmToken = auth.slice(7);
  });

  const page = await ctx.newPage();
  console.log('\n[1/2] CRM — amisapp.misa.vn');
  await page.goto(CRM_URL, { waitUntil: 'domcontentloaded', timeout: 90_000 });

  if (loginMode) console.log('   -> Dang nhap neu duoc hoi, cho dashboard hien ra.');

  const deadline = Date.now() + (loginMode ? 300_000 : 60_000);
  while (!got.crmToken && Date.now() < deadline) {
    await page.waitForTimeout(1000);
  }

  const browserCookie = (await ctx.cookies('https://amisapp.misa.vn'))
    .filter((c) => WANTED_COOKIES.includes(c.name))
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
  got.crmCookie = browserCookie || got.crmCookie;

  console.log(`   token=${got.crmToken ? 'OK' : 'THIEU'}, cookie=${got.crmCookie ? 'OK' : 'THIEU'}`);

  if (!loginMode && !got.crmToken) {
    await logAlert(
      'CRM (amisapp.misa.vn): khong lay duoc token o che do tu dong. ' +
      'Phien dang nhap trong profile co the da het han. ' +
      'Hay chay: npx tsx scripts/amis-sync/amis-harvest.ts --login',
      'crm-session-expired',
    );
  }

  await page.close();
}

async function replaceDateInput(page: Page, index: number, value: string): Promise<void> {
  const input = page.locator('input[placeholder="DD/MM/YYYY"]:visible').nth(index);
  await input.click();
  await input.press('Control+A');
  await input.pressSequentially(value);
  await input.press('Tab');
}

async function selectActMonth(page: Page, month: string): Promise<void> {
  const range = getVietnamMonthRange(month);
  if (range === null) throw new Error(`Ky bao cao khong hop le: ${month}`);

  await page.getByRole('button', { name: /Chọn tham số/i }).first().click({ timeout: 60_000 });
  const dateInputs = page.locator('input[placeholder="DD/MM/YYYY"]:visible');
  await dateInputs.first().waitFor({ state: 'visible', timeout: 30_000 });

  const fromDate = formatVietnamShortDate(range.from);
  const toDate = formatVietnamShortDate(range.to);

  // MISA rang buoc cap ngay theo "Ky bao cao". Nhap nhu ban phim that va
  // doi ngay ket thuc truoc de Vue khong khoi phuc lai moc dau ve thang hien tai.
  await replaceDateInput(page, 1, toDate);
  await replaceDateInput(page, 0, fromDate);

  const selectedDates = await dateInputs.evaluateAll((nodes) =>
    nodes.map((node) => (node instanceof HTMLInputElement ? node.value : '')),
  );
  if (selectedDates[0] !== fromDate || selectedDates[1] !== toDate) {
    throw new Error(
      `MISA khong nhan ky ${month}: dang co ${selectedDates.join(' - ') || 'rong'}.`,
    );
  }

  // Báo cáo lồng hai bộ lọc. MISA mở popup với cả hai danh sách chưa chọn,
  // nên phải chọn toàn bộ nhân viên và khách hàng trước khi xem báo cáo.
  const selectAllLabels = page.getByText('Chọn tất cả', { exact: true });
  await selectAllLabels.first().waitFor({ state: 'visible', timeout: 30_000 });
  const selectAllCount = await selectAllLabels.count();
  if (selectAllCount < 2) {
    throw new Error('MISA khong hien du hai bo loc Nhan vien va Khach hang.');
  }
  await selectAllLabels.first().click();
  await selectAllLabels.last().click();

  const viewReportButton = page.getByRole('button', {
    name: 'Xem báo cáo',
    exact: true,
  });
  await viewReportButton.click();

  const missingSelectionWarning = page.getByText(/Bạn chưa chọn/u).first();
  const reportState = await Promise.race([
    viewReportButton
      .waitFor({ state: 'hidden', timeout: 120_000 })
      .then(() => 'accepted' as const)
      .catch(() => 'timeout' as const),
    missingSelectionWarning
      .waitFor({ state: 'visible', timeout: 120_000 })
      .then(() => 'warning' as const)
      .catch(() => 'timeout' as const),
  ]);
  if (reportState === 'warning') {
    throw new Error(
      (await missingSelectionWarning.textContent())?.trim() ??
        'MISA khong chap nhan bo loc bao cao thang.',
    );
  }
  if (reportState !== 'accepted') {
    throw new Error('MISA khong dong bo loc bao cao thang trong thoi gian cho.');
  }

  const [year, monthNumber] = month.split('-') as [string, string];
  await page
    .getByText(`Tháng ${Number(monthNumber)} năm ${year}`, { exact: true })
    .first()
    .waitFor({ state: 'visible', timeout: 120_000 });
  console.log(`   -> Da mo dung bao cao thang ${month}.`);
}

async function harvestAct(ctx: BrowserContext, got: Harvested): Promise<void> {
  let matchedRequestCount = 0;
  ctx.on('request', (req) => {
    if (!ACT_TARGET.test(req.url())) return;

    matchedRequestCount += 1;
    const h = req.headers();
    const auth = h['authorization'] ?? '';
    if (auth.startsWith('Bearer ')) got.actToken = auth.slice(7);
    got.actDevice = h['x-device'] ?? got.actDevice;
    got.actContext = h['x-misa-context'] ?? got.actContext;
    const parameters = actReportParametersFromBody(req.postData());
    got.actSessionKey = parameters.sessionKey ?? got.actSessionKey;
    got.actBranchFilter = parameters.branchFilter ?? got.actBranchFilter;
    got.actIncludeDependentBranch =
      parameters.includeDependentBranch ?? got.actIncludeDependentBranch;

    console.log(
      `   -> Da bat request ACT #${matchedRequestCount}: ` +
      `token=${got.actToken ? 'OK' : 'THIEU'}, ` +
      `device=${got.actDevice ? 'OK' : 'THIEU'}, ` +
      `context=${got.actContext ? 'OK' : 'THIEU'}, ` +
      `sessionKey=${got.actSessionKey ? 'OK' : 'THIEU'}, ` +
      `branch=${got.actBranchFilter ? 'OK' : 'THIEU'}, ` +
      `dependent=${got.actIncludeDependentBranch !== undefined ? 'OK' : 'THIEU'}`,
    );
  });

  const page = await ctx.newPage();
  console.log('\n[2/2] KE TOAN — actapp.misa.vn');
  await page.goto(ACT_URL, { waitUntil: 'domcontentloaded', timeout: 90_000 });

  if (loginMode) {
    console.log('   -> Dang nhap neu duoc hoi, cho bang bao cao hien ra.');
  }

  if (requestedMonth) {
    await selectActMonth(page, requestedMonth);
    const receivableSummaries = await scrapeReceivableEmployeeSummaries(page);
    writeFileSync(
      RECEIVABLE_SUMMARY_PATH,
      JSON.stringify(
        {
          month: requestedMonth,
          generatedAt: new Date().toISOString(),
          rows: receivableSummaries,
        },
        null,
        2,
      ),
      { encoding: 'utf8' },
    );
    console.log(
      `   -> Da lay ${receivableSummaries.length} dong tong cong no rieng cho thang ${requestedMonth}.`,
    );
  } else {
    // Tu dong bam nut "Xem bao cao" trong popup "Chon tham so" neu no xuat hien.
    // Playwright thao tac tren DOM, khong bi anh huong boi viec cua so hien
    // thi bi cat/khong thay nut bang mat thuong.
    await page
      .getByRole('button', { name: 'Xem báo cáo' })
      .click({ timeout: loginMode ? 300_000 : 30_000 })
      .catch(() => {
        console.log('   -> Khong thay nut "Xem bao cao" (co the da bam roi hoac popup khac cau truc).');
      });
  }

  const deadline = Date.now() + (loginMode ? 300_000 : 90_000);
  while (!got.actToken && Date.now() < deadline) {
    await page.waitForTimeout(1000);
  }

  console.log(
    `   token=${got.actToken ? 'OK' : 'THIEU'}, ` +
    `device=${got.actDevice ? 'OK' : 'THIEU'}, ` +
    `context=${got.actContext ? 'OK' : 'THIEU'}, ` +
    `sessionKey=${got.actSessionKey ? 'OK' : 'THIEU'}, ` +
    `branch=${got.actBranchFilter ? 'OK' : 'THIEU'}, ` +
    `dependent=${got.actIncludeDependentBranch !== undefined ? 'OK' : 'THIEU'}`,
  );

  if (
    !loginMode &&
    (!got.actToken ||
      !got.actDevice ||
      !got.actContext ||
      !got.actSessionKey ||
      !got.actBranchFilter ||
      got.actIncludeDependentBranch === undefined)
  ) {
    await logAlert(
      'KE TOAN (actapp.misa.vn): khong lay duoc token o che do tu dong. ' +
      'Phien dang nhap trong profile co the da het han. ' +
      'Hay chay: npx tsx scripts/amis-sync/amis-harvest.ts --login',
      'act-session-expired',
    );
  }

  await page.close();
}

async function main(): Promise<void> {
  console.log(
    `${loginMode ? 'CHE DO DANG NHAP' : 'CHE DO TU DONG'}${crmOnly ? ' — CHI CRM' : ''}`,
  );

  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    // Riêng luồng tháng cần cửa sổ thật: ACT giữ một lớp chặn click vô hạn
    // trong Chromium headless. Luồng ngày vẫn giữ nguyên chế độ headless cũ.
    headless: requestedMonth ? false : !loginMode,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    // Che do login: khong ep kich thuoc co dinh (de tranh cua so to hon
    // man hinh that, khien footer/nut bam bi day ra ngoai vung nhin thay
    // duoc). De Chromium tu mo va maximize theo man hinh that.
    // Che do tu dong (headless): dung viewport co dinh nhu binh thuong.
    viewport: loginMode || requestedMonth ? null : { width: 1920, height: 1080 },
    args: loginMode || requestedMonth ? ['--start-maximized'] : [],
  });

  const storedCrmToken = process.env.AMIS_BEARER_TOKEN?.trim() ?? '';
  const storedCrmCookie = process.env.AMIS_COOKIE?.trim() ?? '';
  const got: Harvested = {
    ...(isJwtSessionUsable(storedCrmToken) ? { crmToken: storedCrmToken } : {}),
    ...(storedCrmCookie ? { crmCookie: storedCrmCookie } : {}),
  };

  if (got.crmToken) {
    console.log('   -> Tai su dung phien CRM da luu va con han.');
  }

  await harvestCrm(ctx, got);
  if (!crmOnly) {
    await harvestAct(ctx, got);
  }
  await ctx.close();

  const updates: Record<string, string> = {};
  if (got.crmToken) updates['AMIS_BEARER_TOKEN'] = got.crmToken;
  if (got.crmCookie) updates['AMIS_COOKIE'] = got.crmCookie;
  if (got.actToken) updates['ACT_BEARER_TOKEN'] = got.actToken;
  if (got.actDevice) updates['ACT_DEVICE'] = got.actDevice;
  if (got.actContext) updates['ACT_MISA_CONTEXT'] = got.actContext;
  if (got.actSessionKey) updates['ACT_SESSION_KEY'] = got.actSessionKey;
  if (got.actBranchFilter) updates['ACT_BRANCH_FILTER'] = got.actBranchFilter;
  if (got.actIncludeDependentBranch !== undefined) {
    updates['ACT_INCLUDE_DEPENDENT_BRANCH'] = String(got.actIncludeDependentBranch);
  }

  if (Object.keys(updates).length === 0) {
    const msg = 'Khong lay duoc gi tu ca 2 he. Chay lai voi --login.';
    console.error(`\n${msg}`);
    if (!loginMode) await logAlert(msg);
    process.exit(1);
  }

  upsertEnv(updates);
  console.log(`\nDa ghi ${Object.keys(updates).length} bien vao .env`);
  if (got.crmToken) console.log(`  CRM het han: ${expiryOf(got.crmToken)}`);
  if (got.actToken) console.log(`  ACT het han: ${expiryOf(got.actToken)}`);

  // CRM la nguon chinh — thieu no thi coi nhu that bai trong luong ngay.
  if (!got.crmToken) {
    if (!loginMode) {
      await logAlert('CRM token van THIEU sau khi chay xong — can dang nhap lai (--login).');
    }
    // Dong bo thang van de `push_amis.py` thu token CRM da luu trong .env.
    // Neu token cu that su het han, chinh request CRM se fail ro rang; khong
    // chan oan ACT vua tao dung cache cua ky lich su.
    if (!requestedMonth) process.exit(1);
  }

  // KE TOAN thieu thi khong chan qua trinh, nhung phai canh bao ro.
  if (
    !crmOnly &&
    !loginMode &&
    (!got.actToken ||
      !got.actDevice ||
      !got.actContext ||
      !got.actSessionKey ||
      !got.actBranchFilter ||
      got.actIncludeDependentBranch === undefined)
  ) {
    await logAlert('ACT (KE TOAN) token van THIEU sau khi chay xong — can dang nhap lai (--login).');
  }
}

main().catch(async (e) => {
  console.error(e);
  if (!loginMode) {
    await logAlert(
      `Loi khong luong truoc: ${e instanceof Error ? e.message : String(e)}`,
      'amis-harvest-unexpected',
    );
  }
  process.exit(1);
});
