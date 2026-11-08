import { describe, expect, it } from 'vitest';

import {
  buildEmployeeMonthOverview,
  CALENDAR_WEEKDAY_HEADERS,
  type EmployeeMonthReportSource,
  getMondayFirstWeekdayIndex,
} from './employee-month-overview';

describe('buildEmployeeMonthOverview', () => {
  it('đếm đúng số ngày Đủ báo cáo, Đã cam kết, Chưa báo cáo trong tháng 31 ngày', () => {
    const reports: EmployeeMonthReportSource[] = [
      ...Array.from({ length: 20 }, (_, index) => ({
        id: `completed-${index + 1}`,
        report_date: `2026-10-${String(index + 1).padStart(2, '0')}`,
        status: 'COMPLETED' as const,
      })),
      ...Array.from({ length: 4 }, (_, index) => ({
        id: `committed-${index + 1}`,
        report_date: `2026-10-${String(index + 21).padStart(2, '0')}`,
        status: 'MORNING_SUBMITTED' as const,
      })),
    ];

    const overview = buildEmployeeMonthOverview('2026-10', reports);

    expect(overview.month).toBe('2026-10');
    expect(overview.monthTitleLabel).toBe('Tháng 10/2026');
    expect(overview.overviewHeading).toBe('Tổng quan tháng 10/2026');
    expect(overview.totalDays).toBe(31);
    expect(overview.leadingEmptyDays).toBe(3);
    expect(overview.completedDays).toBe(20);
    expect(overview.committedDays).toBe(4);
    expect(overview.unreportedDays).toBe(7);
    expect(overview.completedDays + overview.committedDays + overview.unreportedDays).toBe(31);
    expect(overview.days).toHaveLength(31);
    expect(overview.days[0]).toEqual({
      day: 1,
      date: '2026-10-01',
      weekdayIndex: 3,
      status: 'COMPLETED',
      reportId: 'completed-1',
    });
    expect(overview.days[20]).toEqual({
      day: 21,
      date: '2026-10-21',
      weekdayIndex: 2,
      status: 'MORNING_SUBMITTED',
      reportId: 'committed-1',
    });
    expect(overview.days[30]).toEqual({
      day: 31,
      date: '2026-10-31',
      weekdayIndex: 5,
      status: 'NONE',
      reportId: null,
    });
  });

  it('căn đúng thứ trong tuần (T2..CN) cho tháng 10/2026 và các tháng khác', () => {
    const oct2026 = buildEmployeeMonthOverview('2026-10', []);

    // 01/10/2026 là Thứ Năm (T5 -> cột index 3), nên cần 3 ô trống đầu tháng (T2, T3, T4)
    expect(oct2026.leadingEmptyDays).toBe(3);
    expect(CALENDAR_WEEKDAY_HEADERS[oct2026.days[0]!.weekdayIndex]).toBe('T5');

    // Các ngày 4, 11, 18, 25/10/2026 đều là Chủ Nhật (CN -> cột index 6)
    for (const sundayDay of [4, 11, 18, 25]) {
      const cell = oct2026.days[sundayDay - 1]!;
      expect(cell.day).toBe(sundayDay);
      expect(CALENDAR_WEEKDAY_HEADERS[cell.weekdayIndex]).toBe('CN');
      expect((oct2026.leadingEmptyDays + (sundayDay - 1)) % 7).toBe(6);
    }

    // 01/11/2026 là Chủ Nhật (CN -> cột index 6, có 6 ô trống T2..T7 trước ngày 1)
    const nov2026 = buildEmployeeMonthOverview('2026-11', []);
    expect(nov2026.leadingEmptyDays).toBe(6);
    expect(CALENDAR_WEEKDAY_HEADERS[nov2026.days[0]!.weekdayIndex]).toBe('CN');

    // 01/06/2026 là Thứ Hai (T2 -> cột index 0, không có ô trống đầu tháng)
    const jun2026 = buildEmployeeMonthOverview('2026-06', []);
    expect(jun2026.leadingEmptyDays).toBe(0);
    expect(CALENDAR_WEEKDAY_HEADERS[jun2026.days[0]!.weekdayIndex]).toBe('T2');

    expect(getMondayFirstWeekdayIndex(2026, 10, 1)).toBe(3);
    expect(getMondayFirstWeekdayIndex(2026, 10, 4)).toBe(6);
  });

  it('tháng 2 năm nhuận có 29 ngày', () => {
    const overview = buildEmployeeMonthOverview('2028-02', []);

    expect(overview.totalDays).toBe(29);
    expect(overview.leadingEmptyDays).toBe(1); // 01/02/2028 là Thứ Ba (T3)
    expect(overview.unreportedDays).toBe(29);
    expect(overview.completedDays).toBe(0);
    expect(overview.committedDays).toBe(0);
    expect(overview.completedRatio).toBe(0);
  });
});
