/**
 * View model THUẦN của thẻ ảnh chia sẻ 9:16 — FR-018, `docs/05 §14`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO CÓ FILE NÀY THAY VÌ TÍNH THẲNG TRONG COMPONENT
 * ─────────────────────────────────────────────────────────────────────────
 *  1. AGENTS.md §1.3 — component không được chứa business logic. Thẻ ảnh cũng
 *     là component, không có ngoại lệ.
 *  2. Satori **không có `-webkit-line-clamp`** (ISSUE-002). Việc cắt tuyến ở 2
 *     dòng và ghi chú ở 4 dòng vì vậy phải làm ở TẦNG DỮ LIỆU, trước khi render.
 *  3. Toàn bộ edge case bắt buộc của Phase 6 (tên 40+ ký tự, tuyến 300 ký tự,
 *     ghi chú 1000 ký tự, doanh thu 12 chữ số, achievement 4 chữ số, hai nhánh
 *     `target = 0`) kiểm được bằng unit test không cần render ảnh, không cần
 *     trình duyệt, không cần database.
 *
 *  Mọi con số đi qua `lib/kpi.ts` — file này KHÔNG tự tính `%` và KHÔNG tự ghép
 *  đơn vị (NFR-012, DEC-038).
 */
import {
  calculateAchievement,
  formatMetricValue,
  formatMetricValueCompact,
  type AchievementResult,
} from '@/lib/kpi';
import { formatVietnamDate } from '@/lib/date';
import { KPI_METRIC_ROWS, type KpiMetricSource } from '@/lib/reports/metric-rows';
import type { Database } from '@/types/database.types';

type DailyReportRow = Database['public']['Tables']['daily_reports']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

/**
 * Số ký tự tối đa của tuyến trước khi cắt — tương đương **2 dòng** ở cỡ chữ
 * 32px trên khung rộng 984px (1080 trừ hai lề 48px). Ước lượng theo bề rộng
 * trung bình ~0,52em của Inter rồi trừ biên an toàn, vì Satori không cắt hộ.
 */
export const MAX_SHARE_ROUTE_CHARS = 104;

/** Tương đương **4 dòng** ở cỡ chữ 30px, cùng cách ước lượng như trên. */
export const MAX_SHARE_NOTE_CHARS = 232;

/** Dấu báo "còn nữa" — cùng ký tự `…` mà font nhúng đã xác nhận có glyph. */
const ELLIPSIS = '…';

/** Đầu vào của thẻ ảnh: đúng những cột nó đọc, không hơn (NFR-002). */
export type ShareCardSource = KpiMetricSource &
  Pick<DailyReportRow, 'report_date' | 'planned_route' | 'actual_route' | 'evening_note'> & {
    readonly sales: Pick<ProfileRow, 'full_name' | 'employee_code'>;
  };

export type ShareCardMetricRow = {
  readonly label: string;
  /** Cam kết sáng, dạng RÚT GỌN cho vừa khung bảng (`docs/05 §14`). */
  readonly targetText: string;
  /** Thực đạt cuối ngày, cũng dạng rút gọn. */
  readonly actualText: string;
  /** Kết quả thô của `lib/kpi.ts`; component chỉ đọc `display` và `status`. */
  readonly achievement: AchievementResult;
};

export type ShareCardModel = {
  /** `'Thứ Sáu, 07/08/2026'`. */
  readonly dateText: string;
  /** Tên đã viết HOA theo thiết kế `docs/05 §14`. */
  readonly salesName: string;
  /** `null` khi Sales chưa có mã nhân viên — khi đó không render dòng đó. */
  readonly employeeCode: string | null;
  /** Tuyến THỰC TẾ, lùi về tuyến kế hoạch nếu cuối ngày không nhập lại. */
  readonly routeText: string | null;
  readonly metrics: readonly ShareCardMetricRow[];
  /** Doanh thu thực đạt dạng ĐẦY ĐỦ cho khối nhấn mạnh (`'125.000.000 ₫'`). */
  readonly revenueActualText: string;
  readonly noteText: string | null;
};

/**
 * Cắt chuỗi ở ranh giới TỪ, không cắt giữa một từ.
 *
 * Cắt giữa từ trên một tấm ảnh gửi cho khách trông như lỗi hiển thị, còn cắt ở
 * khoảng trắng thì đọc vẫn ra nghĩa. Nếu trong ngưỡng không có khoảng trắng nào
 * (một chuỗi dài liền mạch — đúng thứ mà `docs/05 §14` gọi là "tuyến 300 ký
 * tự"), đành cắt cứng: thà cụt còn hơn tràn ra ngoài khung.
 */
export function truncateText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;

  // `maxLength` đã tính cả dấu `…`, nên chỗ cho chữ chỉ còn `maxLength - 1`.
  const head = trimmed.slice(0, maxLength - 1);
  const lastSpace = head.lastIndexOf(' ');

  const cut = lastSpace > 0 ? head.slice(0, lastSpace) : head;

  return `${cut.trimEnd()}${ELLIPSIS}`;
}

/** Chuỗi rỗng / chỉ khoảng trắng được coi như KHÔNG có dữ liệu. */
function optionalText(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Dựng toàn bộ chuỗi hiển thị của thẻ ảnh từ một dòng `daily_reports`.
 *
 * Hàm này **thuần**: không đọc đồng hồ, không chạm mạng, không chạm database.
 * Nhờ vậy mọi edge case của Phase 6 là một lời gọi hàm trong unit test.
 */
export function buildShareCardModel(source: ShareCardSource): ShareCardModel {
  const metrics = KPI_METRIC_ROWS.map((row): ShareCardMetricRow => {
    const target = source[row.targetColumn];
    const actual = source[row.actualColumn];

    return {
      // `shortLabel` chứ không `label`: cột nhãn của thẻ ảnh có bề rộng CỐ ĐỊNH
      // và Satori không đo được chữ để tự thu nhỏ. Từ PHASE 13, hai nhãn đầy đủ
      // ("Doanh thu công nợ", "Khách hàng đã gặp") dài quá khung — DEC-050.
      label: row.shortLabel,
      targetText: formatMetricValueCompact(target, row.metric),
      actualText: formatMetricValueCompact(actual, row.metric),
      achievement: calculateAchievement(target, actual, row.metric),
    };
  });

  const route = optionalText(source.actual_route) ?? optionalText(source.planned_route);
  const note = optionalText(source.evening_note);

  return {
    dateText: formatVietnamDate(source.report_date),
    salesName: source.sales.full_name.trim().toLocaleUpperCase('vi-VN'),
    employeeCode: optionalText(source.sales.employee_code),
    routeText: route === null ? null : truncateText(route, MAX_SHARE_ROUTE_CHARS),
    metrics,
    revenueActualText: formatMetricValue(source.actual_revenue, 'REVENUE'),
    noteText: note === null ? null : truncateText(note, MAX_SHARE_NOTE_CHARS),
  };
}

/* ---------------------------------------------------------------------------
 * Tên file tải về — FR-019
 * ------------------------------------------------------------------------- */

/** `đ`/`Đ` KHÔNG tách được bằng NFD nên phải thay tay. */
const D_WITH_STROKE = /[đĐ]/g;
/** Dấu thanh và dấu phụ sau khi `normalize('NFD')` tách chúng ra khỏi nguyên âm. */
const COMBINING_MARKS = /[\u0300-\u036f]/g;
/** Mọi thứ không phải chữ cái ASCII hoặc chữ số đều thành dấu nối. */
const NON_ASCII_ALNUM = /[^A-Za-z0-9]+/g;

/** Dùng khi tên rỗng hoặc chỉ gồm ký tự bị loại bỏ hết — tên file vẫn phải hợp lệ. */
const FALLBACK_NAME_SLUG = 'Sales';

/**
 * `'Nguyễn Văn A'` → `'Nguyen-Van-A'`.
 *
 * Bỏ dấu là CỐ Ý (FR-019): tên file có dấu tiếng Việt bị mã hoá percent khi đi
 * qua header `Content-Disposition`, và hiển thị thành chuỗi rác trên một số máy
 * Android khi lưu về máy.
 */
export function asciiNameSlug(fullName: string): string {
  const slug = fullName
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(D_WITH_STROKE, (char) => (char === 'đ' ? 'd' : 'D'))
    .replace(NON_ASCII_ALNUM, '-')
    .replace(/^-+|-+$/g, '');

  return slug === '' ? FALLBACK_NAME_SLUG : slug;
}

/**
 * `'BikeForce_Report_Nguyen-Van-A_2026-08-07.png'` — FR-019, `docs/07 §4.1`.
 *
 * Ngày dùng NGUYÊN `report_date` dạng `YYYY-MM-DD`: tên file phải sắp xếp được
 * theo thứ tự thời gian khi Sales lưu nhiều ảnh vào cùng một thư mục.
 */
export function shareImageFileName(fullName: string, reportDate: string): string {
  return `BikeForce_Report_${asciiNameSlug(fullName)}_${reportDate}.png`;
}

/**
 * URL của Route Handler ảnh — nơi DUY NHẤT ghép đường dẫn này, để nút chia sẻ
 * và mọi test đều trỏ về cùng một chỗ nếu route đổi tên (cùng tinh thần với
 * hằng số đường dẫn ở `lib/reports/today-cta.ts`).
 */
export function shareImagePath(reportId: string): string {
  return `/api/reports/${reportId}/share-image`;
}
