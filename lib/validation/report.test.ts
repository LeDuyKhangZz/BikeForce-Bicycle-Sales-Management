/**
 * Unit test cho `lib/validation/report.ts` — bảng case lấy từ `docs/08 §3.6`.
 *
 * Master Spec §25 cấm: số âm, invalid date, `NaN`, `Infinity`, invalid revenue,
 * duplicate report. **Duplicate report được gác ở DB** (BR-001) nên nó nằm ở
 * `tests/integration/daily-reports.constraints.test.ts`, không ở tầng này.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MAX_REVENUE_VND,
  MAX_ROUTE_LENGTH,
  morningReportSchema,
  reportDateSchema,
} from './report';

afterEach(() => {
  vi.useRealTimers();
});

/** Payload hợp lệ tối thiểu; từng case chỉ ghi đè đúng field đang kiểm. */
function validMorningInput(overrides: Record<string, unknown> = {}) {
  return {
    planned_route: 'Quận 1 → Quận 3 → Bình Thạnh',
    visit_purpose: 'Chào hàng dòng xe city 2026',
    target_visit_points: 8,
    target_sales_quantity: 5,
    target_revenue: 150_000_000,
    target_customer_visits: 12,
    ...overrides,
  };
}

describe('morningReportSchema — miền giá trị số (BR-006, BR-017)', () => {
  it.each([
    ['số âm ở target_sales_quantity', 'target_sales_quantity', -1],
    ['số âm ở target_revenue', 'target_revenue', -1],
    ['số âm ở target_visit_points', 'target_visit_points', -1],
    ['NaN', 'target_revenue', Number.NaN],
    ['Infinity', 'target_revenue', Number.POSITIVE_INFINITY],
    ['-Infinity', 'target_revenue', Number.NEGATIVE_INFINITY],
    ['số thập phân ở cột integer', 'target_sales_quantity', 1.5],
    ['chuỗi rác ở cột số', 'target_revenue', 'abc'],
    ['chuỗi số lẫn chữ', 'target_revenue', '12abc'],
    ['ký hiệu khoa học', 'target_revenue', '1e9'],
    ['doanh thu vượt trần BR-017', 'target_revenue', MAX_REVENUE_VND + 1],
    ['target_sales_quantity > 10000', 'target_sales_quantity', 10_001],
    ['target_visit_points > 1000', 'target_visit_points', 1_001],
    ['target_customer_visits > 1000', 'target_customer_visits', 1_001],
  ])('từ chối %s', (_label, field, value) => {
    const result = morningReportSchema.safeParse(validMorningInput({ [field]: value }));

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
  });

  it.each([
    ['0 là giá trị hợp lệ — BR-006 nói ≥ 0, không phải > 0', 'target_sales_quantity', 0],
    ['0 doanh thu cũng hợp lệ', 'target_revenue', 0],
    ['đúng trần doanh thu (biên inclusive)', 'target_revenue', MAX_REVENUE_VND],
    ['đúng trần doanh số', 'target_sales_quantity', 10_000],
    ['đúng trần điểm viếng thăm', 'target_visit_points', 1_000],
  ])('chấp nhận %s', (_label, field, value) => {
    const result = morningReportSchema.safeParse(validMorningInput({ [field]: value }));
    expect(result.success).toBe(true);
  });

  it('nhận cả chuỗi từ FormData, kể cả chuỗi đã phân nhóm nghìn', () => {
    // Form gửi FormData nên mọi giá trị lên server đều là chuỗi. Một schema
    // gánh cả hai dạng — không có schema thứ hai để lệch nhau (AGENTS.md §9).
    const result = morningReportSchema.safeParse(
      validMorningInput({ target_revenue: '150.000.000', target_sales_quantity: '5' }),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.target_revenue).toBe(150_000_000);
    expect(result.data.target_sales_quantity).toBe(5);
  });

  it('ô số để trống bị từ chối, không âm thầm thành 0', () => {
    const result = morningReportSchema.safeParse(validMorningInput({ target_revenue: '' }));
    expect(result.success).toBe(false);
  });
});

describe('morningReportSchema — trường văn bản', () => {
  it('từ chối planned_route rỗng', () => {
    expect(morningReportSchema.safeParse(validMorningInput({ planned_route: '' })).success).toBe(
      false,
    );
  });

  it('từ chối planned_route chỉ có khoảng trắng (đo độ dài SAU khi trim)', () => {
    expect(morningReportSchema.safeParse(validMorningInput({ planned_route: '   ' })).success).toBe(
      false,
    );
  });

  it(`từ chối planned_route ${MAX_ROUTE_LENGTH + 1} ký tự`, () => {
    const input = validMorningInput({ planned_route: 'a'.repeat(MAX_ROUTE_LENGTH + 1) });
    expect(morningReportSchema.safeParse(input).success).toBe(false);
  });

  it(`chấp nhận planned_route đúng ${MAX_ROUTE_LENGTH} ký tự`, () => {
    const input = validMorningInput({ planned_route: 'a'.repeat(MAX_ROUTE_LENGTH) });
    expect(morningReportSchema.safeParse(input).success).toBe(true);
  });

  it('trim planned_route trước khi trả về', () => {
    const result = morningReportSchema.safeParse(
      validMorningInput({ planned_route: '  Quận 7  ' }),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.planned_route).toBe('Quận 7');
  });

  it('đo độ dài theo KÝ TỰ, không theo byte — tiếng Việt có dấu', () => {
    const input = validMorningInput({ planned_route: 'ừ'.repeat(MAX_ROUTE_LENGTH) });
    expect(morningReportSchema.safeParse(input).success).toBe(true);
  });

  it.each([
    ['bỏ trống', ''],
    ['chỉ khoảng trắng', '   '],
    ['null', null],
    ['undefined', undefined],
  ])('visit_purpose %s → null (cột nullable, không ghi chuỗi rỗng)', (_label, value) => {
    const result = morningReportSchema.safeParse(validMorningInput({ visit_purpose: value }));

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.visit_purpose).toBeNull();
  });

  it('từ chối visit_purpose 301 ký tự', () => {
    const input = validMorningInput({ visit_purpose: 'a'.repeat(301) });
    expect(morningReportSchema.safeParse(input).success).toBe(false);
  });
});

describe('morningReportSchema — hợp đồng bảo mật (AGENTS.md §8, docs/07 QUY TẮC 2 & 3)', () => {
  it.each(['sales_id', 'report_date', 'status', 'id'])(
    'strip "%s" do client gửi kèm — server tự đặt',
    (key) => {
      const result = morningReportSchema.safeParse(
        validMorningInput({ [key]: 'giá-trị-bị-sửa-tay' }),
      );

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).not.toHaveProperty(key);
    },
  );

  it('cũng strip cả các cột actual_* của báo cáo cuối ngày', () => {
    const result = morningReportSchema.safeParse(
      validMorningInput({ actual_revenue: 999, evening_submitted_at: '2026-08-07T10:00:00Z' }),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).not.toHaveProperty('actual_revenue');
    expect(result.data).not.toHaveProperty('evening_submitted_at');
  });
});

describe('morningReportSchema — chất lượng thông báo lỗi', () => {
  it('báo lỗi cho TẤT CẢ field sai, không dừng ở field đầu (rule error-summary)', () => {
    const result = morningReportSchema.safeParse(
      validMorningInput({
        planned_route: '',
        target_revenue: -1,
        target_sales_quantity: 10_001,
      }),
    );

    expect(result.success).toBe(false);
    if (result.success) return;

    const failedFields = new Set(result.error.issues.map((issue) => issue.path[0]));
    expect(failedFields).toEqual(
      new Set(['planned_route', 'target_revenue', 'target_sales_quantity']),
    );
  });

  it('thông điệp lỗi là tiếng Việt do dự án đặt, không phải chuỗi mặc định của Zod', () => {
    const result = morningReportSchema.safeParse(validMorningInput({ target_revenue: -1 }));

    expect(result.success).toBe(false);
    if (result.success) return;

    const message = result.error.issues[0]?.message ?? '';
    expect(message).toContain('doanh thu');
    expect(message).not.toContain('Expected');
    expect(message).not.toContain('Too small');
  });
});

describe('reportDateSchema — BR-005, BR-016, BR-021', () => {
  /** Đóng băng đồng hồ ở một mốc UTC tuyệt đối. */
  function freezeAt(utcInstant: string): void {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(utcInstant));
  }

  it('chấp nhận đúng ngày hôm nay theo giờ VN', () => {
    // 17:01Z ngày 06 = 00:01 ngày 07 giờ VN.
    freezeAt('2026-08-06T17:01:00Z');
    expect(reportDateSchema.safeParse('2026-08-07').success).toBe(true);
  });

  it('từ chối ngày tương lai — BR-016', () => {
    freezeAt('2026-08-07T03:00:00Z');
    expect(reportDateSchema.safeParse('2026-08-08').success).toBe(false);
  });

  it('từ chối ngày quá khứ — BR-021, không nhập bù', () => {
    freezeAt('2026-08-07T03:00:00Z');
    expect(reportDateSchema.safeParse('2026-08-06').success).toBe(false);
  });

  it.each([
    ['ngày không tồn tại', '2026-02-30'],
    ['định dạng dd/MM/yyyy', '07/08/2026'],
    ['chuỗi rác', 'not-a-date'],
    ['có kèm giờ', '2026-08-07T00:00:00Z'],
  ])('từ chối %s', (_label, value) => {
    freezeAt('2026-08-07T03:00:00Z');
    expect(reportDateSchema.safeParse(value).success).toBe(false);
  });

  it('biên 17:00Z — cùng một chuỗi ngày, hai kết quả khác nhau', () => {
    // Chứng minh schema bám vào ngày nghiệp vụ VN chứ không phải ngày UTC.
    freezeAt('2026-08-06T16:59:00Z');
    expect(reportDateSchema.safeParse('2026-08-07').success).toBe(false);

    freezeAt('2026-08-06T17:00:00Z');
    expect(reportDateSchema.safeParse('2026-08-07').success).toBe(true);
  });
});
