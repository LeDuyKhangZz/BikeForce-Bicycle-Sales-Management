import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

import { getVietnamMonthRange } from '../lib/date';

const month = process.argv[2]?.trim() ?? '';
if (getVietnamMonthRange(month) === null) {
  throw new Error('Cách dùng: npm run salework:sync:month -- YYYY-MM');
}

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['tsx', resolve(process.cwd(), 'scripts/salework-sync.ts')],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SALEWORK_SYNC_MODE: 'MONTH_ONLY',
      SALEWORK_SYNC_MONTH: month,
    },
    stdio: 'inherit',
    windowsHide: true,
  },
);

child.on('error', (error) => {
  console.error(`Không khởi động được đồng bộ SaleWork tháng: ${error.message}`);
  process.exitCode = 1;
});

child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
