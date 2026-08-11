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
 *      `date` → `from`+`to` → `month` → `period=all` → tháng hiện tại
 *  Lý do: người dùng vừa bấm một ngày cụ thể thì đó là ý định mới nhất; giữ
 *  `month` cũ sẽ ra một kết quả rộng hơn thứ họ vừa chọn.
 */
import {
  formatVietnamDate,
  formatVietnamMonth,
  getVietnamCurrentMonth,
  getVietnamMonthRange,
  isValidVietnamDate,
  shiftVietnamMonth,
} from '@/lib/date';
import { REPORT_STATUS_LABEL } from '@/lib/reports/report-status';
import type { Database } from '@/types/database.types';

type ReportStatus = Database['public']['Enums']['report_status'];

export const ADMIN_REPORT_PARAMS = {
  DATE: 'date',
  FROM: 'from',
  TO: 'to',
  MONTH: 'month',
  PERIOD: 'period',
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
  period?: 'all';
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
  dateMode: 'DAY' | 'RANGE' | 'MONTH' | 'ALL' | 'CURRENT_MONTH';
  /** Giá trị đã chuẩn hoá, để render lại đúng vào ô nhập. */
  raw: {
    date: string | null;
    from: string | null;
    to: string | null;
    month: string | null;
    period: 'all' | null;
  };
};

export type AdminReportFilterKey = 'TIME' | 'SALES' | 'STATUS' | 'SEARCH';

export type AdminReportFilterSummary = {
  key: AdminReportFilterKey;
  label: string;
  removable: boolean;
};

export type AdminReportMonthNavigation = {
  label: string;
  previousHref: string;
  nextHref: string | null;
  currentHref: string;
  isCurrentMonth: boolean;
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
      raw: { date: params.date, from: null, to: null, month: null, period: null },
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
      raw: { date: null, from, to, month: null, period: null },
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
        raw: { date: null, from: null, to: null, month: params.month, period: null },
      };
    }
  }

  // 4) Toàn bộ lịch sử chỉ khi người dùng chọn tường minh. `getAdminReports`
  //    vẫn phân trang nên đây KHÔNG phải "trả về toàn bộ bảng" (AGENTS.md §5).
  if (params.period === 'all') {
    return {
      ...base,
      range: null,
      dateMode: 'ALL',
      raw: { date: null, from: null, to: null, month: null, period: 'all' },
    };
  }

  // 5) Không có chiều thời gian hợp lệ → tháng hiện tại theo giờ Việt Nam.
  //    Đây là mặc định an toàn cho một bảng tăng mãi theo năm (DEC-066).
  const currentMonth = getVietnamCurrentMonth();
  const currentRange = getVietnamMonthRange(currentMonth);

  return {
    ...base,
    range: currentRange ?? { from: `${currentMonth}-01`, to: `${currentMonth}-01` },
    dateMode: 'CURRENT_MONTH',
    raw: { date: null, from: null, to: null, month: currentMonth, period: null },
  };
}

/** `true` khi có ít nhất một điều kiện ngoài mặc định tháng hiện tại. */
export function hasActiveFilters(filters: AdminReportFilters): boolean {
  return (
    filters.dateMode !== 'CURRENT_MONTH' ||
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
  // Tháng hiện tại là mặc định canonical của `/admin/reports`, nên không cần
  // ghi lên URL. Tháng do người dùng chọn thì phải giữ để deep-link chính xác.
  if (filters.raw.month && filters.dateMode === 'MONTH') {
    search.set(ADMIN_REPORT_PARAMS.MONTH, filters.raw.month);
  }
  if (filters.raw.period) search.set(ADMIN_REPORT_PARAMS.PERIOD, filters.raw.period);
  if (filters.salesId) search.set(ADMIN_REPORT_PARAMS.SALES, filters.salesId);
  if (filters.status) search.set(ADMIN_REPORT_PARAMS.STATUS, filters.status);
  if (filters.search) search.set(ADMIN_REPORT_PARAMS.SEARCH, filters.search);
  // `page=1` được lược bỏ: đó là mặc định (cùng quy ước `salesHistoryPath`).
  if (overrides.page !== undefined && overrides.page > 1) {
    search.set(ADMIN_REPORT_PARAMS.PAGE, String(overrides.page));
  }

  return search;
}

function removeTimeParams(search: URLSearchParams): void {
  search.delete(ADMIN_REPORT_PARAMS.DATE);
  search.delete(ADMIN_REPORT_PARAMS.FROM);
  search.delete(ADMIN_REPORT_PARAMS.TO);
  search.delete(ADMIN_REPORT_PARAMS.MONTH);
  search.delete(ADMIN_REPORT_PARAMS.PERIOD);
  search.delete(ADMIN_REPORT_PARAMS.PAGE);
}

/** Giữ mọi bộ lọc khác và chuyển thẳng sang một tháng cụ thể. */
export function adminReportsMonthPath(filters: AdminReportFilters, month: string): string {
  const range = getVietnamMonthRange(month);
  if (range === null) return adminReportsPath(filters);

  const search = buildAdminReportQuery(filters);
  removeTimeParams(search);
  search.set(ADMIN_REPORT_PARAMS.MONTH, month);

  return `${ADMIN_REPORTS_PATH}?${search.toString()}`;
}

/** Giữ mọi bộ lọc khác và mở toàn bộ lịch sử một cách tường minh. */
export function adminReportsAllTimePath(filters: AdminReportFilters): string {
  const search = buildAdminReportQuery(filters);
  removeTimeParams(search);
  search.set(ADMIN_REPORT_PARAMS.PERIOD, 'all');

  return `${ADMIN_REPORTS_PATH}?${search.toString()}`;
}

/** Bỏ đúng một chip, giữ nguyên các điều kiện còn lại và quay về trang 1. */
export function adminReportsPathWithoutFilter(
  filters: AdminReportFilters,
  key: AdminReportFilterKey,
): string {
  const search = buildAdminReportQuery(filters);
  search.delete(ADMIN_REPORT_PARAMS.PAGE);

  if (key === 'TIME') removeTimeParams(search);
  if (key === 'SALES') search.delete(ADMIN_REPORT_PARAMS.SALES);
  if (key === 'STATUS') search.delete(ADMIN_REPORT_PARAMS.STATUS);
  if (key === 'SEARCH') search.delete(ADMIN_REPORT_PARAMS.SEARCH);

  const query = search.toString();
  return query === '' ? ADMIN_REPORTS_PATH : `${ADMIN_REPORTS_PATH}?${query}`;
}

/** Số điều kiện ngoài mặc định "tháng hiện tại", dùng cho nhãn bộ lọc nâng cao. */
export function countActiveAdminReportFilters(filters: AdminReportFilters): number {
  return (
    (filters.dateMode === 'CURRENT_MONTH' ? 0 : 1) +
    (filters.salesId === null ? 0 : 1) +
    (filters.status === null ? 0 : 1) +
    (filters.search === null ? 0 : 1)
  );
}

/** Chuỗi tóm tắt đã sẵn sàng render; component không tự format ngày/trạng thái. */
export function buildAdminReportFilterSummaries(
  filters: AdminReportFilters,
  salesName: string | null,
): AdminReportFilterSummary[] {
  let timeLabel: string;

  if (filters.dateMode === 'DAY' && filters.raw.date !== null) {
    timeLabel = formatVietnamDate(filters.raw.date);
  } else if (
    filters.dateMode === 'RANGE' &&
    filters.raw.from !== null &&
    filters.raw.to !== null
  ) {
    timeLabel = `${formatVietnamDate(filters.raw.from)} → ${formatVietnamDate(filters.raw.to)}`;
  } else if (filters.dateMode === 'ALL') {
    timeLabel = 'Tất cả thời gian';
  } else {
    timeLabel = formatVietnamMonth(filters.raw.month ?? getVietnamCurrentMonth());
  }

  const summaries: AdminReportFilterSummary[] = [
    { key: 'TIME', label: timeLabel, removable: filters.dateMode !== 'CURRENT_MONTH' },
  ];

  if (filters.salesId !== null) {
    summaries.push({ key: 'SALES', label: salesName ?? 'Nhân viên đã chọn', removable: true });
  }
  if (filters.status !== null) {
    summaries.push({ key: 'STATUS', label: REPORT_STATUS_LABEL[filters.status], removable: true });
  }
  if (filters.search !== null) {
    summaries.push({ key: 'SEARCH', label: `Tên chứa “${filters.search}”`, removable: true });
  }

  return summaries;
}

/** Điều hướng tháng nhanh, không cho đi tới tháng tương lai. */
export function buildAdminReportMonthNavigation(
  filters: AdminReportFilters,
): AdminReportMonthNavigation {
  const currentMonth = getVietnamCurrentMonth();
  const anchorMonth =
    filters.dateMode === 'MONTH' || filters.dateMode === 'CURRENT_MONTH'
      ? (filters.raw.month ?? currentMonth)
      : currentMonth;
  const previousMonth = shiftVietnamMonth(anchorMonth, -1) ?? currentMonth;
  const nextMonth = shiftVietnamMonth(anchorMonth, 1);

  return {
    label: formatVietnamMonth(anchorMonth),
    previousHref: adminReportsMonthPath(filters, previousMonth),
    nextHref:
      nextMonth !== null && nextMonth <= currentMonth
        ? adminReportsMonthPath(filters, nextMonth)
        : null,
    currentHref: adminReportsMonthPath(filters, currentMonth),
    isCurrentMonth: anchorMonth === currentMonth,
  };
}

export function adminReportsPath(
  filters: AdminReportFilters,
  overrides: { page?: number } = {},
): string {
  const query = buildAdminReportQuery(filters, overrides).toString();
  return query === '' ? ADMIN_REPORTS_PATH : `${ADMIN_REPORTS_PATH}?${query}`;
}
