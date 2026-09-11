import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

import { buildLocalTsxCommand } from '../lib/process/local-tsx-command';
import type { Database } from '../types/database.types';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.BIKEFORCE_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.BIKEFORCE_SERVICE_ROLE_KEY?.trim();
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Thiếu BIKEFORCE_SUPABASE_URL hoặc BIKEFORCE_SERVICE_ROLE_KEY trong .env.local.');
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Job = Pick<
  Database['public']['Tables']['monthly_sync_jobs']['Row'],
  'id' | 'period_month'
>;

function run(command: string, args: readonly string[], extraEnv: Readonly<Record<string, string>> = {}): Promise<void> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, [...args], {
      cwd: process.cwd(),
      env: { ...process.env, ...extraEnv },
      stdio: 'inherit',
      windowsHide: true,
    });
    child.on('error', rejectRun);
    child.on('exit', (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${command} kết thúc với mã ${code ?? 'không xác định'}.`));
    });
  });
}

async function claimNextJob(): Promise<Job | null> {
  const { data: candidate, error: readError } = await supabase
    .from('monthly_sync_jobs')
    .select('id, period_month')
    .eq('status', 'PENDING')
    .order('requested_at', { ascending: true })
    .limit(1)
    .maybeSingle<Job>();
  if (readError) throw new Error(`Không đọc được hàng đợi: ${readError.message}`);
  if (candidate === null) return null;

  const { data, error } = await supabase
    .from('monthly_sync_jobs')
    .update({ status: 'RUNNING', started_at: new Date().toISOString(), error_message: null })
    .eq('id', candidate.id)
    .eq('status', 'PENDING')
    .select('id, period_month')
    .maybeSingle<Job>();
  if (error) throw new Error(`Không nhận được job: ${error.message}`);
  return data;
}

async function main(): Promise<void> {
  const job = await claimNextJob();
  if (job === null) {
    console.log('Không có yêu cầu đồng bộ tháng đang chờ.');
    return;
  }

  const month = job.period_month.slice(0, 7);
  const [year, monthNumber] = month.split('-');
  if (!year || !monthNumber) throw new Error(`Kỳ của job không hợp lệ: ${job.period_month}`);

  const errors: string[] = [];
  try {
    const harvestCommand = buildLocalTsxCommand(
      process.cwd(),
      process.execPath,
      'scripts/amis-sync/amis-harvest.ts',
    );
    await run(harvestCommand.command, harvestCommand.args);
    await run(process.platform === 'win32' ? 'python.exe' : 'python3', ['scripts/amis-sync/push_amis.py'], {
      PUSH_YEAR: year,
      PUSH_MONTH: String(Number(monthNumber)),
    });
  } catch (error) {
    errors.push(`AMIS: ${error instanceof Error ? error.message : 'lỗi không xác định'}`);
  }

  let saleWorkSucceeded = false;
  try {
    const saleWorkCommand = buildLocalTsxCommand(
      process.cwd(),
      process.execPath,
      'scripts/salework-monthly-sync.ts',
      [month],
    );
    await run(saleWorkCommand.command, saleWorkCommand.args);
    saleWorkSucceeded = true;
  } catch (error) {
    errors.push(`SaleWork: ${error instanceof Error ? error.message : 'lỗi không xác định'}`);
  }

  const finishedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('monthly_sync_jobs')
    .update({
      status: errors.length === 0 ? 'COMPLETED' : 'FAILED',
      completed_at: finishedAt,
      synced_rows: saleWorkSucceeded ? 8 : null,
      error_message: errors.length === 0 ? null : errors.join(' | ').slice(0, 1000),
    })
    .eq('id', job.id);
  if (updateError) throw new Error(`Không cập nhật được trạng thái job: ${updateError.message}`);
  if (errors.length > 0) throw new Error(errors.join(' | '));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Đồng bộ tháng thất bại.');
  process.exitCode = 1;
});
