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
 */

import { chromium, type BrowserContext } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(HERE, '.env');
const PROFILE_DIR = resolve(HERE, '../../.playwright-amis-profile');

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

type Harvested = {
  crmToken?: string;
  crmCookie?: string;
  actToken?: string;
  actDevice?: string;
  actContext?: string;
  actSessionKey?: string;
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

/** p_session_key nam trong body, truong "parameters" ma hoa base64. */
function sessionKeyFromBody(body: string | null): string | undefined {
  if (!body) return undefined;
  try {
    const parsed = JSON.parse(body) as { parameters?: string };
    if (!parsed.parameters) return undefined;
    const decoded = JSON.parse(
      Buffer.from(parsed.parameters, 'base64').toString('utf8'),
    ) as { p_session_key?: string };
    return decoded.p_session_key;
  } catch {
    return undefined;
  }
}

async function harvestCrm(ctx: BrowserContext, got: Harvested): Promise<void> {
  ctx.on('request', (req) => {
    if (got.crmToken || !CRM_TARGET.test(req.url())) return;
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

  got.crmCookie = (await ctx.cookies('https://amisapp.misa.vn'))
    .filter((c) => WANTED_COOKIES.includes(c.name))
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  console.log(`   token=${got.crmToken ? 'OK' : 'THIEU'}, cookie=${got.crmCookie ? 'OK' : 'THIEU'}`);
  await page.close();
}

async function harvestAct(ctx: BrowserContext, got: Harvested): Promise<void> {
  ctx.on('request', (req) => {
    if (got.actToken || !ACT_TARGET.test(req.url())) return;
    const h = req.headers();
    const auth = h['authorization'] ?? '';
    if (!auth.startsWith('Bearer ')) return;

    got.actToken = auth.slice(7);
    got.actDevice = h['x-device'];
    got.actContext = h['x-misa-context'];
    got.actSessionKey = sessionKeyFromBody(req.postData());
  });

  const page = await ctx.newPage();
  console.log('\n[2/2] KE TOAN — actapp.misa.vn');
  await page.goto(ACT_URL, { waitUntil: 'domcontentloaded', timeout: 90_000 });

  if (loginMode) {
    console.log('   -> Dang nhap neu duoc hoi, cho bang bao cao hien ra.');
  }

  const deadline = Date.now() + (loginMode ? 300_000 : 90_000);
  while (!got.actToken && Date.now() < deadline) {
    await page.waitForTimeout(1000);
  }

  console.log(
    `   token=${got.actToken ? 'OK' : 'THIEU'}, ` +
    `device=${got.actDevice ? 'OK' : 'THIEU'}, ` +
    `context=${got.actContext ? 'OK' : 'THIEU'}, ` +
    `sessionKey=${got.actSessionKey ? 'OK' : 'THIEU'}`,
  );
  await page.close();
}

async function main(): Promise<void> {
  console.log(loginMode ? 'CHE DO DANG NHAP' : 'CHE DO TU DONG');

  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: !loginMode,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    viewport: { width: 1440, height: 900 },
  });

  const got: Harvested = {};

  await harvestCrm(ctx, got);
  await harvestAct(ctx, got);
  await ctx.close();

  const updates: Record<string, string> = {};
  if (got.crmToken) updates['AMIS_BEARER_TOKEN'] = got.crmToken;
  if (got.crmCookie) updates['AMIS_COOKIE'] = got.crmCookie;
  if (got.actToken) updates['ACT_BEARER_TOKEN'] = got.actToken;
  if (got.actDevice) updates['ACT_DEVICE'] = got.actDevice;
  if (got.actContext) updates['ACT_MISA_CONTEXT'] = got.actContext;
  if (got.actSessionKey) updates['ACT_SESSION_KEY'] = got.actSessionKey;

  if (Object.keys(updates).length === 0) {
    console.error('\nKhong lay duoc gi. Chay lai voi --login.');
    process.exit(1);
  }

  upsertEnv(updates);
  console.log(`\nDa ghi ${Object.keys(updates).length} bien vao .env`);
  if (got.crmToken) console.log(`  CRM het han: ${expiryOf(got.crmToken)}`);
  if (got.actToken) console.log(`  ACT het han: ${expiryOf(got.actToken)}`);

  // CRM la nguon chinh — thieu no thi coi nhu that bai.
  if (!got.crmToken) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});