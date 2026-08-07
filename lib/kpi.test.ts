/**
 * Unit test cho `lib/kpi.ts` — bảng case lấy nguyên từ `docs/08 §3.1` và `§3.2`,
 * bổ sung các case của phần mới chốt ở Phase 5 (DEC-038): tham số `metric`,
 * trường `surplus`, `achievementLabel()` và `isKpiAchievedDay()`.
 *
 * Không I/O, không mạng, không DB (docs/08 §2.2). `lib/kpi.ts` là module được
 * test dày nhất của dự án (docs/08 §1.1 nguyên tắc 2): achievement KHÔNG persist
 * mà tính runtime (BR-011), nên toàn bộ rủi ro tính sai nằm ở đây.
 *
 * ⚠ Ký tự giữa số tiền và `₫` là NO-BREAK SPACE `U+00A0`. Assertion nào gõ space
 * thường sẽ FAIL dù code đúng (docs/08 §3.3) — dưới đây luôn viết ` `.
 */
import { describe, expect, it, vi } from 'vitest';

import {
  achievementLabel,
  calculateAchievement,
  formatMetricValue,
  formatMetricValueCompact,
  getAchievementStatus,
  isKpiAchievedDay,
  type AchievementResult,
  type AchievementStatus,
  type KpiMetric,
} from './kpi';

/** Chỉ tiêu mặc định cho các case không quan tâm tới đơn vị. */
const ANY: KpiMetric = 'SALES_QUANTITY';

describe('calculateAchievement — bảng case docs/08 §3.1', () => {
  const CASES: ReadonlyArray<
    readonly [
      label: string,
      target: number,
      actual: number | null,
      metric: KpiMetric,
      expected: AchievementResult,
    ]
  > = [
    [
      'target=0 & actual=0 → coi là đạt cam kết 100% (BR-015)',
      0,
      0,
      ANY,
      { percent: 100, status: 'EXCEEDED', display: '100,0%', surplus: null },
    ],
    [
      'target=0 & actual>0 → số vượt tuyệt đối, không NaN/Infinity (BR-015, DEC-025)',
      0,
      5,
      'SALES_QUANTITY',
      { percent: null, status: 'EXCEEDED', display: '+5 xe', surplus: 5 },
    ],
    [
      'actual > target → cho phép vượt 100%, không clamp (BR-004)',
      8,
      10,
      ANY,
      { percent: 125, status: 'EXCEEDED', display: '125,0%', surplus: null },
    ],
    [
      'actual < target (BR-014)',
      10,
      8,
      ANY,
      { percent: 80, status: 'NEAR', display: '80,0%', surplus: null },
    ],
    [
      'actual = target (BR-023)',
      10,
      10,
      ANY,
      { percent: 100, status: 'EXCEEDED', display: '100,0%', surplus: null },
    ],
    [
      'actual = null → chưa có số liệu cuối ngày (BR-023 "Chờ số liệu")',
      10,
      null,
      ANY,
      { percent: null, status: 'PENDING', display: '—', surplus: null },
    ],
    [
      'vượt rất xa vẫn không clamp, không tràn định dạng (BR-004)',
      1,
      125,
      ANY,
      { percent: 12500, status: 'EXCEEDED', display: '12.500,0%', surplus: null },
    ],
  ];

  it.each(CASES)('%s', (_label, target, actual, metric, expected) => {
    expect(calculateAchievement(target, actual, metric)).toEqual(expected);
  });

  it('làm tròn 1 chữ số thập phân ở display, KHÔNG làm tròn ở percent (BR-014)', () => {
    const result = calculateAchievement(3, 1, ANY);

    expect(result.percent).toBeCloseTo(33.3333, 4);
    // `percent` là giá trị thô, không phải 33.3.
    expect(result.percent).not.toBe(33.3);
    expect(result.display).toBe('33,3%');
  });

  it('dấu thập phân là dấu phẩy theo vi-VN (DEC-008)', () => {
    const { display } = calculateAchievement(8, 10, ANY);

    expect(display).toContain(',');
    expect(display).toBe('125,0%');
  });

  it('doanh thu bigint lớn không mất chính xác ở mức hiển thị (BR-017)', () => {
    const result = calculateAchievement(100_000_000_000, 99_999_999_999, 'REVENUE');

    expect(result.display).toBe('100,0%');
    // Làm tròn CHỈ ở display — percent vẫn giữ giá trị thô < 100.
    expect(result.percent).toBeLessThan(100);
    // …và vì thế badge vẫn là "Gần đạt", không phải "Vượt mục tiêu" (BR-023).
    expect(result.status).toBe('NEAR');
  });

  it('là hàm pure, không phụ thuộc thời gian (BR-011)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-07T03:00:00Z'));
    const first = calculateAchievement(8, 10, ANY);

    vi.setSystemTime(new Date('2027-01-01T20:00:00Z'));
    const second = calculateAchievement(8, 10, ANY);
    vi.useRealTimers();

    expect(first).toEqual(second);
  });
});

describe('calculateAchievement — KHÔNG BAO GIỜ NaN / Infinity (Master Spec §9, §25)', () => {
  /**
   * Quét một lưới đầu vào rộng hơn hẳn bảng nghiệp vụ, gồm cả những giá trị
   * không thể tới từ database (âm, không hữu hạn) — vì đây là bất biến tuyệt
   * đối của cả hệ thống, không phải một case riêng lẻ.
   */
  const TARGETS = [0, 1, 8, 10, 100_000_000_000, -1, Number.NaN, Number.POSITIVE_INFINITY];
  const ACTUALS = [null, 0, 1, 7, 125, 99_999_999_999, -3, Number.NaN, Number.NEGATIVE_INFINITY];
  const METRICS: readonly KpiMetric[] = [
    'VISIT_POINTS',
    'SALES_QUANTITY',
    'REVENUE',
    'CUSTOMER_VISITS',
  ];

  it('không input nào cho ra NaN, Infinity, hay chuỗi hiển thị hỏng', () => {
    for (const target of TARGETS) {
      for (const actual of ACTUALS) {
        for (const metric of METRICS) {
          const result = calculateAchievement(target, actual, metric);
          const where = `target=${target} actual=${actual} metric=${metric}`;

          expect(Number.isNaN(result.percent as number), where).toBe(false);
          expect(result.percent === null || Number.isFinite(result.percent), where).toBe(true);
          expect(result.surplus === null || Number.isFinite(result.surplus), where).toBe(true);

          for (const forbidden of ['NaN', 'Infinity', '∞', 'undefined']) {
            expect(result.display.includes(forbidden), `${where} → ${result.display}`).toBe(false);
          }
        }
      }
    }
  });

  it('đầu vào không dùng được trả về PENDING + "—" thay vì ném lỗi (DEC-033)', () => {
    const pending: AchievementResult = {
      percent: null,
      status: 'PENDING',
      display: '—',
      surplus: null,
    };

    expect(calculateAchievement(Number.NaN, 5, ANY)).toEqual(pending);
    expect(calculateAchievement(Number.POSITIVE_INFINITY, 5, ANY)).toEqual(pending);
    expect(calculateAchievement(-1, 5, ANY)).toEqual(pending);
    expect(calculateAchievement(10, -3, ANY)).toEqual(pending);
    expect(calculateAchievement(10, Number.NaN, ANY)).toEqual(pending);
  });
});

describe('calculateAchievement — số vượt tuyệt đối theo từng đơn vị (BR-015, DEC-025)', () => {
  const CASES: ReadonlyArray<readonly [metric: KpiMetric, actual: number, display: string]> = [
    ['SALES_QUANTITY', 3, '+3 xe'],
    ['VISIT_POINTS', 2, '+2 điểm'],
    ['CUSTOMER_VISITS', 5, '+5 khách'],
    ['REVENUE', 3_000_000, '+3.000.000 ₫'],
  ];

  it.each(CASES)('%s → %s', (metric, actual, display) => {
    const result = calculateAchievement(0, actual, metric);

    expect(result.display).toBe(display);
    // `surplus` là con số THÔ để thẻ ảnh 9:16 và tổng hợp Admin dùng lại.
    expect(result.surplus).toBe(actual);
    expect(result.percent).toBeNull();
    expect(result.status).toBe('EXCEEDED');
  });

  it('surplus chỉ khác null ở đúng ca target=0 & actual>0', () => {
    expect(calculateAchievement(0, 0, ANY).surplus).toBeNull();
    expect(calculateAchievement(10, 12, ANY).surplus).toBeNull();
    expect(calculateAchievement(10, null, ANY).surplus).toBeNull();
    expect(calculateAchievement(0, 1, ANY).surplus).toBe(1);
  });
});

describe('getAchievementStatus — ngưỡng BR-023, bảng case docs/08 §3.2', () => {
  const CASES: ReadonlyArray<readonly [label: string, pct: number | null, expected: AchievementStatus]> =
    [
      ['dưới biên NEAR một chút', 79.99, 'MISSED'],
      ['đúng biên dưới của NEAR (inclusive)', 80, 'NEAR'],
      ['sát biên trên của NEAR', 99.99, 'NEAR'],
      ['đúng biên EXCEEDED (inclusive)', 100, 'EXCEEDED'],
      ['chưa có số liệu', null, 'PENDING'],
      ['số 0', 0, 'MISSED'],
      ['âm không xảy ra trong nghiệp vụ nhưng phải an toàn', -5, 'MISSED'],
      ['vượt xa', 12500, 'EXCEEDED'],
      ['79.995 vẫn MISSED — status tính từ giá trị THÔ', 79.995, 'MISSED'],
      ['99.96 vẫn NEAR', 99.96, 'NEAR'],
    ];

  it.each(CASES)('%s → %s', (_label, pct, expected) => {
    expect(getAchievementStatus(pct)).toBe(expected);
  });

  it('NaN / Infinity không lọt thành một ngưỡng nào', () => {
    expect(getAchievementStatus(Number.NaN)).toBe('PENDING');
    expect(getAchievementStatus(Number.POSITIVE_INFINITY)).toBe('PENDING');
  });

  /**
   * Hệ quả cố ý của việc BR-014 làm tròn ở hiển thị còn BR-023 xét ngưỡng trên
   * số thô. Khoá lại bằng test để không ai "sửa" nó mà không đọc DEC-038.
   */
  it('99.96 hiện "100,0%" nhưng badge vẫn là "Gần đạt" (BR-014 × BR-023)', () => {
    const result = calculateAchievement(10_000, 9_996, ANY);

    expect(result.display).toBe('100,0%');
    expect(result.status).toBe('NEAR');
    expect(achievementLabel(result)).toBe('Gần đạt');
  });
});

describe('formatMetricValue — đơn vị chỉ tồn tại một nơi (DEC-025, NFR-012)', () => {
  const CASES: ReadonlyArray<readonly [metric: KpiMetric, value: number, expected: string]> = [
    ['VISIT_POINTS', 8, '8 điểm'],
    ['SALES_QUANTITY', 5, '5 xe'],
    ['CUSTOMER_VISITS', 12, '12 khách'],
    ['REVENUE', 150_000_000, '150.000.000 ₫'],
    ['SALES_QUANTITY', 0, '0 xe'],
    ['REVENUE', 0, '0 ₫'],
    ['SALES_QUANTITY', 1_500, '1.500 xe'],
  ];

  it.each(CASES)('%s %d → %s', (metric, value, expected) => {
    expect(formatMetricValue(value, metric)).toBe(expected);
  });

  it('null → "—" cho ô "Thực đạt" khi chưa hoàn tất báo cáo cuối ngày', () => {
    expect(formatMetricValue(null, 'SALES_QUANTITY')).toBe('—');
    expect(formatMetricValue(null, 'REVENUE')).toBe('—');
  });

  it('giá trị không dùng được trả "—", không ném lỗi (DEC-033)', () => {
    expect(formatMetricValue(Number.NaN, 'SALES_QUANTITY')).toBe('—');
    expect(formatMetricValue(-1, 'REVENUE')).toBe('—');
    expect(formatMetricValue(Number.POSITIVE_INFINITY, 'VISIT_POINTS')).toBe('—');
  });
});

describe('achievementLabel — BR-023, và nhãn riêng của BR-015', () => {
  it('phân biệt "Vượt mục tiêu" với "Vượt kế hoạch" bằng percent === null', () => {
    // target thật, đạt trên 100% → vượt MỤC TIÊU.
    expect(achievementLabel(calculateAchievement(8, 10, ANY))).toBe('Vượt mục tiêu');
    // target = 0 nhưng vẫn làm được → vượt KẾ HOẠCH (BR-015).
    expect(achievementLabel(calculateAchievement(0, 3, ANY))).toBe('Vượt kế hoạch');
    // target = 0 và actual = 0 vẫn là 100,0% của một cam kết có thật.
    expect(achievementLabel(calculateAchievement(0, 0, ANY))).toBe('Vượt mục tiêu');
  });

  it('ba nhãn còn lại theo đúng BR-023', () => {
    expect(achievementLabel(calculateAchievement(10, 9, ANY))).toBe('Gần đạt');
    expect(achievementLabel(calculateAchievement(10, 1, ANY))).toBe('Chưa đạt');
    expect(achievementLabel(calculateAchievement(10, null, ANY))).toBe('Chờ số liệu');
  });
});

describe('isKpiAchievedDay — BR-024 "cả 4 chỉ tiêu ≥ 100%"', () => {
  /** Bốn chỉ tiêu, mỗi cái nhận một cặp (target, actual). */
  function day(pairs: ReadonlyArray<readonly [number, number | null]>): AchievementResult[] {
    return pairs.map(([target, actual]) => calculateAchievement(target, actual, ANY));
  }

  it('cả 4 đều ≥ 100% → đạt', () => {
    expect(isKpiAchievedDay(day([[8, 10], [5, 5], [10, 12], [12, 100]]))).toBe(true);
  });

  it('ba đạt một gần đạt → KHÔNG đạt', () => {
    expect(isKpiAchievedDay(day([[8, 10], [5, 5], [10, 9], [12, 12]]))).toBe(false);
  });

  it('còn chỉ tiêu chưa có số liệu → KHÔNG đạt', () => {
    expect(isKpiAchievedDay(day([[8, 10], [5, 5], [10, 12], [12, null]]))).toBe(false);
  });

  it('hai ca target=0 của BR-015 đều được tính là đạt', () => {
    expect(isKpiAchievedDay(day([[0, 0], [0, 3], [10, 10], [12, 15]]))).toBe(true);
  });

  it('không đủ 4 chỉ tiêu → false, không tuyên bố đạt dựa trên 3 con số', () => {
    expect(isKpiAchievedDay(day([[8, 10], [5, 5], [10, 12]]))).toBe(false);
    expect(isKpiAchievedDay([])).toBe(false);
    expect(isKpiAchievedDay(day([[8, 10], [5, 5], [10, 12], [12, 12], [1, 1]]))).toBe(false);
  });
});

describe('formatMetricValueCompact — bản rút gọn cho thẻ ảnh 9:16 (Phase 6)', () => {
  it('CHỈ doanh thu đổi cách hiển thị', () => {
    expect(formatMetricValueCompact(150000000, 'REVENUE')).toBe('150tr');
    expect(formatMetricValueCompact(100000000000, 'REVENUE')).toBe('100tỷ');
  });

  it('ba chỉ tiêu còn lại giữ nguyên bản đầy đủ — trần của chúng chỉ 4 chữ số', () => {
    for (const metric of ['VISIT_POINTS', 'SALES_QUANTITY', 'CUSTOMER_VISITS'] as const) {
      expect(formatMetricValueCompact(1000, metric)).toBe(formatMetricValue(1000, metric));
    }
    expect(formatMetricValueCompact(1000, 'SALES_QUANTITY')).toBe('1.000 xe');
  });

  it('giữ nguyên quy ước "—" khi chưa có số liệu', () => {
    expect(formatMetricValueCompact(null, 'REVENUE')).toBe('—');
    expect(formatMetricValueCompact(Number.NaN, 'REVENUE')).toBe('—');
    expect(formatMetricValueCompact(-1, 'SALES_QUANTITY')).toBe('—');
  });
});
