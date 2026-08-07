/**
 * Unit test cho `lib/validation/report.ts` — bảng case lấy từ `docs/08 §3.6`.
 *
 * Master Spec §25 cấm: số âm, invalid date, `NaN`, `Infinity`, invalid revenue,
 * duplicate report. **Duplicate report được gác ở DB** (BR-001) nên nó nằm ở
 * `tests/integration/daily-reports.constraints.test.ts`, không ở tầng này.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MAX_EVENING_NOTE_LENGTH,
  MAX_REVENUE_VND,
  MAX_ROUTE_LENGTH,
  eveningReportSchema,
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

/* ===========================================================================
 * eveningReportSchema — UC-06, FR-014, BR-018 (Phase 4)
 * ========================================================================= */

/** Payload thực đạt hợp lệ tối thiểu; từng case chỉ ghi đè đúng field đang kiểm. */
function validEveningInput(overrides: Record<string, unknown> = {}) {
  return {
    actual_route: 'Quận 1 → Quận 3',
    actual_visit_points: 7,
    actual_sales_quantity: 4,
    actual_revenue: 120_000_000,
    actual_customer_visits: 10,
    evening_note: 'Khách hẹn quay lại cuối tuần.',
    ...overrides,
  };
}

describe('eveningReportSchema — bốn chỉ số actual đều BẮT BUỘC (BR-007)', () => {
  it.each([
    'actual_visit_points',
    'actual_sales_quantity',
    'actual_revenue',
    'actual_customer_visits',
  ])('thiếu %s → từ chối, khớp `ck_completed_requires_actuals`', (field) => {
    const input = validEveningInput();
    delete input[field as keyof typeof input];

    const result = eveningReportSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
  });

  it.each([
    'actual_visit_points',
    'actual_sales_quantity',
    'actual_revenue',
    'actual_customer_visits',
  ])('%s để trống trên form → từ chối, không âm thầm thành 0', (field) => {
    expect(eveningReportSchema.safeParse(validEveningInput({ [field]: '' })).success).toBe(false);
  });

  it.each([
    'actual_visit_points',
    'actual_sales_quantity',
    'actual_revenue',
    'actual_customer_visits',
  ])('%s = null bị từ chối (cột nullable ở DB nhưng COMPLETED thì không)', (field) => {
    expect(eveningReportSchema.safeParse(validEveningInput({ [field]: null })).success).toBe(false);
  });
});

describe('eveningReportSchema — miền giá trị số (BR-006, BR-017)', () => {
  it.each([
    ['số âm ở actual_sales_quantity', 'actual_sales_quantity', -1],
    ['số âm ở actual_revenue', 'actual_revenue', -1],
    ['NaN', 'actual_revenue', Number.NaN],
    ['Infinity', 'actual_revenue', Number.POSITIVE_INFINITY],
    ['-Infinity', 'actual_revenue', Number.NEGATIVE_INFINITY],
    ['số thập phân ở cột integer', 'actual_sales_quantity', 1.5],
    ['chuỗi rác ở cột số', 'actual_revenue', 'abc'],
    ['ký hiệu khoa học', 'actual_revenue', '1e9'],
    ['doanh thu vượt trần BR-017', 'actual_revenue', MAX_REVENUE_VND + 1],
    ['actual_sales_quantity > 10000', 'actual_sales_quantity', 10_001],
    ['actual_visit_points > 1000', 'actual_visit_points', 1_001],
    ['actual_customer_visits > 1000', 'actual_customer_visits', 1_001],
  ])('từ chối %s', (_label, field, value) => {
    const result = eveningReportSchema.safeParse(validEveningInput({ [field]: value }));

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
  });

  it.each([
    // BR-004 — thực đạt được phép VƯỢT cam kết, và cam kết không nằm trong
    // schema này nên không có ràng buộc chéo nào chặn chuyện đó.
    ['0 ở mọi chỉ số — một ngày không bán được xe nào vẫn phải báo cáo', 'actual_sales_quantity', 0],
    ['0 doanh thu', 'actual_revenue', 0],
    ['đúng trần doanh thu (biên inclusive)', 'actual_revenue', MAX_REVENUE_VND],
    ['đúng trần doanh số', 'actual_sales_quantity', 10_000],
    ['đúng trần điểm viếng thăm', 'actual_visit_points', 1_000],
  ])('chấp nhận %s', (_label, field, value) => {
    expect(eveningReportSchema.safeParse(validEveningInput({ [field]: value })).success).toBe(true);
  });

  it('nhận chuỗi FormData đã phân nhóm nghìn', () => {
    const result = eveningReportSchema.safeParse(
      validEveningInput({ actual_revenue: '120.000.000', actual_sales_quantity: '4' }),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.actual_revenue).toBe(120_000_000);
    expect(result.data.actual_sales_quantity).toBe(4);
  });
});

describe('eveningReportSchema — evening_note (BR-018)', () => {
  it.each([
    ['bỏ trống', ''],
    ['chỉ khoảng trắng', '   '],
    ['null', null],
    ['undefined', undefined],
  ])('evening_note %s → null (cột nullable, không ghi chuỗi rỗng)', (_label, value) => {
    const result = eveningReportSchema.safeParse(validEveningInput({ evening_note: value }));

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.evening_note).toBeNull();
  });

  it(`từ chối evening_note ${MAX_EVENING_NOTE_LENGTH + 1} ký tự`, () => {
    const input = validEveningInput({ evening_note: 'a'.repeat(MAX_EVENING_NOTE_LENGTH + 1) });
    expect(eveningReportSchema.safeParse(input).success).toBe(false);
  });

  it(`chấp nhận evening_note đúng ${MAX_EVENING_NOTE_LENGTH} ký tự tiếng Việt có dấu`, () => {
    // Đo theo KÝ TỰ chứ không theo byte — 'ừ' chiếm 3 byte UTF-8, nên nếu ở đâu
    // đó đếm bằng byte thì case này sẽ đỏ. `char_length` của Postgres cũng đếm
    // theo ký tự, hai tầng khớp nhau (docs/08 §3.6).
    const input = validEveningInput({ evening_note: 'ừ'.repeat(MAX_EVENING_NOTE_LENGTH) });
    expect(eveningReportSchema.safeParse(input).success).toBe(true);
  });

  it('trim evening_note trước khi trả về', () => {
    const result = eveningReportSchema.safeParse(
      validEveningInput({ evening_note: '  Trời mưa lớn buổi chiều.  ' }),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.evening_note).toBe('Trời mưa lớn buổi chiều.');
  });
});

describe('eveningReportSchema — actual_route (DEC-029, OQ-02)', () => {
  it.each([
    ['bỏ trống', ''],
    ['null', null],
    ['undefined', undefined],
  ])('actual_route %s → null — tuyến thực tế là TUỲ CHỌN', (_label, value) => {
    const result = eveningReportSchema.safeParse(validEveningInput({ actual_route: value }));

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.actual_route).toBeNull();
  });

  it(`từ chối actual_route ${MAX_ROUTE_LENGTH + 1} ký tự — ck_actual_route_len`, () => {
    const input = validEveningInput({ actual_route: 'a'.repeat(MAX_ROUTE_LENGTH + 1) });
    expect(eveningReportSchema.safeParse(input).success).toBe(false);
  });

  it(`chấp nhận actual_route đúng ${MAX_ROUTE_LENGTH} ký tự`, () => {
    const input = validEveningInput({ actual_route: 'ừ'.repeat(MAX_ROUTE_LENGTH) });
    expect(eveningReportSchema.safeParse(input).success).toBe(true);
  });
});

describe('eveningReportSchema — hợp đồng bảo mật (AGENTS.md §8, docs/07 QUY TẮC 2 & 3)', () => {
  it.each(['sales_id', 'report_date', 'status', 'id', 'evening_submitted_at'])(
    'strip "%s" do client gửi kèm — server tự đặt',
    (key) => {
      const result = eveningReportSchema.safeParse(
        validEveningInput({ [key]: 'giá-trị-bị-sửa-tay' }),
      );

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).not.toHaveProperty(key);
    },
  );

  it('cũng strip cả các cột target_* — form tối không được sửa cam kết sáng', () => {
    // Nếu payload cuối ngày ghi đè được `target_*` thì Sales có thể hạ chỉ tiêu
    // xuống đúng bằng thực đạt ngay lúc chốt sổ. Đó là lý do UC-06 chỉ ghi
    // `actual_*` (BR-019).
    const result = eveningReportSchema.safeParse(
      validEveningInput({ target_revenue: 1, target_sales_quantity: 1 }),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).not.toHaveProperty('target_revenue');
    expect(result.data).not.toHaveProperty('target_sales_quantity');
  });

  it('báo lỗi cho TẤT CẢ field sai, không dừng ở field đầu (rule error-summary)', () => {
    const result = eveningReportSchema.safeParse(
      validEveningInput({
        actual_revenue: -1,
        actual_sales_quantity: 10_001,
        evening_note: 'a'.repeat(MAX_EVENING_NOTE_LENGTH + 1),
      }),
    );

    expect(result.success).toBe(false);
    if (result.success) return;

    const failedFields = new Set(result.error.issues.map((issue) => issue.path[0]));
    expect(failedFields).toEqual(
      new Set(['actual_revenue', 'actual_sales_quantity', 'evening_note']),
    );
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
