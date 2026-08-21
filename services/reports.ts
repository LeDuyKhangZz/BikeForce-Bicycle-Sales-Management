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

import type { MonthToDateRow } from '@/lib/reports/month-summary';
import { buildPageInfo, pageRange, REPORTS_PAGE_SIZE, type PageInfo } from '@/lib/reports/pagination';
import type { Database, TablesInsert } from '@/types/database.types';

type DailyReportRow = Database['public']['Tables']['daily_reports']['Row'];

/**
 * Mọi cột NGHIỆP VỤ của một báo cáo. Cố ý bỏ `created_at` / `updated_at`: đó là
 * cột hạ tầng do trigger giữ, giao diện không dùng tới.
 *
 * ⚠ **Ba cột DI SẢN cố ý KHÔNG có ở đây** (PHASE 13): `visit_purpose` (DEC-048),
 * `target_sales_quantity` và `actual_sales_quantity` (DEC-050). Chúng vẫn nằm
 * trong database cùng dữ liệu đã nhập vì BR-013 cấm xoá, nhưng không màn hình
 * nào đọc chúng nữa — kéo về là tốn băng thông cho dữ liệu không ai hiển thị
 * (NFR-002). Muốn đối chiếu lịch sử thì truy vấn thẳng bằng SQL.
 */
const REPORT_COLUMNS = [
  'id',
  'sales_id',
  'report_date',
  'status',
  'planned_route',
  'target_visit_points',
  'target_sales_amount',
  'target_revenue',
  'target_customer_visits',
  'morning_submitted_at',
  'actual_route',
  'actual_visit_points',
  'actual_sales_amount',
  'actual_revenue',
  'actual_customer_visits',
  'evening_note',
  'evening_submitted_at',
].join(', ');

export type DailyReport = Omit<DailyReportRow, 'created_at' | 'updated_at'>;

/**
 * Đúng tập cột thẻ ảnh 9:16 cần (FR-018) — hẹp hơn `REPORT_COLUMNS` vì ảnh
 * không hiển thị `visit_purpose` hay `morning_submitted_at`.
 *
 * ⚠ **`sales_id` có mặt từ PHASE 17 (DEC-068)** — trước đó cố ý không có. Thẻ
 * ảnh nay in thêm cụm lũy kế tháng, và để cộng được thì phải biết cộng cho AI:
 * `listMonthToDateMetrics()` bên dưới nhận đúng giá trị này. Nó **không** phải
 * một cơ chế phân quyền — quyền vẫn do RLS quyết định (AGENTS.md §8).
 *
 * ⚠ **`amis_employee_name` có mặt từ PHASE 19 (DEC-070).** Đó là cầu nối duy
 * nhất giữa một hồ sơ BikeForce và một dòng số liệu MISA AMIS: AMIS không biết
 * gì về `auth.users`, nó chỉ có tên người. Cột này do Admin điền tay.
 *
 * `sales:profiles!inner(...)` là embedded resource của PostgREST, đặt bí danh
 * `sales` cho dễ đọc ở tầng trên. `!inner` khiến báo cáo bị loại luôn nếu hồ sơ
 * Sales không đọc được — RLS trên `profiles` (`profiles_select_self_or_admin`)
 * cho Sales thấy hồ sơ của chính mình và cho Admin thấy tất cả, nên đúng hai
 * nhóm được phép xuất ảnh (BR-022) đều lấy được tên.
 */
const SHARE_REPORT_COLUMNS = [
  'id',
  'sales_id',
  'report_date',
  'status',
  'planned_route',
  'actual_route',
  'target_visit_points',
  'target_sales_amount',
  'target_revenue',
  'target_customer_visits',
  'actual_visit_points',
  'actual_sales_amount',
  'actual_revenue',
  'actual_customer_visits',
  'evening_note',
  'sales:profiles!inner(full_name, employee_code, amis_employee_name)',
].join(', ');

/** Dữ liệu đủ để dựng thẻ ảnh 9:16 — báo cáo + tên/mã của Sales sở hữu nó. */
export type ShareReport = Pick<
  DailyReportRow,
  | 'id'
  | 'sales_id'
  | 'report_date'
  | 'status'
  | 'planned_route'
  | 'actual_route'
  | 'target_visit_points'
  | 'target_sales_amount'
  | 'target_revenue'
  | 'target_customer_visits'
  | 'actual_visit_points'
  | 'actual_sales_amount'
  | 'actual_revenue'
  | 'actual_customer_visits'
  | 'evening_note'
> & {
  sales: Pick<
    Database['public']['Tables']['profiles']['Row'],
    'full_name' | 'employee_code' | 'amis_employee_name'
  >;
};

/**
 * Đúng tập cột mà cam kết đầu ngày được phép ghi (UC-04, UC-05).
 *
 * ⚠ `visit_purpose` đã bị gỡ khỏi tập này ở PHASE 13 (DEC-048) — nghĩa là kể cả
 * khi một payload lọt qua được Zod, TypeScript vẫn chặn việc ghi cột đó.
 */
export type MorningReportWrite = Pick<
  TablesInsert<'daily_reports'>,
  | 'planned_route'
  | 'target_visit_points'
  | 'target_sales_amount'
  | 'target_revenue'
  | 'target_customer_visits'
>;

/** Đúng tập cột mà thực đạt cuối ngày được phép ghi (UC-06, FR-014). */
export type EveningReportWrite = Pick<
  TablesInsert<'daily_reports'>,
  | 'actual_route'
  | 'actual_visit_points'
  | 'actual_sales_amount'
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
 * Một báo cáo theo `id`, kèm tên và mã nhân viên của Sales sở hữu — UC-08,
 * FR-018. Phục vụ Route Handler ảnh 9:16.
 *
 * **Không nhận `salesId`, và cố ý như vậy.** Quyền đọc ở đây do RLS quyết định
 * hoàn toàn (`reports_select_own_or_admin`): Sales chỉ thấy báo cáo của mình
 * (BR-003), Admin thấy tất cả (BR-022). Nếu hàm này tự lọc thêm
 * `.eq('sales_id', …)` thì Admin sẽ không xuất được ảnh cho Sales — một luật
 * nghiệp vụ bị viết nhầm thành một dòng phòng thủ thừa.
 *
 * `null` mang **hai** nghĩa cùng lúc — không tồn tại, hoặc bị RLS chặn. Tầng gọi
 * phải trả **404 cho cả hai** để không xác nhận sự tồn tại của một `id` mà người
 * gọi không có quyền (`docs/07 §4.1`, chống dò ID).
 */
export async function getReportForShare(
  supabase: SupabaseClient<Database>,
  reportId: string,
): Promise<ShareReport | null> {
  const { data, error } = await supabase
    .from('daily_reports')
    .select(SHARE_REPORT_COLUMNS)
    .eq('id', reportId)
    .maybeSingle<ShareReport>();

  if (error) {
    // NFR-014: chi tiết kỹ thuật chỉ ở log server.
    console.error('[getReportForShare]', error.code, error.message);
    return null;
  }

  return data;
}

/**
 * Đúng 8 cột số mà lũy kế tháng của thẻ ảnh cần — PHASE 17, DEC-068.
 *
 * Không kéo `report_date`, `status` hay bất kỳ cột text nào: các con số của
 * `summarizeMonthToDate()` không đọc tới chúng, và đây là truy vấn chạy thêm ở
 * mỗi lần xuất ảnh (NFR-002).
 */
const MONTH_TO_DATE_COLUMNS = [
  'target_visit_points',
  'target_sales_amount',
  'target_revenue',
  'target_customer_visits',
  'actual_visit_points',
  'actual_sales_amount',
  'actual_revenue',
  'actual_customer_visits',
].join(', ');

/**
 * Các ngày đã có báo cáo của MỘT Sales trong khoảng `[from, to]` — PHASE 17,
 * DEC-068. Nguyên liệu thô của `summarizeMonthToDate()`.
 *
 * Truy vấn bám `idx_daily_reports_sales_date_desc` (`sales_id, report_date
 * desc`): điều kiện `sales_id = $1` cộng một dải `report_date` là đúng hình
 * dạng index đó phục vụ. `uq_daily_reports_sales_date` chặn trần ở **31 dòng**
 * cho một tháng, nên ở đây không cần phân trang.
 *
 * **`salesId` KHÔNG phải lớp bảo mật** (AGENTS.md §8) — nó chỉ nói cộng cho ai.
 * RLS `reports_select_own_or_admin` mới là thứ quyết định người gọi thấy được
 * gì: Sales truyền id của người khác vẫn nhận mảng rỗng (BR-003), Admin xuất
 * ảnh hộ Sales thì thấy đủ (BR-022).
 *
 * `null` = truy vấn HỎNG, khác hẳn `[]` = tháng chưa có ngày nào. Tầng gọi phải
 * phân biệt: in `0 ₫` cho một tháng thực ra có số liệu là nói sai trên một tấm
 * ảnh gửi cho cấp trên, nên khi `null` thì thẻ bỏ hẳn cụm.
 */
export async function listMonthToDateMetrics(
  supabase: SupabaseClient<Database>,
  salesId: string,
  range: { from: string; to: string },
): Promise<MonthToDateRow[] | null> {
  const { data, error } = await supabase
    .from('daily_reports')
    .select(MONTH_TO_DATE_COLUMNS)
    .eq('sales_id', salesId)
    .gte('report_date', range.from)
    .lte('report_date', range.to)
    .returns<MonthToDateRow[]>();

  if (error) {
    // NFR-014: chi tiết kỹ thuật chỉ ở log server.
    console.error('[listMonthToDateMetrics]', error.code, error.message);
    return null;
  }

  return data;
}

/* ===========================================================================
 * SỐ LIỆU MISA AMIS — PHASE 19, DEC-070
 * ========================================================================= */

/**
 * Đúng bảy cột cụm "Tình trạng thực hiện" của thẻ ảnh cần.
 *
 * Bảng `amis_employee_metrics` có 14 cột; sáu cột còn lại (`sales`,
 * `return_sales`, `no_of_orders`, `qty_account_sold`, `current_amount`,
 * `org_unit_name`) phục vụ màn hình đối chiếu của Admin chứ không lên ảnh.
 */
const AMIS_METRIC_COLUMNS = [
  'target_amount',
  'current_amount',
  'net_sales',
  'receive_amount',
  'qty_account_in_charge',
  'qty_account_interactive',
  'qty_account_sold_this_period',
  'no_of_orders',
  'return_sales',
  'synced_at',
].join(', ');

export type AmisShareMetrics = Pick<
  Database['public']['Tables']['amis_employee_metrics']['Row'],
  | 'target_amount'
  | 'current_amount'
  | 'net_sales'
  | 'receive_amount'
  | 'qty_account_in_charge'
  | 'qty_account_interactive'
  | 'qty_account_sold_this_period'
  | 'no_of_orders'
  | 'return_sales'
  | 'synced_at'
>;

/**
 * Số luỹ kế tháng do MISA AMIS ghi nhận — PHASE 19, **DEC-070**.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO KHOÁ LÀ TÊN NGƯỜI, KHÔNG PHẢI `sales_id`
 * ─────────────────────────────────────────────────────────────────────────
 *  AMIS là hệ thống của MISA, nó không biết gì về `auth.users` của BikeForce và
 *  sẽ không bao giờ biết. Thứ duy nhất hai bên cùng có là **tên nhân viên**, nên
 *  cầu nối là cột `profiles.amis_employee_name` do Admin điền tay.
 *
 *  Hệ quả phải chấp nhận: Sales chưa được map thì không có cụm này trên ảnh. Đó
 *  là hành vi ĐÚNG — thà không có còn hơn ghép nhầm số của người khác vào tấm
 *  ảnh gửi cấp trên.
 *
 *  Bảng do script ngoài (`scripts/amis-sync/push_amis.py`) đẩy lên chứ không do
 *  ứng dụng ghi: ba trong bốn nguồn AMIS dùng cookie phiên trình duyệt hết hạn
 *  sau ~24h, không tự động hoá được trên Vercel. Vì vậy `synced_at` phải được
 *  in lên ảnh — người đọc cần biết số này cũ tới mức nào.
 *
 * `null` mang BA nghĩa cùng lúc — chưa map tên, chưa đồng bộ tháng đó, hoặc RLS
 * chặn (`amis_metrics_select_own`). Cả ba dẫn tới cùng một hành vi hiển thị nên
 * tầng gọi không cần phân biệt.
 */
export async function getAmisMetricsForShare(
  supabase: SupabaseClient<Database>,
  employeeName: string | null,
  periodMonth: string,
): Promise<AmisShareMetrics | null> {
  // Chưa map thì không hỏi database: một truy vấn chắc chắn rỗng là truy vấn
  // thừa ở mỗi lần xuất ảnh (NFR-002).
  if (employeeName === null || employeeName.trim() === '') return null;

  const { data, error } = await supabase
    .from('amis_employee_metrics')
    .select(AMIS_METRIC_COLUMNS)
    .eq('employee_name', employeeName)
    .eq('period_month', periodMonth)
    .maybeSingle<AmisShareMetrics>();

  if (error) {
    // NFR-014: chi tiết kỹ thuật chỉ ở log server.
    console.error('[getAmisMetricsForShare]', error.code, error.message);
    return null;
  }

  return data;
}

/**
 * Một báo cáo theo `id`, đủ mọi cột nghiệp vụ — UC-10, FR-022 (Phase 7).
 *
 * Cùng nguyên tắc với `getReportForShare()`: **không nhận `salesId`**. Quyền đọc
 * do policy `reports_select_own_or_admin` quyết định — Sales chỉ thấy báo cáo
 * của mình (BR-003), Admin thấy tất cả (BR-022, dùng lại ở `/admin/reports/[id]`
 * của Phase 9). Thêm `.eq('sales_id', …)` "cho chắc" sẽ chặn nhầm Admin.
 *
 * `null` mang **hai** nghĩa cùng lúc — không tồn tại, hoặc bị RLS chặn. Tầng gọi
 * phải `notFound()` cho **cả hai** để không xác nhận sự tồn tại của một `id` mà
 * người gọi không có quyền (`docs/05 §12` dòng 9, chống dò ID).
 */
export async function getReportById(
  supabase: SupabaseClient<Database>,
  reportId: string,
): Promise<DailyReport | null> {
  const { data, error } = await supabase
    .from('daily_reports')
    .select(REPORT_COLUMNS)
    .eq('id', reportId)
    .maybeSingle<DailyReport>();

  if (error) {
    // NFR-014: chi tiết kỹ thuật chỉ ở log server.
    console.error('[getReportById]', error.code, error.message);
    return null;
  }

  return data;
}

/**
 * Đúng tập cột danh sách lịch sử cần — hẹp hơn `REPORT_COLUMNS` vì màn hình
 * danh sách không hiển thị tuyến, mục đích hay ghi chú (những cột **text dài**
 * nhất của bảng). Bỏ chúng ra khỏi 20 dòng mỗi trang là khác biệt đo được về
 * lượng dữ liệu truyền (NFR-002).
 *
 * Tám cột `target_*`/`actual_*` vẫn phải có: mỗi dòng hiện một huy hiệu "đạt
 * KPI ngày" tính bằng `isKpiAchievedDay()` (BR-024), và phần trăm **không bao
 * giờ** được persist (BR-011) nên buộc phải tính runtime từ số thô.
 */
const LIST_REPORT_COLUMNS = [
  'id',
  'report_date',
  'status',
  'target_visit_points',
  'target_sales_amount',
  'target_revenue',
  'target_customer_visits',
  'actual_visit_points',
  'actual_sales_amount',
  'actual_revenue',
  'actual_customer_visits',
].join(', ');

/** Một dòng của `/sales/history` — FR-021. */
export type ReportListItem = Pick<
  DailyReportRow,
  | 'id'
  | 'report_date'
  | 'status'
  | 'target_visit_points'
  | 'target_sales_amount'
  | 'target_revenue'
  | 'target_customer_visits'
  | 'actual_visit_points'
  | 'actual_sales_amount'
  | 'actual_revenue'
  | 'actual_customer_visits'
>;

export type ReportListPage = {
  rows: ReportListItem[];
  pageInfo: PageInfo;
};

/**
 * Lịch sử báo cáo của một Sales trong một tháng — UC-09, FR-021, NFR-002.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  PHÂN TRANG THỰC HIỆN Ở SERVER, KHÔNG PHẢI Ở CLIENT
 * ─────────────────────────────────────────────────────────────────────────
 *  `.range(from, to)` + `count: 'exact'` trả về **đúng 20 dòng** cộng tổng số
 *  dòng khớp điều kiện. Không có đường nào ở đây kéo cả tháng về rồi cắt bằng
 *  JavaScript — đó là thứ AGENTS.md §5 và NFR-002 cấm.
 *
 *  Thứ tự `report_date desc` + điều kiện `sales_id = $1` bám đúng
 *  `idx_daily_reports_sales_date_desc` (`sales_id, report_date desc`): index vừa
 *  lọc vừa cho sẵn thứ tự, nên Postgres không phải sort lại.
 *
 * `.eq('sales_id', salesId)` ở đây **không** phải cơ chế bảo mật — RLS mới là
 * (AGENTS.md §8). Nó có mặt vì truy vấn cần bám index, và vì Phase 9 sẽ gọi
 * chính hàm này cho Admin xem lịch sử của **một** Sales cụ thể.
 *
 * `range` nhận vào là kết quả của `getVietnamMonthRange()` — service KHÔNG tự
 * tính ngày (AGENTS.md §5: không dựng chuỗi ngày, không đọc đồng hồ).
 */
export async function listReportsByMonth(
  supabase: SupabaseClient<Database>,
  salesId: string,
  range: { from: string; to: string },
  page: number,
): Promise<ReportListPage> {
  const firstAttempt = await runMonthQuery(supabase, salesId, range, page);

  if (firstAttempt.outOfRange) {
    /*
     * ─────────────────────────────────────────────────────────────────────
     *  `?page=` VƯỢT QUÁ SỐ TRANG THẬT — PGRST103
     * ─────────────────────────────────────────────────────────────────────
     *  Kịch bản thật: đang ở `?page=9` của tháng 8 rồi bấm "Tháng trước" sang
     *  một tháng chỉ có 3 báo cáo. PostgREST từ chối hẳn một `range` nằm ngoài
     *  tập kết quả (`416 PGRST103`) chứ **không** trả mảng rỗng — và lúc đó nó
     *  cũng không trả `count`, nên không thể biết tổng số dòng từ chính lỗi đó.
     *
     *  Nếu chỉ nuốt lỗi rồi trả trang rỗng thì người dùng thấy empty state
     *  "tháng này chưa có báo cáo" cho một tháng **có** dữ liệu — sai sự thật.
     *  Vì vậy: đếm bằng một truy vấn `head` (không kéo dòng nào), kẹp trang về
     *  trang cuối cùng có dữ liệu bằng đúng `buildPageInfo()` đã có unit test,
     *  rồi hỏi lại. Hai roundtrip thừa, nhưng chỉ ở nhánh hiếm này.
     */
    const total = await countMonthRows(supabase, salesId, range);
    if (total === 0) return { rows: [], pageInfo: buildPageInfo(0, page) };

    const clamped = buildPageInfo(total, page);
    const retry = await runMonthQuery(supabase, salesId, range, clamped.page);

    return { rows: retry.rows, pageInfo: buildPageInfo(retry.count ?? total, clamped.page) };
  }

  return {
    rows: firstAttempt.rows,
    pageInfo: buildPageInfo(firstAttempt.count ?? 0, page),
  };
}

/** `416 PGRST103` — `range` nằm ngoài tập kết quả. */
const PGRST_RANGE_NOT_SATISFIABLE = 'PGRST103';

type MonthQueryResult = {
  rows: ReportListItem[];
  count: number | null;
  outOfRange: boolean;
};

/** Một lượt hỏi thật. Tách ra vì nhánh kẹp trang phải chạy lại y hệt. */
async function runMonthQuery(
  supabase: SupabaseClient<Database>,
  salesId: string,
  range: { from: string; to: string },
  page: number,
): Promise<MonthQueryResult> {
  const { from, to } = pageRange(page, REPORTS_PAGE_SIZE);

  const { data, error, count } = await supabase
    .from('daily_reports')
    .select(LIST_REPORT_COLUMNS, { count: 'exact' })
    .eq('sales_id', salesId)
    .gte('report_date', range.from)
    .lte('report_date', range.to)
    .order('report_date', { ascending: false })
    .range(from, to)
    .returns<ReportListItem[]>();

  if (error) {
    if (error.code === PGRST_RANGE_NOT_SATISFIABLE) {
      return { rows: [], count: null, outOfRange: true };
    }

    // NFR-014: chi tiết kỹ thuật chỉ ở log server. Trả trang RỖNG chứ không ném
    // lỗi — màn hình lịch sử hỏng không được phép kéo theo cả layout.
    console.error('[listReportsByMonth]', error.code, error.message);
    return { rows: [], count: 0, outOfRange: false };
  }

  return { rows: data ?? [], count: count ?? 0, outOfRange: false };
}

/**
 * Đếm số báo cáo trong tháng mà **không kéo dòng nào** về (`head: true`).
 *
 * Vẫn chịu RLS y như truy vấn chính, nên con số này là "số dòng người gọi được
 * phép thấy", không phải số dòng có trong bảng.
 */
async function countMonthRows(
  supabase: SupabaseClient<Database>,
  salesId: string,
  range: { from: string; to: string },
): Promise<number> {
  const { count, error } = await supabase
    .from('daily_reports')
    .select('id', { count: 'exact', head: true })
    .eq('sales_id', salesId)
    .gte('report_date', range.from)
    .lte('report_date', range.to);

  if (error) {
    console.error('[listReportsByMonth:count]', error.code, error.message);
    return 0;
  }

  return count ?? 0;
}

/* ===========================================================================
 * DANH SÁCH BÁO CÁO CỦA ADMIN — UC-13, FR-025, FR-026 (PHASE 9)
 * ========================================================================= */

/**
 * Tập cột của bảng Admin. Có thêm tên Sales (embedded resource) so với danh
 * sách của Sales, vì cột "Nhân viên" là thứ đầu tiên Admin nhìn.
 *
 * `sales:profiles!inner(...)` — `!inner` là BẮT BUỘC ở đây, không phải tuỳ chọn:
 * nó biến quan hệ thành INNER JOIN, và chỉ khi đó PostgREST mới cho phép **lọc**
 * trên cột của bảng nhúng (`.ilike('sales.full_name', …)` của FR-025). Với join
 * ngoài, bộ lọc theo tên sẽ bị bỏ qua âm thầm.
 */
const ADMIN_REPORT_COLUMNS = [
  'id',
  'sales_id',
  'report_date',
  'status',
  'target_visit_points',
  'target_sales_amount',
  'target_revenue',
  'target_customer_visits',
  'actual_visit_points',
  'actual_sales_amount',
  'actual_revenue',
  'actual_customer_visits',
  'sales:profiles!inner(full_name, employee_code)',
].join(', ');

export type AdminReportListItem = ReportListItem & {
  sales_id: string;
  sales: Pick<Database['public']['Tables']['profiles']['Row'], 'full_name' | 'employee_code'>;
};

export type AdminReportListPage = {
  rows: AdminReportListItem[];
  pageInfo: PageInfo;
};

/** Bộ lọc đã CHUẨN HOÁ — dựng bởi `lib/reports/admin-filters.ts`, không phải chuỗi URL thô. */
export type AdminReportQuery = {
  range: { from: string; to: string } | null;
  salesId: string | null;
  status: Database['public']['Enums']['report_status'] | null;
  search: string | null;
};

/**
 * `%` và `_` là ký tự đại diện của `LIKE`. Một cái tên chứa `%` sẽ khớp mọi thứ
 * nếu không thoát — không phải lỗ hổng (PostgREST vẫn tham số hoá) nhưng là kết
 * quả sai.
 */
function escapeLikePattern(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

/**
 * Danh sách báo cáo toàn đội, đã lọc và phân trang **ở server** — UC-13,
 * FR-025, FR-026, NFR-002.
 *
 * Không có nhánh nào ở đây trả về "tất cả báo cáo": kể cả khi không bật bộ lọc
 * nào, truy vấn vẫn `.range()` đúng một trang (AGENTS.md §5).
 *
 * Sắp theo `report_date desc` để bám `idx_daily_reports_date_status`
 * (`report_date DESC, status`). Khoá phụ là `id` để thứ tự **ổn định** giữa các
 * trang: nhiều báo cáo cùng ngày mà không có khoá phụ thì Postgres được phép
 * trả về thứ tự khác nhau ở mỗi lần chạy, và một dòng có thể xuất hiện ở cả
 * trang 1 lẫn trang 2.
 *
 * Quyền vẫn do RLS quyết định (`reports_select_own_or_admin`): hàm này không
 * kiểm vai. Một Sales gọi nó chỉ thấy báo cáo của chính mình — đúng BR-003.
 */
export async function getAdminReports(
  supabase: SupabaseClient<Database>,
  filters: AdminReportQuery,
  page: number,
): Promise<AdminReportListPage> {
  const attempt = await runAdminQuery(supabase, filters, page);

  // Cùng lý do và cùng cách xử lý với `listReportsByMonth` — xem chú thích
  // PGRST103 ở đó.
  if (attempt.outOfRange) {
    const total = await countAdminRows(supabase, filters);
    if (total === 0) return { rows: [], pageInfo: buildPageInfo(0, page) };

    const clamped = buildPageInfo(total, page);
    const retry = await runAdminQuery(supabase, filters, clamped.page);

    return { rows: retry.rows, pageInfo: buildPageInfo(retry.count ?? total, clamped.page) };
  }

  return { rows: attempt.rows, pageInfo: buildPageInfo(attempt.count ?? 0, page) };
}

type AdminQueryResult = {
  rows: AdminReportListItem[];
  count: number | null;
  outOfRange: boolean;
};

async function runAdminQuery(
  supabase: SupabaseClient<Database>,
  filters: AdminReportQuery,
  page: number,
): Promise<AdminQueryResult> {
  const { from, to } = pageRange(page, REPORTS_PAGE_SIZE);

  let query = supabase
    .from('daily_reports')
    .select(ADMIN_REPORT_COLUMNS, { count: 'exact' });

  if (filters.range !== null) {
    query = query.gte('report_date', filters.range.from).lte('report_date', filters.range.to);
  }
  if (filters.salesId !== null) query = query.eq('sales_id', filters.salesId);
  if (filters.status !== null) query = query.eq('status', filters.status);
  if (filters.search !== null) {
    // Tìm theo TÊN Sales trên bảng nhúng — `ilike` không phân biệt hoa thường
    // và không phân biệt vị trí. `docs/01 §12.1`: chỉ dùng `pg_trgm` GIN khi
    // vượt 200 Sales, chưa cần ở v1.
    query = query.ilike('sales.full_name', `%${escapeLikePattern(filters.search)}%`);
  }

  const { data, error, count } = await query
    .order('report_date', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to)
    .returns<AdminReportListItem[]>();

  if (error) {
    if (error.code === PGRST_RANGE_NOT_SATISFIABLE) {
      return { rows: [], count: null, outOfRange: true };
    }

    console.error('[getAdminReports]', error.code, error.message);
    return { rows: [], count: 0, outOfRange: false };
  }

  return { rows: data ?? [], count: count ?? 0, outOfRange: false };
}

async function countAdminRows(
  supabase: SupabaseClient<Database>,
  filters: AdminReportQuery,
): Promise<number> {
  let query = supabase
    .from('daily_reports')
    .select('id, sales:profiles!inner(id)', { count: 'exact', head: true });

  if (filters.range !== null) {
    query = query.gte('report_date', filters.range.from).lte('report_date', filters.range.to);
  }
  if (filters.salesId !== null) query = query.eq('sales_id', filters.salesId);
  if (filters.status !== null) query = query.eq('status', filters.status);
  if (filters.search !== null) {
    query = query.ilike('sales.full_name', `%${escapeLikePattern(filters.search)}%`);
  }

  const { count, error } = await query;

  if (error) {
    console.error('[getAdminReports:count]', error.code, error.message);
    return 0;
  }

  return count ?? 0;
}

/**
 * Trần số dòng của một lần xuất CSV — FR-034.
 *
 * Có trần vì file tải về được dựng **trong bộ nhớ** của một hàm serverless trên
 * gói Vercel Free (NFR-013). 5.000 dòng ≈ 1 MB CSV, vẫn thoải mái; một truy vấn
 * không giới hạn trên nhiều năm dữ liệu thì không.
 *
 * ⚠ Nếu tập lọc vượt trần, tầng gọi **phải nói ra** — cắt im lặng sẽ khiến người
 * nhận tưởng mình có đủ dữ liệu.
 */
export const CSV_EXPORT_MAX_ROWS = 5_000;

/**
 * Toàn bộ tập đang lọc để xuất CSV — FR-034, UC-21, AF-09.
 *
 * Cố ý KHÔNG dùng `getAdminReports` (nó phân trang 20 dòng): file CSV phải chứa
 * đúng tập đang lọc chứ không phải trang đang xem. Nhưng vẫn `.range()` tới trần
 * ở trên — không có truy vấn nào trong dự án này chạy không giới hạn.
 */
export async function getAdminReportsForExport(
  supabase: SupabaseClient<Database>,
  filters: AdminReportQuery,
): Promise<{ rows: AdminReportListItem[]; truncated: boolean }> {
  let query = supabase.from('daily_reports').select(ADMIN_REPORT_COLUMNS);

  if (filters.range !== null) {
    query = query.gte('report_date', filters.range.from).lte('report_date', filters.range.to);
  }
  if (filters.salesId !== null) query = query.eq('sales_id', filters.salesId);
  if (filters.status !== null) query = query.eq('status', filters.status);
  if (filters.search !== null) {
    query = query.ilike('sales.full_name', `%${escapeLikePattern(filters.search)}%`);
  }

  const { data, error } = await query
    .order('report_date', { ascending: false })
    .order('id', { ascending: false })
    // Lấy dư MỘT dòng để biết tập có bị cắt hay không, thay vì đếm thêm một lượt.
    .range(0, CSV_EXPORT_MAX_ROWS)
    .returns<AdminReportListItem[]>();

  if (error) {
    console.error('[getAdminReportsForExport]', error.code, error.message);
    return { rows: [], truncated: false };
  }

  const rows = data ?? [];

  return {
    rows: rows.slice(0, CSV_EXPORT_MAX_ROWS),
    truncated: rows.length > CSV_EXPORT_MAX_ROWS,
  };
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

/*
 * ─────────────────────────────────────────────────────────────────────────
 *  PHASE 14 — `updateMorningReport()` ĐÃ BỊ XOÁ (DEC-055)
 * ─────────────────────────────────────────────────────────────────────────
 *  Hàm này phục vụ UC-05 / FR-012 ("sửa cam kết sáng"). Khả năng sửa đã bị gỡ
 *  khỏi v1 theo yêu cầu trực tiếp của người dùng, nên hàm đi cùng Server Action
 *  gọi nó thay vì ở lại làm code chết.
 *
 *  Hệ quả đáng nhớ: sau thay đổi này, đường UPDATE **duy nhất** mà ứng dụng còn
 *  dùng trên `daily_reports` là `completeEveningReport()` bên dưới. Policy
 *  `reports_update_own_open` vì thế vẫn cần thiết và **không** bị gỡ.
 */

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