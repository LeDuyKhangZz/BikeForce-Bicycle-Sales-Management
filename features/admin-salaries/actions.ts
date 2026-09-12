'use server';

import { revalidatePath } from 'next/cache';

import { SALARY_MESSAGES } from '@/lib/admin/messages';
import { AUTH_MESSAGES } from '@/lib/auth/messages';
import { createClient } from '@/lib/supabase/server';
import { salaryFieldName, salaryInputSchema, salaryMonthSchema } from '@/lib/validation/salaries';
import { periodMonthOf } from '@/lib/validation/monthly-targets';
import { getSessionProfile } from '@/services/profiles';
import { saveSalaryEntries, type MonthlySalaryWrite } from '@/services/salaries';
import type { ActionResult } from '@/types/action-result';
import { listSalaryParticipants } from './queries';

export type SaveSalariesState = ActionResult<{ notice: string }> | null;

export async function saveSalariesAction(
  _previousState: SaveSalariesState,
  formData: FormData,
): Promise<SaveSalariesState> {
  const monthResult = salaryMonthSchema.safeParse(formData.get('month'));
  if (!monthResult.success) {
    return { ok: false, code: 'VALIDATION', message: SALARY_MESSAGES.INVALID_MONTH };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'UNAUTHORIZED', message: AUTH_MESSAGES.SESSION_EXPIRED };

  const profile = await getSessionProfile(supabase, user.id);
  if (!profile) return { ok: false, code: 'NOT_FOUND', message: AUTH_MESSAGES.PROFILE_MISSING };
  if (!profile.is_active) {
    return { ok: false, code: 'ACCOUNT_DISABLED', message: AUTH_MESSAGES.ACCOUNT_DISABLED };
  }
  if (profile.role !== 'ADMIN') {
    return { ok: false, code: 'FORBIDDEN', message: SALARY_MESSAGES.FORBIDDEN };
  }

  const salesList = await listSalaryParticipants(supabase);
  if (salesList.length === 0) {
    return { ok: false, code: 'NOT_FOUND', message: SALARY_MESSAGES.NO_SALES };
  }

  const rows: MonthlySalaryWrite[] = [];
  const fieldErrors: Record<string, string[]> = {};
  for (const sales of salesList) {
    const field = salaryFieldName(sales.id);
    const parsed = salaryInputSchema.safeParse(formData.get(field));
    if (!parsed.success) {
      fieldErrors[field] = parsed.error.issues.map((issue) => issue.message);
      continue;
    }
    rows.push({ sales_id: sales.id, amount: parsed.data });
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: SALARY_MESSAGES.VALIDATION,
      fieldErrors,
    };
  }

  const result = await saveSalaryEntries(
    supabase,
    periodMonthOf(monthResult.data),
    rows,
  );
  if (!result.ok) {
    return { ok: false, code: 'UNKNOWN', message: SALARY_MESSAGES.FAILED };
  }

  revalidatePath('/admin/salaries');
  revalidatePath('/admin/monthly-summaries');
  return { ok: true, data: { notice: SALARY_MESSAGES.SAVED } };
}
