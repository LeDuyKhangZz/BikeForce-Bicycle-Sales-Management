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

export type TodayCtaKey =
  | 'CREATE_MORNING'
  | 'EDIT_MORNING'
  | 'COMPLETE_EVENING'
  | 'VIEW_REPORT';

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
   * BR-002 / FR-017 — chỉ `true` khi báo cáo đã persist với `status = 'COMPLETED'`.
   * KHÔNG BAO GIỜ suy ra từ trạng thái form phía client.
   */
  canExportImage: boolean;
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
      canExportImage: false,
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
      // UC-05, FR-012, BR-019 — sửa được cho tới khi báo cáo COMPLETED.
      secondaryCta: {
        key: 'EDIT_MORNING',
        label: 'Sửa cam kết sáng',
        href: MORNING_REPORT_PATH,
      },
      canExportImage: false,
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
    canExportImage: true,
  };
}

/**
 * Form đầu ngày có mở được không (UC-04 tạo mới, UC-05 sửa).
 *
 * `COMPLETED` → **không**: BR-019 khoá vĩnh viễn, và policy
 * `reports_update_own_open` yêu cầu `OLD.status = 'MORNING_SUBMITTED'` nên
 * UPDATE sẽ trả về 0 row. Chặn ngay ở tầng route để người dùng nhận một câu
 * giải thích thay vì một lỗi lưu khó hiểu.
 */
export function canOpenMorningForm(report: TodayReportRef | null): boolean {
  return report === null || report.status === 'MORNING_SUBMITTED';
}
