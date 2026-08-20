import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

/**
 * Data access của bảng `sales_monthly_targets` — DEC-071.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  CHỈ TIÊU **THÁNG**, KHÔNG PHẢI CAM KẾT **NGÀY**
 * ─────────────────────────────────────────────────────────────────────────
 *  `daily_reports.target_*` là cam kết NGÀY do Sales tự gõ mỗi sáng (DEC-030).
 *  Bảng ở đây là chỉ tiêu THÁNG công ty giao, do Admin nhập ở `/admin/targets`.
 *  Cộng cam kết ngày lại **không** ra chỉ tiêu tháng — đó chính là lỗi đã in
 *  `200tr` thay vì `640tr` lên thẻ ảnh production và sinh ra DEC-071.
 *
 *  Mọi hàm ở đây nhận client **anon chịu RLS**. Quyền do policy quyết định:
 *  Sales đọc được dòng của mình, chỉ `is_admin()` mới ghi được. Không hàm nào
 *  trong file này được gọi bằng service role (DEC-005).
 */

export type MonthlyTargets = Pick<
  Database['public']['Tables']['sales_monthly_targets']['Row'],
  'target_sales_amount' | 'target_revenue'
>;

export type MonthlyTargetRow = MonthlyTargets & { sales_id: string };

const TARGET_COLUMNS = 'sales_id, target_sales_amount, target_revenue';

/**
 * Chỉ tiêu tháng của MỘT Sales — đường dùng của thẻ ảnh.
 *
 * `null` mang hai nghĩa cùng lúc: chưa giao chỉ tiêu tháng đó, hoặc RLS chặn.
 * Tầng gọi không cần phân biệt — cả hai đều dẫn tới việc dùng đường lùi cũ.
 */
export async function getMonthlyTargets(
  supabase: SupabaseClient<Database>,
  salesId: string,
  periodMonth: string,
): Promise<MonthlyTargets | null> {
  const { data, error } = await supabase
    .from('sales_monthly_targets')
    .select('target_sales_amount, target_revenue')
    .eq('sales_id', salesId)
    .eq('period_month', periodMonth)
    .maybeSingle<MonthlyTargets>();

  if (error) {
    // NFR-014: chi tiết kỹ thuật chỉ ở log server.
    console.error('[getMonthlyTargets]', error.code, error.message);
    return null;
  }

  return data;
}

/**
 * Chỉ tiêu của CẢ ĐỘI trong một tháng — màn hình `/admin/targets`.
 *
 * Trả mảng (có thể rỗng), **không** trả `null` khi lỗi: màn hình vẫn dựng được
 * với các ô trống, và Admin nhập lại được. Một trang trắng thì không.
 *
 * Cố ý không `join` sang `profiles`: trang cần **mọi** Sales kể cả người chưa
 * được giao chỉ tiêu, nên danh sách người đến từ `listSalesOptions()` còn hàm
 * này chỉ điền số vào. `join` ở đây sẽ bỏ sót đúng nhóm người cần nhập nhất.
 */
export async function listMonthlyTargets(
  supabase: SupabaseClient<Database>,
  periodMonth: string,
): Promise<MonthlyTargetRow[]> {
  const { data, error } = await supabase
    .from('sales_monthly_targets')
    .select(TARGET_COLUMNS)
    .eq('period_month', periodMonth)
    .returns<MonthlyTargetRow[]>();

  if (error) {
    console.error('[listMonthlyTargets]', error.code, error.message);
    return [];
  }

  return data ?? [];
}

export type MonthlyTargetWrite = {
  sales_id: string;
  target_sales_amount: number | null;
  target_revenue: number | null;
};

export type MonthlyTargetWriteResult = { ok: true; saved: number } | { ok: false };

/**
 * Ghi chỉ tiêu của cả tháng trong **một** câu lệnh.
 *
 * `upsert` theo khoá `(period_month, sales_id)` — Admin sửa lại tháng cũ thì
 * dòng cũ được cập nhật chứ không sinh dòng thứ hai, và trigger
 * `trg_sales_monthly_targets_set_updated_at` tự đẩy `updated_at`.
 *
 * Ô trống được ghi thành `null` chứ **không** bị bỏ qua: đó là cách Admin thu
 * hồi một chỉ tiêu đã giao nhầm. Bỏ qua ô trống thì con số cũ nằm lại trong
 * database mãi mãi mà giao diện không còn hiện nó.
 *
 * Không tách `insert`/`update` theo từng dòng: 12 Sales là 12 round-trip, và
 * lỗi ở dòng thứ 7 để lại một tháng ghi dở. Một `upsert` là một giao dịch.
 */
export async function saveMonthlyTargets(
  supabase: SupabaseClient<Database>,
  periodMonth: string,
  rows: readonly MonthlyTargetWrite[],
  adminId: string,
): Promise<MonthlyTargetWriteResult> {
  if (rows.length === 0) return { ok: true, saved: 0 };

  const { error } = await supabase.from('sales_monthly_targets').upsert(
    rows.map((row) => ({
      period_month: periodMonth,
      sales_id: row.sales_id,
      target_sales_amount: row.target_sales_amount,
      target_revenue: row.target_revenue,
      updated_by: adminId,
    })),
    { onConflict: 'period_month,sales_id' },
  );

  if (error) {
    console.error('[saveMonthlyTargets]', error.code, error.message);
    return { ok: false };
  }

  return { ok: true, saved: rows.length };
}
