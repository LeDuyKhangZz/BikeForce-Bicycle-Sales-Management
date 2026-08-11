/**
 * Quyết định "hôm nay Sales nhìn thấy gì" — dưới dạng HÀM THUẦN.
 *
 * Đây là điểm quyết định trung tâm của toàn bộ trải nghiệm Sales
 * (`docs/03-workflow.md §3`), nên nó **không được** nằm rải rác trong JSX.
 * AGENTS.md §1.3: business logic không bao giờ nằm trong component. Nhờ tách ra
 * đây, ba trạng thái của FR-007 kiểm được bằng unit test không cần database,
 * không cần trình duyệt.
 *
 * Nguồn: `docs/03-workflow.md §3.2` (bảng ba trạng thái) · FR-007 · BR-002.
 */
import { REPORT_STATUS_LABEL, REPORT_STATUS_TONE } from '@/lib/reports/report-status';
import { shareCardVariantForStatus, type ShareCardVariant } from '@/lib/reports/share-card';
import type { Database } from '@/types/database.types';

type ReportStatus = Database['public']['Enums']['report_status'];

export const MORNING_REPORT_PATH = '/sales/today/morning';
export const EVENING_REPORT_PATH = '/sales/today/evening';
export const SALES_TODAY_PATH = '/sales/today';

/** Đường dẫn chi tiết một báo cáo của chính Sales (FR-022 — Phase 7). */
export function salesReportPath(reportId: string): string {
  return `/sales/reports/${reportId}`;
}

/** Ba trạng thái của dashboard, suy ra từ `daily_reports.status` (BR-008). */
export type TodayReportState = 'NO_REPORT' | 'MORNING_SUBMITTED' | 'COMPLETED';

/**
 * ⚠ `EDIT_MORNING` đã bị GỠ ở PHASE 14 (**DEC-055**). Cam kết sáng nay khoá ngay
 * khi gửi: không còn nút "Sửa cam kết sáng", và `/sales/today/morning` từ chối
 * mở khi hôm nay đã có báo cáo. Đừng thêm lại khoá này mà không có DEC mới.
 */
export type TodayCtaKey = 'CREATE_MORNING' | 'COMPLETE_EVENING' | 'VIEW_REPORT';

export type TodayCta = {
  key: TodayCtaKey;
  label: string;
  href: string;
};

export type TodayView = {
  state: TodayReportState;
  /** Nhãn trạng thái hiển thị cho người dùng. */
  statusLabel: string;
  /** Tone của `components/ui/badge` — từ vựng TRÌNH BÀY, không phải nghiệp vụ. */
  statusTone: 'neutral' | 'info' | 'success';
  /** Câu giải thích ngắn đi kèm nhãn trạng thái. */
  statusDescription: string;
  /** ĐÚNG MỘT CTA chính — không bao giờ hiển thị hai CTA chính cùng lúc. */
  primaryCta: TodayCta;
  secondaryCta: TodayCta | null;
  /**
   * Tấm ảnh 9:16 nào đang xuất được — `null` khi chưa có gì để xuất.
   *
   * ⚠ **PHASE 14 — DEC-058 thay trường boolean `canExportImage` cũ.** Nay Sales
   * gửi Zalo **hai lần một ngày**: `'MORNING'` ngay sau khi cam kết, `'EVENING'`
   * sau khi hoàn tất. BR-002 vẫn giữ phần cốt lõi: giá trị này suy ra từ `status`
   * **đã persist**, KHÔNG BAO GIỜ từ trạng thái form phía client.
   */
  shareImageVariant: ShareCardVariant | null;
};

/** Tham chiếu tối thiểu tới báo cáo hôm nay — chỉ cần `id` và `status`. */
export type TodayReportRef = {
  id: string;
  status: ReportStatus;
};

/**
 * `report = null` nghĩa là hôm nay chưa có dòng nào trong `daily_reports` —
 * KHÔNG phải "lỗi truy vấn". Hai tình huống đó được phân biệt ở tầng gọi:
 * service trả `null` cho cả hai, còn lỗi thật đã được log ở đó (NFR-014).
 */
export function getTodayView(report: TodayReportRef | null): TodayView {
  if (report === null) {
    return {
      state: 'NO_REPORT',
      statusLabel: 'Chưa báo cáo',
      statusTone: 'neutral',
      statusDescription: 'Hôm nay bạn chưa tạo báo cáo đầu ngày.',
      primaryCta: {
        key: 'CREATE_MORNING',
        label: 'Tạo báo cáo đầu ngày',
        href: MORNING_REPORT_PATH,
      },
      secondaryCta: null,
      // Chưa có dòng nào trong database ⇒ không có gì để vẽ lên ảnh (BR-002).
      shareImageVariant: null,
    };
  }

  if (report.status === 'MORNING_SUBMITTED') {
    return {
      state: 'MORNING_SUBMITTED',
      // Nhãn dùng chung với danh sách lịch sử và màn hình Admin — một nguồn.
      statusLabel: REPORT_STATUS_LABEL.MORNING_SUBMITTED,
      statusTone: REPORT_STATUS_TONE.MORNING_SUBMITTED,
      statusDescription: 'Đã gửi cam kết đầu ngày. Cuối ngày hãy nhập kết quả thực đạt.',
      primaryCta: {
        key: 'COMPLETE_EVENING',
        label: 'Hoàn thành báo cáo cuối ngày',
        href: EVENING_REPORT_PATH,
      },
      // PHASE 14 (DEC-055) — KHÔNG còn CTA phụ "Sửa cam kết sáng". Cam kết sáng
      // là một lời hứa đã gửi đi; sửa được nó sau khi biết mình đang thắng hay
      // thua làm hỏng ý nghĩa của cả bản đối chiếu cuối ngày.
      secondaryCta: null,
      // PHASE 14 (DEC-058) — chỗ của nút cũ nay là "Lưu hình báo cáo đầu ngày".
      shareImageVariant: shareCardVariantForStatus(report.status),
    };
  }

  return {
    state: 'COMPLETED',
    statusLabel: REPORT_STATUS_LABEL.COMPLETED,
    statusTone: REPORT_STATUS_TONE.COMPLETED,
    statusDescription: 'Báo cáo hôm nay đã hoàn tất và được khoá lại.',
    primaryCta: {
      key: 'VIEW_REPORT',
      label: 'Xem báo cáo hôm nay',
      href: salesReportPath(report.id),
    },
    secondaryCta: null,
    shareImageVariant: shareCardVariantForStatus(report.status),
  };
}

/**
 * Form đầu ngày có mở được không — nay CHỈ còn UC-04 (tạo mới).
 *
 * ⚠ **PHASE 14 — DEC-055.** Trước đây hàm này còn trả `true` cho
 * `MORNING_SUBMITTED` để phục vụ UC-05 (sửa cam kết sáng). UC-05 đã bị gỡ khỏi
 * v1 theo yêu cầu trực tiếp của người dùng, nên điều kiện rút về đúng một vế:
 * **hôm nay chưa có báo cáo nào**.
 *
 * Giữ nguyên hàm thay vì để route tự viết `report === null`: đây vẫn là nơi DUY
 * NHẤT trả lời câu hỏi "mở form sáng được không", và nó có unit test riêng.
 */
export function canOpenMorningForm(report: TodayReportRef | null): boolean {
  return report === null;
}
