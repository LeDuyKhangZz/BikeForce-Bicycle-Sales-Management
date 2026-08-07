/**
 * Data access cho `public.daily_reports`.
 *
 * AGENTS.md §5: mỗi hàm NHẬN supabase client làm tham số, không bao giờ tự tạo
 * client bên trong. Nhờ vậy cùng một truy vấn chạy được dưới client của RSC,
 * của Server Action, và của user thật trong bộ test RLS.
 *
 * Ba luật của tầng này:
 *   • KHÔNG `select('*')` — liệt kê tường minh cột cần dùng (NFR-002).
 *   • KHÔNG quyết định quyền — quyền là việc của RLS + Server Action.
 *   • KHÔNG format tiền, KHÔNG tính `%`, KHÔNG dựng chuỗi ngày hiển thị.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, TablesInsert } from '@/types/database.types';

type DailyReportRow = Database['public']['Tables']['daily_reports']['Row'];

/**
 * Mọi cột NGHIỆP VỤ của một báo cáo. Cố ý bỏ `created_at` / `updated_at`: đó là
 * cột hạ tầng do trigger giữ, giao diện không dùng tới.
 */
const REPORT_COLUMNS = [
  'id',
  'sales_id',
  'report_date',
  'status',
  'planned_route',
  'visit_purpose',
  'target_visit_points',
  'target_sales_quantity',
  'target_revenue',
  'target_customer_visits',
  'morning_submitted_at',
  'actual_route',
  'actual_visit_points',
  'actual_sales_quantity',
  'actual_revenue',
  'actual_customer_visits',
  'evening_note',
  'evening_submitted_at',
].join(', ');

export type DailyReport = Omit<DailyReportRow, 'created_at' | 'updated_at'>;

/** Đúng tập cột mà cam kết đầu ngày được phép ghi (UC-04, UC-05). */
export type MorningReportWrite = Pick<
  TablesInsert<'daily_reports'>,
  | 'planned_route'
  | 'visit_purpose'
  | 'target_visit_points'
  | 'target_sales_quantity'
  | 'target_revenue'
  | 'target_customer_visits'
>;

/** Đúng tập cột mà thực đạt cuối ngày được phép ghi (UC-06, FR-014). */
export type EveningReportWrite = Pick<
  TablesInsert<'daily_reports'>,
  | 'actual_route'
  | 'actual_visit_points'
  | 'actual_sales_quantity'
  | 'actual_revenue'
  | 'actual_customer_visits'
  | 'evening_note'
>;

/**
 * Lỗi ghi đã được DỊCH sang từ vựng nghiệp vụ. Tầng trên không bao giờ nhìn
 * thấy `PostgrestError` thô (AGENTS.md §5, docs/07 QUY TẮC 4).
 *
 *   DUPLICATE — `23505` trên `uq_daily_reports_sales_date` (BR-001).
 *   REJECTED  — RLS/CHECK/GRANT từ chối, hoặc UPDATE khớp 0 dòng vì báo cáo đã
 *               `COMPLETED` (BR-019) hoặc không phải của mình (BR-003).
 *   UNKNOWN   — mọi thứ còn lại; chi tiết đã ghi log ở server.
 */
export type ReportWriteError = 'DUPLICATE' | 'REJECTED' | 'UNKNOWN';

export type ReportWriteResult =
  | { ok: true; reportId: string }
  | { ok: false; error: ReportWriteError };

/** `23505 unique_violation` — docs/07 §6.1. */
const PG_UNIQUE_VIOLATION = '23505';
/** `23514 check_violation` · `23503 fk_violation` · `42501 insufficient_privilege`. */
const PG_REJECTED_CODES = new Set(['23514', '23503', '42501']);

/**
 * Báo cáo của một Sales trong một ngày nghiệp vụ, hoặc `null` nếu chưa có.
 *
 * Truy vấn bám đúng `uq_daily_reports_sales_date` (NFR-002). `null` cũng là câu
 * trả lời khi **RLS chặn** — đó là hành vi mong muốn, không phải lỗi (BR-003).
 */
export async function getTodayReport(
  supabase: SupabaseClient<Database>,
  salesId: string,
  today: string,
): Promise<DailyReport | null> {
  const { data, error } = await supabase
    .from('daily_reports')
    .select(REPORT_COLUMNS)
    .eq('sales_id', salesId)
    .eq('report_date', today)
    .maybeSingle<DailyReport>();

  if (error) {
    // NFR-014: chi tiết kỹ thuật chỉ ở log server.
    console.error('[getTodayReport]', error.code, error.message);
    return null;
  }

  return data;
}

/**
 * Tạo cam kết đầu ngày — UC-04, FR-008.
 *
 * `sales_id`, `report_date` và `status` do **tầng gọi** truyền vào sau khi tự
 * tính ở server (docs/07 QUY TẮC 2 và 3). Service không gọi `auth.uid()` hay
 * `getVietnamToday()` — nó không được phép biết ngữ cảnh phiên.
 */
export async function insertMorningReport(
  supabase: SupabaseClient<Database>,
  salesId: string,
  reportDate: string,
  values: MorningReportWrite,
): Promise<ReportWriteResult> {
  const { data, error } = await supabase
    .from('daily_reports')
    .insert({
      ...values,
      sales_id: salesId,
      report_date: reportDate,
      // BR-008 — vòng đời luôn bắt đầu ở MORNING_SUBMITTED. Cũng là điều kiện
      // WITH CHECK của policy `reports_insert_own_today`.
      status: 'MORNING_SUBMITTED',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[insertMorningReport]', error.code, error.message);

    if (error.code === PG_UNIQUE_VIOLATION) return { ok: false, error: 'DUPLICATE' };
    if (error.code && PG_REJECTED_CODES.has(error.code)) return { ok: false, error: 'REJECTED' };
    return { ok: false, error: 'UNKNOWN' };
  }

  return { ok: true, reportId: data.id };
}

/**
 * Sửa cam kết đầu ngày — UC-05, FR-012, BR-019.
 *
 * Chỉ đụng vào các cột cam kết sáng: `status`, `sales_id`, `report_date` không
 * nằm trong payload nên không có đường nào đổi chủ sở hữu hay ngày báo cáo
 * (trigger `guard_report_transition` là chốt chặn thứ hai).
 *
 * `.eq('sales_id')` là lớp phòng thủ **thêm**, không thay RLS (AGENTS.md §8):
 * policy `reports_update_own_open` mới là thứ chặn thật, và nó còn yêu cầu
 * `OLD.status = 'MORNING_SUBMITTED'` nên báo cáo đã `COMPLETED` sẽ khớp 0 dòng.
 */
export async function updateMorningReport(
  supabase: SupabaseClient<Database>,
  reportId: string,
  salesId: string,
  values: MorningReportWrite,
): Promise<ReportWriteResult> {
  const { data, error } = await supabase
    .from('daily_reports')
    .update(values)
    .eq('id', reportId)
    .eq('sales_id', salesId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[updateMorningReport]', error.code, error.message);

    if (error.code && PG_REJECTED_CODES.has(error.code)) return { ok: false, error: 'REJECTED' };
    return { ok: false, error: 'UNKNOWN' };
  }

  // 0 dòng khớp: không phải chủ báo cáo, hoặc báo cáo đã COMPLETED nên bị khoá.
  // Cố ý KHÔNG phân biệt hai trường hợp trong kết quả trả về — chống dò ID
  // (docs/07 §3.6).
  if (data === null) return { ok: false, error: 'REJECTED' };

  return { ok: true, reportId: data.id };
}

/**
 * Hoàn tất báo cáo cuối ngày — UC-06, FR-014, FR-015, BR-008.
 *
 * Đây là **lần chuyển trạng thái duy nhất** của vòng đời báo cáo:
 * `MORNING_SUBMITTED → COMPLETED`. Sau câu lệnh này báo cáo tự khoá vĩnh viễn
 * (BR-019) vì policy `reports_update_own_open` đánh giá `USING` trên dòng CŨ:
 * lần UPDATE kế tiếp thấy `OLD.status = 'COMPLETED'` nên khớp 0 dòng.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  BỐN CỘT PHẢI GHI CÙNG MỘT CÂU LỆNH
 * ─────────────────────────────────────────────────────────────────────────
 *  `status`, bốn cột `actual_*` và `evening_submitted_at` đi chung một UPDATE
 *  chứ không tách làm hai bước. `ck_completed_requires_actuals` được đánh giá
 *  trên dòng SAU khi câu lệnh chạy xong, nên ghi `status` trước rồi số liệu sau
 *  sẽ vỡ ngay ở bước một — và quan trọng hơn, một câu lệnh nghĩa là không có
 *  trạng thái trung gian nào tồn tại dù chỉ trong một mili giây.
 *
 *  `evening_submitted_at` do **tầng gọi** truyền vào (docs/07 QUY TẮC 3), giống
 *  cách `report_date` được truyền vào `insertMorningReport`. Trigger cố ý KHÔNG
 *  tự đóng dấu cột này — xem ghi chú cuối `0003_functions_triggers.sql`: chỉ một
 *  nơi được ghi một cột.
 *
 * `.eq('sales_id')` là lớp phòng thủ **thêm**, không thay RLS (AGENTS.md §8).
 */
export async function completeEveningReport(
  supabase: SupabaseClient<Database>,
  reportId: string,
  salesId: string,
  submittedAt: string,
  values: EveningReportWrite,
): Promise<ReportWriteResult> {
  const { data, error } = await supabase
    .from('daily_reports')
    .update({
      ...values,
      evening_submitted_at: submittedAt,
      // BR-008 — bước thứ hai và cũng là bước cuối của vòng đời.
      status: 'COMPLETED',
    })
    .eq('id', reportId)
    .eq('sales_id', salesId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[completeEveningReport]', error.code, error.message);

    if (error.code && PG_REJECTED_CODES.has(error.code)) return { ok: false, error: 'REJECTED' };
    return { ok: false, error: 'UNKNOWN' };
  }

  // 0 dòng khớp: báo cáo đã COMPLETED (hai tab cùng bấm Lưu — docs/07 §7), hoặc
  // không phải của mình. Cố ý KHÔNG phân biệt trong kết quả trả về.
  if (data === null) return { ok: false, error: 'REJECTED' };

  return { ok: true, reportId: data.id };
}
