import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const PROFILE = path.resolve('.playwright-amis-profile');
const OUT = path.resolve('scripts/amis-sync/amis-recon.json');
const wait = (msg: string) =>
  new Promise<void>((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`\n>>> ${msg}\n    Xong thì bấm Enter...`, () => { rl.close(); res(); });
  });

(async () => {
  const captured: any[] = [];

  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    viewport: null,
    args: ['--start-maximized'],
  });

  const page = ctx.pages()[0] ?? (await ctx.newPage());

  page.on('request', (req) => {
    const h = req.headers();
    if (h['authorization']?.toLowerCase().includes('bearer')) {
      captured.push({
        url: req.url().split('?')[0],
        authorization: h['authorization'].slice(0, 50) + '...',
        misaHeaders: Object.fromEntries(
          Object.entries(h).filter(([k]) => k.startsWith('x-misa') || /device|company|context/i.test(k))
        ),
      });
    }
  });

  const dump = async () => ({
    localStorage: await page.evaluate(() => ({ ...localStorage })),
    sessionStorage: await page.evaluate(() => ({ ...sessionStorage })),
  });

  await page.goto('https://amisapp.misa.vn');
  await wait('Đăng nhập AMIS CRM bằng tay, mở Dashboard doanh thu');
  const crm = await dump();

  await page.goto('https://actapp.misa.vn');
  await wait('Vào AMIS Kế toán, mở báo cáo Công nợ');
  const act = await dump();

  fs.writeFileSync(OUT, JSON.stringify({ crm, act, captured }, null, 2), 'utf-8');

  // In ra ngay các key chứa JWT
  const findJwt = (obj: Record<string, string>, label: string) => {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' && /eyJ[A-Za-z0-9_\-.]{40,}/.test(v)) {
        console.log(`  ${label}.${k}`);
      }
    }
  };

  console.log('\n=== KEY CHỨA JWT ===');
  findJwt(crm.localStorage, 'CRM localStorage');
  findJwt(crm.sessionStorage, 'CRM sessionStorage');
  findJwt(act.localStorage, 'ACT localStorage');
  findJwt(act.sessionStorage, 'ACT sessionStorage');
  console.log(`\n✅ ${captured.length} request có Bearer → ${OUT}`);

  await ctx.close();
})();