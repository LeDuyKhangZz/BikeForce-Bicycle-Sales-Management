/**
 * Bộ lọc của `/admin/reports` — FR-025, FR-026, UC-13, AF-03.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  MỌI THỨ Ở ĐÂY LÀ HÀM THUẦN, VÀ ĐÓ LÀ CHỦ Ý
 * ─────────────────────────────────────────────────────────────────────────
 *  Đầu vào là `searchParams` — tức là **chuỗi bất kỳ người dùng gõ được vào
 *  URL**. Năm chiều lọc (ngày / khoảng ngày / tháng / Sales / trạng thái) cộng
 *  ô tìm kiếm cho ra rất nhiều tổ hợp, trong đó có những tổ hợp vô nghĩa
 *  (`from` sau `to`, vừa `date` vừa `month`). Nếu để tầng service tự đoán thì
 *  mỗi lần thêm một chiều lọc lại phải đọc lại toàn bộ truy vấn.
 *
 *  Ở đây chuẩn hoá **một lần** thành đúng một khoảng ngày `[from, to]` cộng ba
 *  bộ lọc rời, rồi service chỉ việc dịch sang `gte/lte/eq/ilike`. Và vì là hàm
 *  thuần, mọi tổ hợp kỳ quặc kiểm được bằng unit test không cần database.
 *
 *  Thứ tự ưu tiên khi có nhiều chiều ngày cùng lúc — **hẹp nhất thắng**:
 *      `date` (một ngày)  →  `from`+`to` (khoảng)  →  `month` (cả tháng)
 *  Lý do: người dùng vừa bấm một ngày cụ thể thì đó là ý định mới nhất; giữ
 *  `month` cũ sẽ ra một kết quả rộng hơn thứ họ vừa chọn.
 */
import { isValidVietnamDate } from '@/lib/date';
import { getVietnamMonthRange } from '@/lib/date';
import type { Database } from '@/types/database.types';

type ReportStatus = Database['public']['Enums']['report_status'];

export const ADMIN_REPORT_PARAMS = {
  DATE: 'date',
  FROM: 'from',
  TO: 'to',
  MONTH: 'month',
  SALES: 'salesId',
  STATUS: 'status',
  SEARCH: 'q',
  PAGE: 'page',
} as const;

export const ADMIN_REPORTS_PATH = '/admin/reports';

/** Trần độ dài ô tìm kiếm — chặn một chuỗi 10.000 ký tự đi thẳng vào `ilike`. */
export const MAX_SEARCH_LENGTH = 100;

/** Đầu vào thô, đúng hình dạng `searchParams` của Next. */
export type AdminReportSearchParams = {
  date?: string;
  from?: string;
  to?: string;
  month?: string;
  salesId?: string;
  status?: string;
  q?: string;
};

export type AdminReportFilters = {
  /** Khoảng ngày đã chuẩn hoá, `null` = không lọc theo ngày. Inclusive hai đầu. */
  range: { from: string; to: string } | null;
  /** `null` = mọi Sales. */
  salesId: string | null;
  /** `null` = mọi trạng thái. */
  status: ReportStatus | null;
  /** Chuỗi tìm theo tên Sales, đã trim. `null` = không tìm. */
  search: string | null;
  /** Ghi lại chiều ngày đang dùng để giao diện tô đúng ô đang chọn. */
  dateMode: 'DAY' | 'RANGE' | 'MONTH' | 'ALL';
  /** Giá trị đã chuẩn hoá, để render lại đúng vào ô nhập. */
  raw: { date: string | null; from: string | null; to: string | null; month: string | null };
};

/** Hai giá trị hợp lệ của `report_status` — BR-008, DEC-020. */
const REPORT_STATUSES: readonly ReportStatus[] = ['MORNING_SUBMITTED', 'COMPLETED'];

function normalizeStatus(raw: string | undefined): ReportStatus | null {
  if (typeof raw !== 'string') return null;
  return REPORT_STATUSES.find((status) => status === raw) ?? null;
}

/**
 * UUID v4 dạng chuẩn. Kiểm ở đây để một `?salesId=abc` không đi tới Postgres và
 * làm câu lệnh hỏng bằng `22P02 invalid_text_representation`.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeSalesId(raw: string | undefined): string | null {
  if (typeof raw !== 'string' || !UUID_PATTERN.test(raw)) return null;
  return raw;
}

function normalizeSearch(raw: string | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().slice(0, MAX_SEARCH_LENGTH);
  return trimmed === '' ? null : trimmed;
}

/** `searchParams` thô → bộ lọc đã chuẩn hoá, luôn dùng được. */
export function parseAdminReportFilters(params: AdminReportSearchParams): AdminReportFilters {
  const base = {
    salesId: normalizeSalesId(params.salesId),
    status: normalizeStatus(params.status),
    search: normalizeSearch(params.q),
  };

  // 1) Một ngày cụ thể — chiều hẹp nhất, thắng mọi chiều còn lại.
  if (typeof params.date === 'string' && isValidVietnamDate(params.date)) {
    return {
      ...base,
      range: { from: params.date, to: params.date },
      dateMode: 'DAY',
      raw: { date: params.date, from: null, to: null, month: null },
    };
  }

  // 2) Khoảng ngày. Cần ĐỦ hai đầu và cả hai phải là ngày có thật; thiếu một
  //    đầu thì khoảng không xác định, rơi xuống chiều tiếp theo.
  if (
    typeof params.from === 'string' &&
    typeof params.to === 'string' &&
    isValidVietnamDate(params.from) &&
    isValidVietnamDate(params.to)
  ) {
    // Người dùng chọn ngược thì TỰ ĐẢO thay vì trả về rỗng: `from > to` cho ra
    // 0 dòng mà không giải thích được vì sao, còn đảo lại thì đúng ý định.
    const [from, to] =
      params.from <= params.to ? [params.from, params.to] : [params.to, params.from];

    return {
      ...base,
      range: { from, to },
      dateMode: 'RANGE',
      raw: { date: null, from, to, month: null },
    };
  }

  // 3) Cả tháng.
  if (typeof params.month === 'string') {
    const monthRange = getVietnamMonthRange(params.month);

    if (monthRange !== null) {
      return {
        ...base,
        range: monthRange,
        dateMode: 'MONTH',
        raw: { date: null, from: null, to: null, month: params.month },
      };
    }
  }

  // 4) Không lọc theo ngày. `getAdminReports` vẫn phân trang nên đây KHÔNG phải
  //    "trả về toàn bộ bảng" (AGENTS.md §5).
  return {
    ...base,
    range: null,
    dateMode: 'ALL',
    raw: { date: null, from: null, to: null, month: null },
  };
}

/** `true` khi có ít nhất một bộ lọc đang bật — để hiện nút "Xoá lọc". */
export function hasActiveFilters(filters: AdminReportFilters): boolean {
  return (
    filters.range !== null ||
    filters.salesId !== null ||
    filters.status !== null ||
    filters.search !== null
  );
}

/**
 * Bộ lọc + trang → URL. Giữ nguyên mọi chiều đang bật, chỉ thay thứ được truyền.
 *
 * Dùng cho thanh phân trang, nút "Xoá lọc", và link tải CSV — ba nơi phải sinh
 * ra **cùng một** tập tham số, nếu không thì file CSV sẽ không khớp với bảng
 * đang hiển thị (FR-034: "đúng tập dữ liệu đang filter, không phải toàn bảng").
 */
export function buildAdminReportQuery(
  filters: AdminReportFilters,
  overrides: { page?: number } = {},
): URLSearchParams {
  const search = new URLSearchParams();

  if (filters.raw.date) search.set(ADMIN_REPORT_PARAMS.DATE, filters.raw.date);
  if (filters.raw.from) search.set(ADMIN_REPORT_PARAMS.FROM, filters.raw.from);
  if (filters.raw.to) search.set(ADMIN_REPORT_PARAMS.TO, filters.raw.to);
  if (filters.raw.month) search.set(ADMIN_REPORT_PARAMS.MONTH, filters.raw.month);
  if (filters.salesId) search.set(ADMIN_REPORT_PARAMS.SALES, filters.salesId);
  if (filters.status) search.set(ADMIN_REPORT_PARAMS.STATUS, filters.status);
  if (filters.search) search.set(ADMIN_REPORT_PARAMS.SEARCH, filters.search);
  // `page=1` được lược bỏ: đó là mặc định (cùng quy ước `salesHistoryPath`).
  if (overrides.page !== undefined && overrides.page > 1) {
    search.set(ADMIN_REPORT_PARAMS.PAGE, String(overrides.page));
  }

  return search;
}

export function adminReportsPath(
  filters: AdminReportFilters,
  overrides: { page?: number } = {},
): string {
  const query = buildAdminReportQuery(filters, overrides).toString();
  return query === '' ? ADMIN_REPORTS_PATH : `${ADMIN_REPORTS_PATH}?${query}`;
}
