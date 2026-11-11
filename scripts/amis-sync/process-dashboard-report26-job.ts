import { spawn } from 'node:child_process';
import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '.env'), quiet: true });

const syncUrl = process.env.DASHBOARD_REPORT26_SYNC_URL?.trim() || '';
const secret = process.env.DASHBOARD_REPORT_SYNC_SECRET?.trim() || '';

function run(script: string, args: string[] = []): Promise<void> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ['--import', 'tsx', script, ...args], { cwd: process.cwd(), stdio: 'inherit', windowsHide: true });
    child.once('error', rejectRun);
    child.once('exit', (code) => code === 0 ? resolveRun() : rejectRun(new Error(`Report 26 ket thuc voi ma ${code ?? 'khong xac dinh'}.`)));
  });
}

async function update(month: string, ok: boolean, error?: string): Promise<void> {
  await fetch(`${syncUrl}/jobs`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-amis-report-sync-secret': secret }, body: JSON.stringify({ month, ok, error }) });
}

async function main(): Promise<void> {
  if (!syncUrl || !secret) throw new Error('Thieu cau hinh Dashboard Report 26.');
  const response = await fetch(`${syncUrl}/jobs`, { headers: { 'x-amis-report-sync-secret': secret } });
  if (!response.ok) throw new Error(`Khong doc duoc hang doi Dashboard: HTTP ${response.status}`);
  const result = await response.json() as { job?: { month?: string } | null };
  const month = result.job?.month;
  if (!month) return;
  try {
    // Cookie/token AMIS co the het han. Luon lay lai phien tu Chrome dang dang nhap
    // truoc khi goi Report 26, de yeu cau tu Dashboard khong phu thuoc token cu.
    await run('scripts/amis-sync/amis-harvest.ts', ['--crm-only']);
    await run('scripts/amis-sync/sync-dashboard-report26.ts', ['--month', month]);
    await run('scripts/amis-sync/sync-dashboard-regional-sales.ts', ['--month', month]);
    await update(month, true);
  }
  catch (error) { await update(month, false, error instanceof Error ? error.message : 'Dong bo that bai.'); throw error; }
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Xu ly hang doi that bai.'); process.exitCode = 1; });
