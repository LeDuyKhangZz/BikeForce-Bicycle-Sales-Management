/**
 * View model cho khối "Báo cáo nhân viên" (Tổng quan tháng + Lịch tháng) trên
 * `/admin/reports` khi Admin chọn một nhân viên cụ thể.
 *
 * AGENTS.md §1.3: toàn bộ phép đếm số ngày Đủ báo cáo / Đã cam kết / Chưa báo
 * cáo và dựng lưới ngày trong tháng nằm ở hàm thuần tại `lib/`, không nằm trong
 * `.tsx`.
 */
import { formatVietnamMonth, getVietnamCurrentMonth, getVietnamMonthRange } from '@/lib/date';
import type { Database } from '@/types/database.types';

type ReportStatus = Database['public']['Enums']['report_status'];

export type EmployeeMonthReportSource = {
  id: string;
  report_date: string;
  status: ReportStatus;
};

export type CalendarDayStatus = 'COMPLETED' | 'MORNING_SUBMITTED' | 'NONE';

export type EmployeeCalendarDay = {
  day: number;
  date: string;
  /** Chỉ số cột thứ trong tuần theo chuẩn Thứ Hai đầu tuần (`0 = T2` .. `6 = CN`). */
  weekdayIndex: number;
  status: CalendarDayStatus;
  reportId: string | null;
};

export type EmployeeMonthOverview = {
  month: string;
  monthTitleLabel: string;
  overviewHeading: string;
  totalDays: number;
  /** Số ô trống đầu tháng trước ngày 1 để ngày 1 khớp đúng cột thứ (`T2..CN`). */
  leadingEmptyDays: number;
  completedDays: number;
  committedDays: number;
  unreportedDays: number;
  completedRatio: number;
  days: readonly EmployeeCalendarDay[];
};

export const CALENDAR_WEEKDAY_HEADERS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

/**
 * Đổi năm/tháng/ngày lịch sang chỉ số cột thứ theo chuẩn Thứ Hai đầu tuần:
 * `T2 = 0, T3 = 1, T4 = 2, T5 = 3, T6 = 4, T7 = 5, CN = 6`.
 * Dùng `Date.UTC` để độc lập hoàn toàn với múi giờ máy chạy.
 */
export function getMondayFirstWeekdayIndex(year: number, month: number, day: number): number {
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (utcDay + 6) % 7;
}

export function buildEmployeeMonthOverview(
  requestedMonth: string,
  reports: readonly EmployeeMonthReportSource[],
): EmployeeMonthOverview {
  const validRange = getVietnamMonthRange(requestedMonth);
  const fallbackMonth = getVietnamCurrentMonth();
  const month = validRange !== null ? requestedMonth : fallbackMonth;
  const range = validRange ?? getVietnamMonthRange(fallbackMonth);

  const totalDays = range !== null ? Number(range.to.slice(8, 10)) : 30;
  const [yearPart, monthPart] = month.split('-') as [string, string];
  const yearNum = Number(yearPart);
  const monthNum = Number(monthPart);
  const leadingEmptyDays = getMondayFirstWeekdayIndex(yearNum, monthNum, 1);

  const reportByDate = new Map<string, EmployeeMonthReportSource>();
  for (const report of reports) {
    if (report.report_date.startsWith(`${month}-`)) {
      reportByDate.set(report.report_date, report);
    }
  }

  let completedDays = 0;
  let committedDays = 0;
  const days: EmployeeCalendarDay[] = [];

  for (let day = 1; day <= totalDays; day += 1) {
    const date = `${month}-${String(day).padStart(2, '0')}`;
    const weekdayIndex = (leadingEmptyDays + day - 1) % 7;
    const report = reportByDate.get(date);

    if (report?.status === 'COMPLETED') {
      completedDays += 1;
      days.push({ day, date, weekdayIndex, status: 'COMPLETED', reportId: report.id });
    } else if (report?.status === 'MORNING_SUBMITTED') {
      committedDays += 1;
      days.push({ day, date, weekdayIndex, status: 'MORNING_SUBMITTED', reportId: report.id });
    } else {
      days.push({ day, date, weekdayIndex, status: 'NONE', reportId: null });
    }
  }

  const unreportedDays = Math.max(0, totalDays - completedDays - committedDays);
  const completedRatio = totalDays > 0 ? Math.min(1, Math.max(0, completedDays / totalDays)) : 0;

  return {
    month,
    monthTitleLabel: formatVietnamMonth(month),
    overviewHeading: `Tổng quan tháng ${monthPart}/${yearPart}`,
    totalDays,
    leadingEmptyDays,
    completedDays,
    committedDays,
    unreportedDays,
    completedRatio,
    days,
  };
}
