'use server';

import { revalidatePath } from 'next/cache';

import { TRAVEL_EXPENSE_MESSAGES } from '@/lib/admin/messages';
import { AUTH_MESSAGES } from '@/lib/auth/messages';
import { createClient } from '@/lib/supabase/server';
import {
  travelExpenseFieldName,
  travelExpenseInputSchema,
  travelExpenseMonthSchema,
} from '@/lib/validation/travel-expenses';
import { periodMonthOf } from '@/lib/validation/monthly-targets';
import { getSessionProfile, listSalesOptions } from '@/services/profiles';
import {
  saveMonthlyTravelExpenses,
  type MonthlyTravelExpenseWrite,
} from '@/services/travel-expenses';
import type { ActionResult } from '@/types/action-result';

export type SaveTravelExpensesState = ActionResult<{ notice: string }> | null;

export async function saveTravelExpensesAction(
  _previousState: SaveTravelExpensesState,
  formData: FormData,
): Promise<SaveTravelExpensesState> {
  const monthResult = travelExpenseMonthSchema.safeParse(formData.get('month'));
  if (!monthResult.success) {
    return { ok: false, code: 'VALIDATION', message: TRAVEL_EXPENSE_MESSAGES.INVALID_MONTH };
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
    return { ok: false, code: 'FORBIDDEN', message: TRAVEL_EXPENSE_MESSAGES.FORBIDDEN };
  }

  const salesList = await listSalesOptions(supabase);
  if (salesList.length === 0) {
    return { ok: false, code: 'NOT_FOUND', message: TRAVEL_EXPENSE_MESSAGES.NO_SALES };
  }

  const rows: MonthlyTravelExpenseWrite[] = [];
  const fieldErrors: Record<string, string[]> = {};
  for (const sales of salesList) {
    const field = travelExpenseFieldName(sales.id);
    const parsed = travelExpenseInputSchema.safeParse(formData.get(field));
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
      message: TRAVEL_EXPENSE_MESSAGES.VALIDATION,
      fieldErrors,
    };
  }

  const result = await saveMonthlyTravelExpenses(
    supabase,
    periodMonthOf(monthResult.data),
    rows,
    profile.id,
  );
  if (!result.ok) {
    return { ok: false, code: 'UNKNOWN', message: TRAVEL_EXPENSE_MESSAGES.FAILED };
  }

  revalidatePath('/admin/travel-expenses');
  return { ok: true, data: { notice: TRAVEL_EXPENSE_MESSAGES.SAVED } };
}
