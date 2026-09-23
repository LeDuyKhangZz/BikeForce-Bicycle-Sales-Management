'use server';

import { revalidatePath } from 'next/cache';

import { AUTH_MESSAGES } from '@/lib/auth/messages';
import { misaCustomerPlanSchema } from '@/lib/validation/misa-customer-plan';
import { createClient } from '@/lib/supabase/server';
import { upsertMisaCustomerPlan } from '@/services/misa-customer-plans';
import { getSalesIdForMisaEmployee } from '@/services/misa-customer-plans';
import { getSessionProfile } from '@/services/profiles';
import type { ActionResult } from '@/types/action-result';

export type MisaCustomerPlanState = ActionResult | null;

export async function saveMisaCustomerPlan(
  _previousState: MisaCustomerPlanState,
  formData: FormData,
): Promise<MisaCustomerPlanState> {
  const parsed = misaCustomerPlanSchema.safeParse({
    month: formData.get('month'), employeeId: formData.get('employeeId'),
    customerId: formData.get('customerId'), monthlyFrequency: formData.get('monthlyFrequency'),
    committedSales: formData.get('committedSales'),
  });
  if (!parsed.success) return { ok: false, code: 'VALIDATION', message: 'Tần suất hoặc doanh số cam kết không hợp lệ.' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'UNAUTHORIZED', message: AUTH_MESSAGES.SESSION_EXPIRED };
  const profile = await getSessionProfile(supabase, user.id);
  if (!profile) return { ok: false, code: 'NOT_FOUND', message: AUTH_MESSAGES.PROFILE_MISSING };
  if (!profile.is_active) return { ok: false, code: 'ACCOUNT_DISABLED', message: AUTH_MESSAGES.ACCOUNT_DISABLED };
  if (profile.role !== 'ADMIN') return { ok: false, code: 'FORBIDDEN', message: 'Chỉ quản trị viên được cập nhật kế hoạch khách hàng.' };
  const salesId = await getSalesIdForMisaEmployee(supabase, `${parsed.data.month}-01`, parsed.data.employeeId);
  if (salesId === null) return { ok: false, code: 'NOT_FOUND', message: 'Nhân viên MISA chưa được liên kết với tài khoản Sales.' };
  const saved = await upsertMisaCustomerPlan(supabase, {
    salesId,
    periodMonth: `${parsed.data.month}-01`,
    employeeId: parsed.data.employeeId,
    customerId: parsed.data.customerId,
    monthlyFrequency: parsed.data.monthlyFrequency,
    committedSales: parsed.data.committedSales,
  });
  if (!saved) return { ok: false, code: 'UNKNOWN', message: 'Không lưu được kế hoạch khách hàng.' };
  revalidatePath('/sales/customers');
  revalidatePath(`/admin/misa-employees/${parsed.data.employeeId}`);
  return { ok: true, data: undefined };
}
