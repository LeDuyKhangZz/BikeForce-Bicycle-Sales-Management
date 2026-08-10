import { describe, expect, it } from 'vitest';

import {
  CHART_HEIGHT,
  CHART_WIDTH,
  DEFAULT_TREND_METRIC,
  buildTrendChart,
  parseTrendMetric,
  type TrendPoint,
} from '@/lib/reports/trend-chart';

/**
 * Bài kiểm cho hình học biểu đồ trend — FR-037, AF-08 (PHASE 9).
 *
 * Trọng tâm KHÔNG phải "biểu đồ có đẹp không" (chuyện đó phải nhìn bằng mắt ở
 * bước kiểm chứng trình duyệt), mà là ba loại lỗi âm thầm mà mắt thường bỏ sót:
 *   • một thuộc tính SVG nhận `NaN` → trình duyệt bỏ qua cả phần tử, **không
 *     báo lỗi gì**, biểu đồ chỉ đơn giản biến mất;
 *   • cột mọc ngược lên trên vì một dấu trừ đặt sai;
 *   • cột tràn ra ngoài khung khi thực đạt vượt cam kết (BR-004 cho phép > 100%).
 */

const point = (date: string, target: number, actual: number): TrendPoint => ({
  date,
  target,
  actual,
});

describe('parseTrendMetric', () => {
  it('nhận đúng bốn chỉ tiêu hợp lệ', () => {
    expect(parseTrendMetric('VISIT_POINTS')).toBe('VISIT_POINTS');
    expect(parseTrendMetric('SALES_AMOUNT')).toBe('SALES_AMOUNT');
    expect(parseTrendMetric('REVENUE')).toBe('REVENUE');
    expect(parseTrendMetric('CUSTOMER_VISITS')).toBe('CUSTOMER_VISITS');
  });

  it('mọi đầu vào rác về chỉ tiêu mặc định, KHÔNG ném lỗi', () => {
    // `?metric=` là chuỗi người dùng gõ được vào URL.
    for (const raw of ['', 'abc', 'revenue', 'REVENUE ', '__proto__', 'toString']) {
      expect(parseTrendMetric(raw)).toBe(DEFAULT_TREND_METRIC);
    }

    expect(parseTrendMetric(undefined)).toBe(DEFAULT_TREND_METRIC);
  });
});

describe('buildTrendChart — khung rỗng', () => {
  it('không có ngày nào thì trả mảng cột rỗng, không ném lỗi', () => {
    const model = buildTrendChart([], 'REVENUE');

    expect(model.bars).toEqual([]);
    expect(model.width).toBe(CHART_WIDTH);
    expect(model.height).toBe(CHART_HEIGHT);
    // `maxValue` vẫn phải > 0 để không ai chia cho 0 ở tầng trên.
    expect(model.maxValue).toBeGreaterThan(0);
  });
});

describe('buildTrendChart — hình học', () => {
  const points = [
    point('2026-08-01', 100, 80),
    point('2026-08-02', 100, 100),
    point('2026-08-03', 100, 120),
  ];

  it('mỗi ngày cho đúng một cột, giữ nguyên thứ tự', () => {
    const model = buildTrendChart(points, 'SALES_AMOUNT');

    expect(model.bars).toHaveLength(3);
    expect(model.bars.map((bar) => bar.date)).toEqual([
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
    ]);
  });

  it('nhãn ngày chỉ lấy hai chữ số cuối của ngày nghiệp vụ', () => {
    const model = buildTrendChart([point('2026-08-09', 1, 1)], 'REVENUE');

    expect(model.bars[0]?.dayLabel).toBe('09');
  });

  it('đỉnh vùng vẽ lấy theo giá trị lớn nhất của CẢ cam kết lẫn thực đạt', () => {
    // Ngày 3 vượt kế hoạch (BR-004 không clamp) — nếu chỉ lấy max theo cam kết
    // thì cột đó sẽ tràn ra ngoài khung.
    const model = buildTrendChart(points, 'SALES_AMOUNT');

    expect(model.maxValue).toBe(120);
  });

  it('không cột nào tràn ra ngoài vùng vẽ, kể cả khi vượt 100%', () => {
    const model = buildTrendChart(points, 'SALES_AMOUNT');

    for (const bar of model.bars) {
      expect(bar.y).toBeGreaterThanOrEqual(0);
      expect(bar.actualY).toBeGreaterThanOrEqual(0);
      expect(bar.y + bar.height).toBeLessThanOrEqual(model.baselineY + 0.001);
      expect(bar.actualY + bar.actualHeight).toBeLessThanOrEqual(model.baselineY + 0.001);
    }
  });

  it('cột thực đạt hẹp hơn và nằm giữa khung cam kết', () => {
    const model = buildTrendChart(points, 'SALES_AMOUNT');
    const bar = model.bars[0];

    expect(bar).toBeDefined();
    if (bar === undefined) return;

    expect(bar.actualWidth).toBeLessThan(bar.width);
    expect(bar.actualX).toBeGreaterThan(bar.x);
    expect(bar.actualX + bar.actualWidth).toBeLessThan(bar.x + bar.width);
    // Cùng tâm.
    expect(bar.actualX + bar.actualWidth / 2).toBeCloseTo(bar.x + bar.width / 2, 6);
  });

  it('giá trị lớn hơn cho cột cao hơn — cột không mọc ngược', () => {
    const model = buildTrendChart(points, 'SALES_AMOUNT');
    const [first, , third] = model.bars;

    expect(first).toBeDefined();
    expect(third).toBeDefined();
    if (first === undefined || third === undefined) return;

    // actual 80 < actual 120 ⇒ cột thấp hơn ⇒ toạ độ y LỚN hơn (SVG gốc ở trên).
    expect(first.actualHeight).toBeLessThan(third.actualHeight);
    expect(first.actualY).toBeGreaterThan(third.actualY);
  });

  it('cột đạt đúng đỉnh thì cao kịch vùng vẽ', () => {
    const model = buildTrendChart([point('2026-08-01', 50, 100)], 'REVENUE');
    const bar = model.bars[0];

    expect(bar).toBeDefined();
    if (bar === undefined) return;

    // Đọc mốc từ chính mô hình, không gõ lại hằng số — đổi lề khung thì bài
    // test vẫn đúng thay vì đỏ oan.
    expect(bar.actualY).toBeCloseTo(model.plotTop, 6);
    expect(bar.actualHeight).toBeCloseTo(model.baselineY - model.plotTop, 6);
  });

  it('vùng vẽ trải KÍN bề rộng viewBox — nhãn ngày HTML mới khớp với cột', () => {
    /*
     * Nhãn trục X là một hàng `<li class="flex-1">` bên ngoài SVG. Nó chỉ nằm
     * đúng dưới cột của nó khi khe cột đầu bắt đầu ở `x = 0` và khe cuối kết
     * thúc ở `x = width`. Một lề trái/phải khác 0 sẽ làm nhãn lệch dần.
     */
    const points = Array.from({ length: 5 }, (_unused, index) =>
      point(`2026-08-0${index + 1}`, 10, 10),
    );
    const model = buildTrendChart(points, 'REVENUE');
    const slot = model.width / points.length;

    model.bars.forEach((bar, index) => {
      expect(bar.centerX).toBeCloseTo(slot * index + slot / 2, 6);
    });
  });
});

describe('buildTrendChart — nhãn trục X giãn thưa', () => {
  const monthPoints = Array.from({ length: 31 }, (_unused, index) =>
    point(`2026-08-${String(index + 1).padStart(2, '0')}`, 10, 10),
  );

  it('ít ngày thì hiện đủ nhãn', () => {
    const model = buildTrendChart(monthPoints.slice(0, 6), 'REVENUE');

    expect(model.bars.every((bar) => bar.showLabel)).toBe(true);
  });

  it('cả tháng thì giãn thưa để không chồng chữ ở 375px', () => {
    const model = buildTrendChart(monthPoints, 'REVENUE');
    const shown = model.bars.filter((bar) => bar.showLabel);

    expect(shown.length).toBeGreaterThanOrEqual(4);
    expect(shown.length).toBeLessThanOrEqual(8);
    // Nhãn đầu tiên luôn hiện — người đọc cần một mốc để bắt đầu.
    expect(model.bars[0]?.showLabel).toBe(true);
  });

  it('cột không bao giờ rộng quá trần dù tháng chỉ có 1 ngày dữ liệu', () => {
    const model = buildTrendChart([point('2026-08-01', 10, 10)], 'REVENUE');

    expect(model.bars[0]?.width).toBeLessThanOrEqual(26);
  });
});

describe('buildTrendChart — BẤT BIẾN: không bao giờ NaN / Infinity / số âm', () => {
  /**
   * Quét lưới các tổ hợp bệnh lý. Cùng tinh thần bài lưới 288 tổ hợp của
   * `lib/kpi.test.ts`: một `NaN` lọt vào thuộc tính SVG không đỏ lên ở đâu cả,
   * nó chỉ làm phần tử biến mất.
   */
  const nastyValues = [0, 1, -1, 0.5, Number.MAX_SAFE_INTEGER, Number.NaN, Infinity, -Infinity];

  it('mọi tổ hợp target × actual đều cho số hữu hạn, không âm', () => {
    let checked = 0;

    for (const target of nastyValues) {
      for (const actual of nastyValues) {
        const model = buildTrendChart([point('2026-08-01', target, actual)], 'REVENUE');
        const bar = model.bars[0];

        expect(bar).toBeDefined();
        if (bar === undefined) continue;

        for (const value of [
          bar.x,
          bar.y,
          bar.width,
          bar.height,
          bar.actualX,
          bar.actualY,
          bar.actualWidth,
          bar.actualHeight,
          bar.centerX,
          model.maxValue,
          model.baselineY,
        ]) {
          expect(Number.isFinite(value)).toBe(true);
        }

        expect(bar.height).toBeGreaterThanOrEqual(0);
        expect(bar.actualHeight).toBeGreaterThanOrEqual(0);
        expect(bar.height).toBeLessThanOrEqual(model.baselineY);
        expect(bar.actualHeight).toBeLessThanOrEqual(model.baselineY);

        checked += 1;
      }
    }

    expect(checked).toBe(nastyValues.length * nastyValues.length);
  });

  it('cả tháng toàn số 0 vẫn vẽ được — mọi cột cao 0, không chia cho 0', () => {
    const model = buildTrendChart(
      [point('2026-08-01', 0, 0), point('2026-08-02', 0, 0)],
      'REVENUE',
    );

    expect(model.maxValue).toBeGreaterThan(0);
    expect(model.bars.every((bar) => bar.height === 0 && bar.actualHeight === 0)).toBe(true);
    expect(model.bars.every((bar) => Number.isFinite(bar.y) && Number.isFinite(bar.actualY))).toBe(
      true,
    );
  });

  it('vạch lưới đều nằm trong vùng vẽ', () => {
    const model = buildTrendChart([point('2026-08-01', 10, 10)], 'REVENUE');

    expect(model.gridLines.length).toBeGreaterThan(0);
    for (const y of model.gridLines) {
      expect(Number.isFinite(y)).toBe(true);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(model.baselineY);
    }
  });
});
