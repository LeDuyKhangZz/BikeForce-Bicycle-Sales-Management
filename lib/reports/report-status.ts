/**
 * Từ vựng hiển thị của `daily_reports.status` — nguồn DUY NHẤT.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO TÁCH RA (Phase 7)
 * ─────────────────────────────────────────────────────────────────────────
 *  `lib/reports/today-cta.ts` (Phase 3) đã dựng nhãn "Đã cam kết" / "Đã hoàn
 *  thành" cho dashboard hôm nay. Phase 7 cần **đúng hai chữ đó** ở danh sách
 *  lịch sử và ở màn hình chi tiết, Phase 8/9 sẽ cần lần thứ ba ở màn hình
 *  Admin. Ba bản sao của cùng một cặp chuỗi là cách chắc chắn nhất để một ngày
 *  nào đó chỉ một nơi được sửa (AGENTS.md §9).
 *
 *  `today-cta.ts` vẫn giữ phần **mô tả theo ngữ cảnh hôm nay** ("Cuối ngày hãy
 *  nhập kết quả thực đạt") — câu đó chỉ đúng ở dashboard, không đúng khi nhìn
 *  lại một báo cáo của tháng trước.
 */
import type { Database } from '@/types/database.types';

type ReportStatus = Database['public']['Enums']['report_status'];

/** Tone của `components/ui/badge` — từ vựng TRÌNH BÀY, không phải nghiệp vụ. */
export type ReportStatusTone = 'info' | 'success';

/** BR-008 — vòng đời chỉ có hai trạng thái persist (DEC-020). */
export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  MORNING_SUBMITTED: 'Đã cam kết',
  COMPLETED: 'Đã hoàn thành',
};

export const REPORT_STATUS_TONE: Record<ReportStatus, ReportStatusTone> = {
  MORNING_SUBMITTED: 'info',
  COMPLETED: 'success',
};
