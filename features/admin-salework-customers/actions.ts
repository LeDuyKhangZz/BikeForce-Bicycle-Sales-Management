'use server';

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { revalidatePath } from 'next/cache';

import { AUTH_MESSAGES } from '@/lib/auth/messages';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/services/profiles';

import type { SaleWorkCustomerSyncState } from './types';

const runFile = promisify(execFile);
const SYNC_TIMEOUT_MS = 10 * 60 * 1000;

export async function syncSaleWorkCustomersAction(
  _previous: SaleWorkCustomerSyncState,
  _formData: FormData,
): Promise<SaleWorkCustomerSyncState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'UNAUTHORIZED', message: AUTH_MESSAGES.SESSION_EXPIRED };

  const profile = await getSessionProfile(supabase, user.id);
  if (!profile) return { ok: false, code: 'NOT_FOUND', message: AUTH_MESSAGES.PROFILE_MISSING };
  if (!profile.is_active) return { ok: false, code: 'ACCOUNT_DISABLED', message: AUTH_MESSAGES.ACCOUNT_DISABLED };
  if (profile.role !== 'ADMIN') return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền đồng bộ liên hệ SaleWork.' };

  const projectRoot = process.cwd();
  const tsxCli = `${projectRoot}/node_modules/tsx/dist/cli.mjs`;
  const syncScript = `${projectRoot}/scripts/salework-zalo-sync.ts`;

  try {
    const { stdout } = await runFile(process.execPath, [tsxCli, syncScript], {
      cwd: projectRoot,
      env: process.env,
      windowsHide: true,
      timeout: SYNC_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    });
    revalidatePath('/admin/salework/customers');
    return { ok: true, data: { notice: stdout.trim() || 'Đồng bộ liên hệ SaleWork hoàn tất.' } };
  } catch (error) {
    const details = typeof error === 'object' && error !== null && 'stderr' in error && typeof error.stderr === 'string'
      ? error.stderr.trim()
      : '';
    console.error('[syncSaleWorkCustomersAction]', error instanceof Error ? error.message : 'Unknown error', details);
    return {
      ok: false,
      code: 'UNKNOWN',
      message: details || (error instanceof Error && error.message.includes('ETIMEDOUT')
        ? 'Đồng bộ quá thời gian chờ. Hãy thử lại sau.'
        : 'Không đồng bộ được SaleWork. Kiểm tra cấu hình .env.local và thử lại.'),
    };
  }
}
