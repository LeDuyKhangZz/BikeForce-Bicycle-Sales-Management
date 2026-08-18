'use server';

import { revalidatePath } from 'next/cache';

import { MONTHLY_TARGET_MESSAGES } from '@/lib/admin/messages';
import { AUTH_MESSAGES } from '@/lib/auth/messages';
import { getVietnamMonthRange } from '@/lib/date';
import { createClient } from '@/lib/supabase/server';
import {
  MONTHLY_TARGET_KINDS,
  monthlyTargetFieldName,
  parseMonthlyTargetInput,
  periodMonthOf,
} from '@/lib/validation/monthly-targets';
import {
  saveMonthlyTargets as writeMonthlyTargets,
  type MonthlyTargetWrite,
} from '@/services/monthly-targets';
import { getSessionProfile, listSalesOptions } from '@/services/profiles';
import type { ActionResult } from '@/types/action-result';

/**
 * Server Action của màn hình "Chỉ tiêu tháng" — DEC-071.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  DANH SÁCH SALES ĐỌC LẠI Ở SERVER, KHÔNG LẤY TỪ FORM
 * ─────────────────────────────────────────────────────────────────────────
 *  Form gửi lên `target_sales_amount__<uuid>` cho từng người. Nếu duyệt các
 *  key của `FormData` thì client quyết định được **ghi cho ai** — và tuy Admin
 *  vốn có quyền ghi mọi dòng nên đây không phải lỗ hổng leo thang quyền, nó vẫn
 *  cho phép tạo chỉ tiêu cho một `profile` **không phải Sales** (kể cả chính
 *  Admin). Khoá ngoại không chặn được vì nó chỉ đòi `profiles(id)` tồn tại.
 *
 *  Vì vậy vòng lặp chạy trên danh sách do **server** đọc ra, và mọi key lạ
 *  trong `FormData` bị bỏ qua mà không cần kiểm gì thêm.
 *
 * ⚠ Không dùng `requireAdmin()` — hàm đó `redirect()`, mà redirect trong Server
 * Action gọi từ `useActionState` khiến client treo ở trạng thái "đang lưu"
 * (cùng lý do với `authorizeAdminWrite` của `admin-sales-management`, DEC-036).
 */

export type SaveMonthlyTargetsState =
  | ActionResult<{ notice: string; month: string }>
  | null;

export async function saveMonthlyTargetsAction(
  _prevState: SaveMonthlyTargetsState,
  formData: FormData,
): Promise<SaveMonthlyTargetsState> {
  // 1) VALIDATE tháng trước mọi thứ khác (AGENTS.md §8). `getVietnamMonthRange`
  //    trả `null` khi sai định dạng (DEC-040) — dùng lại nó thay vì regex thứ hai.
  const rawMonth = formData.get('month');
  const month = typeof rawMonth === 'string' ? rawMonth : '';

  if (getVietnamMonthRange(month) === null) {
    return { ok: false, code: 'VALIDATION', message: MONTHLY_TARGET_MESSAGES.INVALID_MONTH };
  }

  // 2) AUTH + ROLE.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: 'UNAUTHORIZED', message: AUTH_MESSAGES.SESSION_EXPIRED };
  }

  const profile = await getSessionProfile(supabase, user.id);

  if (!profile) {
    return { ok: false, code: 'NOT_FOUND', message: AUTH_MESSAGES.PROFILE_MISSING };
  }

  // BR-009 — Admin bị vô hiệu hoá giữa phiên vẫn còn cookie hợp lệ.
  if (!profile.is_active) {
    return { ok: false, code: 'ACCOUNT_DISABLED', message: AUTH_MESSAGES.ACCOUNT_DISABLED };
  }

  if (profile.role !== 'ADMIN') {
    return { ok: false, code: 'FORBIDDEN', message: MONTHLY_TARGET_MESSAGES.FORBIDDEN };
  }

  // 3) ĐỌC LẠI danh sách Sales ở server — xem chú thích đầu file.
  const salesList = await listSalesOptions(supabase);

  if (salesList.length === 0) {
    return { ok: false, code: 'NOT_FOUND', message: MONTHLY_TARGET_MESSAGES.NO_SALES };
  }

  const rows: MonthlyTargetWrite[] = [];
  const fieldErrors: Record<string, string[]> = {};

  for (const sales of salesList) {
    const parsedByKind = MONTHLY_TARGET_KINDS.map((kind) => {
      const field = monthlyTargetFieldName(kind, sales.id);
      const parsed = parseMonthlyTargetInput(formData.get(field));

      if (!parsed.ok) fieldErrors[field] = [parsed.message];

      return parsed;
    });

    // Dòng có ô hỏng thì bỏ hẳn khỏi lượt ghi — ghi một nửa dòng là để lại chỉ
    // tiêu lệch cho đúng người đang bị báo lỗi.
    if (parsedByKind.some((parsed) => !parsed.ok)) continue;

    const [salesAmount, revenue] = parsedByKind;

    rows.push({
      sales_id: sales.id,
      target_sales_amount: salesAmount?.ok === true ? salesAmount.value : null,
      target_revenue: revenue?.ok === true ? revenue.value : null,
    });
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: MONTHLY_TARGET_MESSAGES.VALIDATION,
      fieldErrors,
    };
  }

  // 4) GHI. Client anon chịu RLS — `monthly_targets_*_admin` là thứ cho phép,
  //    không phải service role (DEC-005).
  const result = await writeMonthlyTargets(supabase, periodMonthOf(month), rows, profile.id);

  if (!result.ok) {
    return { ok: false, code: 'UNKNOWN', message: MONTHLY_TARGET_MESSAGES.FAILED };
  }

  revalidatePath('/admin/targets');

  // DEC-034 — câu xác nhận do **server** quyết định, client không tự suy ra.
  return {
    ok: true,
    data: { notice: MONTHLY_TARGET_MESSAGES.SAVED, month },
  };
}
