/**
 * Data access cho các màn hình Admin — PHASE 8, 9, 10.
 *
 * Mọi hàm ở đây gọi **RPC** đã định nghĩa trong `0006_admin_aggregates.sql`,
 * không tự cộng ở Node (AGENTS.md §5: "Aggregate cho Admin làm bằng SQL/RPC,
 * không kéo hàng nghìn row về Node để cộng").
 *
 * Ba luật của tầng này vẫn nguyên (xem đầu `services/reports.ts`):
 *   • KHÔNG quyết định quyền — RLS + guard `is_admin()` trong hàm SQL lo việc đó.
 *   • KHÔNG format tiền, KHÔNG tính `%` — `lib/kpi.ts` là nguồn duy nhất (BR-011).
 *   • Nhận `supabase` client làm tham số, không tự tạo.
 *
 * Mọi hàm trả về **giá trị an toàn khi lỗi** (số 0 / mảng rỗng) thay vì ném:
 * một khối dashboard hỏng không được phép kéo sập cả trang. Chi tiết kỹ thuật
 * chỉ ghi log ở server (NFR-014).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

/** 12 chỉ số bắt buộc của `docs/01 §12.1` — Master Spec §16, FR-024, AF-01. */
export type AdminTodayOverview =
  Database['public']['Functions']['admin_today_overview']['Returns'][number];

/** Một dòng cảnh báo — FR-033, UC-20, AF-02. */
export type MissingReportAlert =
  Database['public']['Functions']['admin_missing_report_alerts']['Returns'][number];

/** Tổng hợp tháng — FR-028, UC-15, AF-05. */
export type AdminMonthlySummary =
  Database['public']['Functions']['admin_monthly_summary']['Returns'][number];

/** Một dòng bảng hiệu suất — FR-029, UC-16, AF-06. */
export type SalesPerformanceRow =
  Database['public']['Functions']['admin_sales_performance']['Returns'][number];

/** Một NGÀY có báo cáo hoàn tất, cho biểu đồ trend — FR-037, AF-08. */
export type DailyTrendRow =
  Database['public']['Functions']['admin_daily_trend']['Returns'][number];

/**
 * Giá trị trả về khi truy vấn hỏng **hoặc** khi người gọi không phải Admin.
 *
 * Hàm SQL trả 0 dòng cho non-admin (guard `is_admin()` bên trong), nên hai
 * trường hợp đó gặp nhau ở đây — và cả hai đều đúng: giao diện hiện số 0 chứ
 * không bao giờ hiện `undefined` hay `NaN`.
 */
const EMPTY_OVERVIEW: AdminTodayOverview = {
  active_sales_count: 0,
  morning_submitted_count: 0,
  completed_count: 0,
  no_report_count: 0,
  target_visit_points: 0,
  actual_visit_points: 0,
  target_sales_quantity: 0,
  actual_sales_quantity: 0,
  target_revenue: 0,
  actual_revenue: 0,
  target_customer_visits: 0,
  actual_customer_visits: 0,
};

const EMPTY_MONTHLY_SUMMARY: AdminMonthlySummary = {
  report_count: 0,
  sales_count: 0,
  target_visit_points: 0,
  actual_visit_points: 0,
  target_sales_quantity: 0,
  actual_sales_quantity: 0,
  target_revenue: 0,
  actual_revenue: 0,
  target_customer_visits: 0,
  actual_customer_visits: 0,
};

/**
 * 12 chỉ số của ngày `date` — UC-12, FR-024.
 *
 * `date` do tầng gọi truyền vào từ `getVietnamToday()` (BR-005, docs/07 QUY TẮC
 * 3). Service KHÔNG đọc đồng hồ và KHÔNG gọi `vn_today()` — chỉ một nơi được
 * quyết định "hôm nay là ngày nào".
 */
export async function getAdminTodayOverview(
  supabase: SupabaseClient<Database>,
  date: string,
): Promise<AdminTodayOverview> {
  const { data, error } = await supabase.rpc('admin_today_overview', { p_date: date });

  if (error) {
    console.error('[getAdminTodayOverview]', error.code, error.message);
    return EMPTY_OVERVIEW;
  }

  // Hàm `returns table` luôn cho đúng một dòng khi là Admin, 0 dòng khi không.
  return data?.[0] ?? EMPTY_OVERVIEW;
}

/** Hai nhóm cảnh báo của ngày `date` — UC-20, FR-033, AF-02. */
export async function getMissingReportAlerts(
  supabase: SupabaseClient<Database>,
  date: string,
): Promise<MissingReportAlert[]> {
  const { data, error } = await supabase.rpc('admin_missing_report_alerts', { p_date: date });

  if (error) {
    console.error('[getMissingReportAlerts]', error.code, error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Tổng target vs actual của một khoảng ngày — UC-15, FR-028.
 *
 * `range` là kết quả `getVietnamMonthRange()`; service không tự dựng ngày.
 * Chỉ cộng báo cáo đã `COMPLETED` (xem chú thích trong migration 0006).
 */
export async function getAdminMonthlySummary(
  supabase: SupabaseClient<Database>,
  range: { from: string; to: string },
): Promise<AdminMonthlySummary> {
  const { data, error } = await supabase.rpc('admin_monthly_summary', {
    p_from: range.from,
    p_to: range.to,
  });

  if (error) {
    console.error('[getAdminMonthlySummary]', error.code, error.message);
    return EMPTY_MONTHLY_SUMMARY;
  }

  return data?.[0] ?? EMPTY_MONTHLY_SUMMARY;
}

/**
 * Bảng hiệu suất theo từng Sales — UC-16, FR-029.
 *
 * Trả về **cả Sales chưa có báo cáo nào** trong khoảng (left join ở SQL): một
 * người vắng mặt cả tháng là thông tin quan trọng nhất của bảng này, không phải
 * thứ để giấu đi.
 */
export async function getSalesPerformance(
  supabase: SupabaseClient<Database>,
  range: { from: string; to: string },
): Promise<SalesPerformanceRow[]> {
  const { data, error } = await supabase.rpc('admin_sales_performance', {
    p_from: range.from,
    p_to: range.to,
  });

  if (error) {
    console.error('[getSalesPerformance]', error.code, error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Chuỗi số liệu theo NGÀY của một khoảng — FR-037, AF-08.
 *
 * Chỉ trả về ngày **có** báo cáo đã hoàn tất, cố ý không lấp đầy ngày trống:
 * v1 không có khái niệm ngày nghỉ (DEC-030), nên một cột 0 cho Chủ nhật là số
 * liệu bịa. Lý do đầy đủ ở đầu `supabase/migrations/0007_admin_daily_trend.sql`.
 *
 * Trần 31 dòng cho một tháng — nhỏ hơn nhiều so với việc kéo cả ~600 báo cáo về
 * Node để tự gom (NFR-002).
 */
export async function getAdminDailyTrend(
  supabase: SupabaseClient<Database>,
  range: { from: string; to: string },
): Promise<DailyTrendRow[]> {
  const { data, error } = await supabase.rpc('admin_daily_trend', {
    p_from: range.from,
    p_to: range.to,
  });

  if (error) {
    console.error('[getAdminDailyTrend]', error.code, error.message);
    return [];
  }

  return data ?? [];
}
