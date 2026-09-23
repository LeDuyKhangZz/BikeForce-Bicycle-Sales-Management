'use server';

import { revalidatePath } from 'next/cache';

import { authorizeSalesWrite } from '@/features/auth/queries';
import { misaCustomerPlanSchema } from '@/lib/validation/misa-customer-plan';
import { upsertMisaCustomerPlan } from '@/services/misa-customer-plans';
import type { ActionResult } from '@/types/action-result';

export type MisaCustomerPlanState = ActionResult | null;

export async function saveMisaCustomerPlan(
  _previousState: MisaCustomerPlanState,
  formData: FormData,
): Promise<MisaCustomerPlanState> {
  const auth = await authorizeSalesWrite();
  if (!auth.ok) return auth;
  const parsed = misaCustomerPlanSchema.safeParse({
    month: formData.get('month'), employeeId: formData.get('employeeId'),
    customerId: formData.get('customerId'), monthlyFrequency: formData.get('monthlyFrequency'),
    committedSales: formData.get('committedSales'),
  });
  if (!parsed.success) return { ok: false, code: 'VALIDATION', message: 'Tần suất hoặc doanh số cam kết không hợp lệ.' };
  const saved = await upsertMisaCustomerPlan(auth.supabase, {
    salesId: auth.profile.id,
    periodMonth: `${parsed.data.month}-01`,
    employeeId: parsed.data.employeeId,
    customerId: parsed.data.customerId,
    monthlyFrequency: parsed.data.monthlyFrequency,
    committedSales: parsed.data.committedSales,
  });
  if (!saved) return { ok: false, code: 'UNKNOWN', message: 'Không lưu được kế hoạch khách hàng.' };
  revalidatePath('/sales/customers');
  return { ok: true, data: undefined };
}
