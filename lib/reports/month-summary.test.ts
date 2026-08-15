/**
 * Unit test cho `lib/reports/month-summary.ts` — PHASE 17, DEC-068.
 *
 * Ba con số của cụm lũy kế trên thẻ ảnh 9:16. Vế đáng kiểm nhất là **"số ngày
 * đạt KPI"**: nó là BR-024 áp lên bốn kết quả `calculateAchievement()`, nên mọi
 * ca biên của BR-015 (`target = 0`) và của báo cáo chưa hoàn tất đều đi qua đây.
 *
 * ⚠ Ký tự trước `₫` ở các test khác là NO-BREAK SPACE — file này chỉ so SỐ, chưa
 * format, nên không dính bẫy đó (docs/08 §3.3).
 */
import { describe, expect, it } from 'vitest';

import { EMPTY_MONTH_SUMMARY, summarizeMonthToDate, type MonthToDateRow } from './month-summary';

/** Một ngày đạt đủ cả 4 chỉ tiêu — mọi test chỉ ghi đè trường nó quan tâm. */
const ACHIEVED_DAY: MonthToDateRow = {
  target_visit_points: 10,
  target_sales_amount: 10_000_000,
  target_revenue: 5_000_000,
  target_customer_visits: 10,
  actual_visit_points: 10,
  actual_sales_amount: 12_000_000,
  actual_revenue: 6_000_000,
  actual_customer_visits: 11,
};

function day(overrides: Partial<MonthToDateRow> = {}): MonthToDateRow {
  return { ...ACHIEVED_DAY, ...overrides };
}

describe('summarizeMonthToDate — hai tổng tiền', () => {
  it('cộng THỰC ĐẠT, không cộng cam kết (người dùng chốt 2026-08-14)', () => {
    const summary = summarizeMonthToDate([day(), day()]);

    expect(summary.salesAmount).toBe(24_000_000);
    expect(summary.revenue).toBe(12_000_000);
  });

  it('ngày mới có cam kết sáng đóng góp 0, KHÔNG phải NaN', () => {
    const summary = summarizeMonthToDate([
      day(),
      day({ actual_sales_amount: null, actual_revenue: null, actual_customer_visits: null, actual_visit_points: null }),
    ]);

    expect(summary.salesAmount).toBe(12_000_000);
    expect(summary.revenue).toBe(6_000_000);
    expect(Number.isNaN(summary.salesAmount)).toBe(false);
  });

  it('mảng rỗng cho ra đúng EMPTY_MONTH_SUMMARY — tháng chưa có ngày nào', () => {
    expect(summarizeMonthToDate([])).toEqual(EMPTY_MONTH_SUMMARY);
  });

  it('31 ngày ở trần BR-017 vẫn nằm trong dải số nguyên an toàn của JS', () => {
    const rows = Array.from({ length: 31 }, () =>
      day({ actual_sales_amount: 100_000_000_000, actual_revenue: 100_000_000_000 }),
    );
    const summary = summarizeMonthToDate(rows);

    expect(summary.salesAmount).toBe(3_100_000_000_000);
    expect(Number.isSafeInteger(summary.salesAmount)).toBe(true);
  });
});

describe('summarizeMonthToDate — số ngày đạt KPI (BR-024)', () => {
  it('đếm ngày đạt CẢ BỐN chỉ tiêu, không phải số ngày đã báo cáo', () => {
    const summary = summarizeMonthToDate([
      day(),
      // Thiếu đúng một chỉ tiêu ⇒ ngày này KHÔNG đạt.
      day({ actual_customer_visits: 3 }),
      day(),
    ]);

    expect(summary.kpiAchievedDays).toBe(2);
    expect(summary.reportedDays).toBe(3);
  });

  it('ngày mới có cam kết sáng KHÔNG được tính là đạt — chưa có số liệu', () => {
    const summary = summarizeMonthToDate([
      day({
        actual_visit_points: null,
        actual_sales_amount: null,
        actual_revenue: null,
        actual_customer_visits: null,
      }),
    ]);

    expect(summary.kpiAchievedDays).toBe(0);
    expect(summary.reportedDays).toBe(1);
  });

  it('BR-015 nhánh 1 — cam kết 0 và thực đạt 0 vẫn là ĐẠT (100,0%)', () => {
    const summary = summarizeMonthToDate([
      day({ target_sales_amount: 0, actual_sales_amount: 0 }),
    ]);

    expect(summary.kpiAchievedDays).toBe(1);
  });

  it('BR-015 nhánh 2 — cam kết 0 mà vẫn làm được thì là vượt kế hoạch, tính ĐẠT', () => {
    const summary = summarizeMonthToDate([
      day({ target_revenue: 0, actual_revenue: 3_000_000 }),
    ]);

    expect(summary.kpiAchievedDays).toBe(1);
  });

  it('99,99% là GẦN ĐẠT chứ không phải đạt — ngưỡng BR-023 xét trên số chưa làm tròn', () => {
    const summary = summarizeMonthToDate([
      day({ target_visit_points: 10_000, actual_visit_points: 9_999 }),
    ]);

    expect(summary.kpiAchievedDays).toBe(0);
  });

  it('báo cáo trước migration 0008 mang null ở cam kết doanh số → không tính đạt (DEC-050)', () => {
    const summary = summarizeMonthToDate([day({ target_sales_amount: null })]);

    expect(summary.kpiAchievedDays).toBe(0);
    // Tổng tiền vẫn cộng bình thường: thực đạt của ngày đó là số thật.
    expect(summary.salesAmount).toBe(12_000_000);
  });
});
