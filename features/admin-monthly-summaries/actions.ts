'use server';

import { revalidatePath } from 'next/cache';

import { MONTHLY_SYNC_MESSAGES } from '@/lib/admin/messages';
import { AUTH_MESSAGES } from '@/lib/auth/messages';
import { getVietnamMonthRange } from '@/lib/date';
import { createClient } from '@/lib/supabase/server';
import { createMonthlySyncJob } from '@/services/monthly-sync-jobs';
import { getSessionProfile } from '@/services/profiles';
import type { ActionResult } from '@/types/action-result';

export type RequestMonthlySyncState = ActionResult<{ notice: string }> | null;

export async function requestMonthlySyncAction(
  _previousState: RequestMonthlySyncState,
  formData: FormData,
): Promise<RequestMonthlySyncState> {
  const rawMonth = formData.get('month');
  const month = typeof rawMonth === 'string' ? rawMonth : '';
  if (getVietnamMonthRange(month) === null) {
    return { ok: false, code: 'VALIDATION', message: MONTHLY_SYNC_MESSAGES.INVALID_MONTH };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'UNAUTHORIZED', message: AUTH_MESSAGES.SESSION_EXPIRED };

  const profile = await getSessionProfile(supabase, user.id);
  if (!profile) return { ok: false, code: 'NOT_FOUND', message: AUTH_MESSAGES.PROFILE_MISSING };
  if (!profile.is_active) return { ok: false, code: 'ACCOUNT_DISABLED', message: AUTH_MESSAGES.ACCOUNT_DISABLED };
  if (profile.role !== 'ADMIN') {
    return { ok: false, code: 'FORBIDDEN', message: MONTHLY_SYNC_MESSAGES.FORBIDDEN };
  }

  const result = await createMonthlySyncJob(supabase, `${month}-01`, user.id);
  if (result === 'FAILED') return { ok: false, code: 'UNKNOWN', message: MONTHLY_SYNC_MESSAGES.FAILED };
  if (result === 'ACTIVE_EXISTS') {
    return { ok: false, code: 'CONFLICT', message: MONTHLY_SYNC_MESSAGES.ALREADY_ACTIVE };
  }

  revalidatePath('/admin/monthly-summaries');
  return { ok: true, data: { notice: MONTHLY_SYNC_MESSAGES.QUEUED } };
}
