import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const KEY_CRM = 'AMIS.CRM_token';
const KEY_ACT = 'smeToken';

const PROFILE  = path.resolve('.playwright-amis-profile');
const ENV_FILE = path.resolve('scripts/amis-sync/.env');
const SHOT     = path.resolve('scripts/amis-sync/harvest-error.png');

const extractJwt = (raw: string | null) =>
  raw?.match(/eyJ[A-Za-z0-9_\-.]{40,}/)?.[0] ?? null;

function writeEnv(updates: Record<string, string>) {
  const lines = fs.existsSync(ENV_FILE)
    ? fs.readFileSync(ENV_FILE, 'utf-8').split(/\r?\n/)
    : [];
  const pending = new Set(Object.keys(updates));
  const out = lines.map((ln) => {
    const k = ln.split('=')[0]?.trim();
    if (k && pending.has(k)) { pending.delete(k); return `${k}=${updates[k]}`; }
    return ln;
  });
  for (const k of pending) out.push(`${k}=${updates[k]}`);
  fs.writeFileSync(ENV_FILE, out.join('\n').replace(/\n+$/, '\n'), 'utf-8');
}

(async () => {
  const debug = process.argv.includes('--debug');
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: !debug,
    viewport: { width: 1600, height: 900 },
  });
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  let deviceId: string | undefined;
  page.on('request', (r) => { deviceId ??= r.headers()['x-misa-deviceid']; });

  try {
    // --- CRM ---
    await page.goto('https://amisapp.misa.vn', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);

    if (page.url().includes('/login')) {
      throw new Error('SESSION_DEAD: phiên đã hết — cần đăng nhập lại bằng tay');
    }
    const crmToken = extractJwt(await page.evaluate((k) => localStorage.getItem(k), KEY_CRM));

    // --- Kế toán ---
    await page.goto('https://actapp.misa.vn', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    if (page.url().includes('/login')) {
      throw new Error('SESSION_DEAD: phiên Kế toán đã hết');
    }
    const actToken = extractJwt(await page.evaluate((k) => localStorage.getItem(k), KEY_ACT));

    if (!crmToken || !actToken) {
      throw new Error(`Thiếu token (crm=${!!crmToken}, act=${!!actToken})`);
    }

    const upd: Record<string, string> = {
      AMIS_BEARER_TOKEN: crmToken,
      ACT_BEARER_TOKEN: actToken,
      AMIS_TOKEN_UPDATED_AT: new Date().toISOString(),
    };
    if (deviceId) upd.AMIS_DEVICE_ID = deviceId;

    writeEnv(upd);
    console.log('✅ Token đã cập nhật vào scripts/amis-sync/.env');
  } catch (err) {
    const msg = (err as Error).message;
    console.error('❌', msg);
    if (!debug) await page.screenshot({ path: SHOT }).catch(() => {});
    process.exitCode = msg.startsWith('SESSION_DEAD') ? 2 : 1;
  } finally {
    await ctx.close();
  }
})();