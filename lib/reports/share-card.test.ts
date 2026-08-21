/**
 * Unit test cho `lib/reports/share-card.ts` — **bộ edge case bắt buộc của
 * PHASE 6** (`PROJECT_CHECKLIST.md § Phase 6`, `docs/05 §14`, `docs/08 §3.7`):
 * tên 40+ ký tự, tuyến 300 ký tự, ghi chú 1000 ký tự, doanh thu 12 chữ số,
 * achievement 4 chữ số, và **cả hai** nhánh `target = 0` của BR-015.
 *
 * Vì sao kiểm ở đây thay vì so ảnh: view model là **hàm thuần**, nên mọi case
 * trên chạy trong vài mili giây, không cần Satori, không cần trình duyệt, không
 * cần database. Việc render chỉ còn phải trả lời một câu hỏi duy nhất — "Satori
 * có dựng nổi layout không" — và câu đó được trả lời bằng kiểm chứng ảnh thật.
 *
 * ⚠ Ký tự giữa số tiền và `₫` là NO-BREAK SPACE `U+00A0` (docs/08 §3.3).
 */
import { describe, expect, it } from 'vitest';

import {
  MAX_SHARE_NOTE_CHARS,
  MAX_SHARE_ROUTE_CHARS,
  SHARE_NAME_FONT_SIZE,
  SHARE_NAME_MIN_FONT_SIZE,
  SHARE_ROUTE_FONT_SIZE,
  asciiNameSlug,
  buildShareCardModel,
  shareNameFontSize,
  shareRouteFontSize,
  shareImageFileName,
  shareImagePath,
  shareImageViewPath,
  shareMonthRange,
  shareNoteBudget,
  truncateText,
  type ShareCardPerformanceSource,
  type ShareCardSource,
} from './share-card';

/**
 * Một báo cáo đã `COMPLETED` "bình thường" — mọi test bên dưới chỉ ghi đè đúng
 * trường nó quan tâm, nên đọc test là thấy ngay case đang kiểm là gì.
 */
const BASE: ShareCardSource = {
  // `status` quyết định biến thể thẻ (DEC-058) — mặc định là bản CHIỀU vì phần
  // lớn case của Phase 6 nói về bảng 4 cột.
  status: 'COMPLETED',
  report_date: '2026-08-07',
  planned_route: 'Quận 1 → Quận 3',
  actual_route: null,
  evening_note: null,
  target_visit_points: 8,
  target_sales_amount: 5,
  target_revenue: 150_000_000,
  target_customer_visits: 12,
  actual_visit_points: 10,
  actual_sales_amount: 4,
  actual_revenue: 125_000_000,
  actual_customer_visits: 12,
  sales: { full_name: 'Nguyễn Văn A', employee_code: 'NV-0042' },
};

/**
 * Số MISA AMIS mặc định — PHASE 19, DEC-070 (bổ sung DEC-071).
 *
 * Các con số vào thẳng view model, không qua phép cộng nào: nhóm `amis*` do
 * `scripts/amis-sync/push_amis.py` đẩy lên `amis_employee_metrics`, còn
 * `targetRevenue` do `services/reports.ts` cộng từ `target_revenue` của các báo
 * cáo trong tháng. Đặt bốn tỉ lệ LỆCH NHAU (84% · 70% · 80% · 50%) để mỗi dòng
 * rơi vào một trạng thái BR-023 khác nhau, nhờ vậy một test nhầm dòng là lộ ngay.
 *
 * Hai chỉ tiêu tháng để `null` ở đây để mặc định giữ nguyên bốn tỉ lệ đó; nhóm
 * test riêng của DEC-071 bên dưới mới bật chúng lên.
 */
const PERFORMANCE: ShareCardPerformanceSource = {
  amisTargetAmount: 500_000_000,
  amisSalesActual: 420_000_000,
  amisReceiveAmount: 210_000_000,
  amisAccountInCharge: 120,
  amisAccountInteractive: 96,
  amisAccountSold: 48,
  amisOrderCount: 12,
  amisReturnAmount: 30_000_000,
  // 14:00 UTC = 21:00 giờ VN cùng ngày — ca "an toàn", không lệch ngày.
  syncedAt: '2026-08-15T14:00:00Z',
  monthlyTargetSalesAmount: null,
  monthlyTargetRevenue: null,
  targetRevenue: 300_000_000,
};

function build(
  overrides: Partial<ShareCardSource> = {},
  performance: ShareCardPerformanceSource | null = PERFORMANCE,
) {
  return buildShareCardModel({ ...BASE, ...overrides }, performance);
}

describe('buildShareCardModel — phần đầu thẻ (docs/05 §14)', () => {
  it('ngày hiển thị đi qua lib/date, không tự ghép chuỗi', () => {
    expect(build().dateText).toBe('Thứ Sáu, 07/08/2026');
  });

  it('tên Sales viết HOA và giữ nguyên dấu tiếng Việt', () => {
    expect(build().salesName).toBe('NGUYỄN VĂN A');
  });

  it('mã nhân viên rỗng hoặc null đều thành null — thẻ không render dòng trống', () => {
    expect(build({ sales: { full_name: 'A', employee_code: null } }).employeeCode).toBeNull();
    expect(build({ sales: { full_name: 'A', employee_code: '   ' } }).employeeCode).toBeNull();
  });

  it('tuyến lấy THỰC TẾ trước, lùi về tuyến kế hoạch khi cuối ngày không nhập lại', () => {
    expect(build().routeText).toBe('Quận 1 → Quận 3');
    expect(build({ actual_route: 'Thủ Đức → Quận 9' }).routeText).toBe('Thủ Đức → Quận 9');
    expect(build({ actual_route: '   ' }).routeText).toBe('Quận 1 → Quận 3');
  });

  it('không còn tuyến nào đọc được → null, thẻ bỏ hẳn dòng "Tuyến:"', () => {
    // `planned_route` là NOT NULL ở database và có CHECK độ dài, nên ca này
    // không tới được bằng đường dữ liệu thật — vẫn khoá lại để thẻ ảnh không
    // bao giờ in ra chuỗi `Tuyến: ` cụt.
    expect(build({ actual_route: null, planned_route: '  ' }).routeText).toBeNull();
  });
});

describe('buildShareCardModel — bảng 4 chỉ tiêu', () => {
  // Thẻ ảnh dùng `shortLabel` (DEC-050) vì cột nhãn có bề rộng cố định — nhãn
  // đầy đủ "Doanh thu công nợ" / "Khách hàng đã gặp" chỉ hiện trên web.
  it('đúng bốn dòng, đúng thứ tự và nhãn RÚT GỌN của docs/05 §14', () => {
    // ⚠ Dòng thứ ba là **"Doanh thu"**, không phải "Công nợ" — DEC-056.
    expect(build().metrics.map((row) => row.label)).toEqual([
      'Viếng thăm',
      'Doanh số',
      'Doanh thu',
      'Khách hàng',
    ]);
  });

  it('cột số dùng dạng RÚT GỌN cho hai chỉ tiêu tiền, đơn vị đầy đủ cho hai chỉ tiêu đếm', () => {
    const [visits, salesAmount, revenue, customers] = build().metrics;

    expect(visits?.targetText).toBe('8 điểm');
    expect(visits?.actualText).toBe('10 điểm');
    expect(salesAmount?.actualText).toBe('4 ₫');
    expect(revenue?.targetText).toBe('150tr');
    expect(revenue?.actualText).toBe('125tr');
    expect(customers?.actualText).toBe('12 khách');
  });

  it('ô "Hoàn thành" lấy nguyên `display` của lib/kpi — không tính lại', () => {
    expect(build().metrics.map((row) => row.achievement.display)).toEqual([
      '125,0%',
      '80,0%',
      '83,3%',
      '100,0%',
    ]);
  });

  it('status đi kèm để thẻ ảnh tô màu, nhưng ngưỡng vẫn do BR-023 quyết định', () => {
    expect(build().metrics.map((row) => row.achievement.status)).toEqual([
      'EXCEEDED',
      'NEAR',
      'NEAR',
      'EXCEEDED',
    ]);
  });

});

describe('shareNoteBudget — ngân sách ghi chú ĐỘNG (PHASE 18, DEC-069)', () => {
  const SHORT_NAME = 'Nguyễn Văn A';
  const LONG_NAME = 'Nguyễn Trần Hoàng Phương Thảo Vy';
  const SHORT_ROUTE = 'Quận 1 → Quận 3';
  const LONG_ROUTE = 'Quận Bình Thạnh, Quận Gò Vấp, Quận Phú Nhuận, Quận Tân Bình, Quận Tân Phú, huyện Hóc Môn';

  it('phần đầu thẻ gọn → ghi chú được trọn 2 dòng', () => {
    expect(shareNoteBudget(SHORT_NAME, SHORT_ROUTE)).toBe(MAX_SHARE_NOTE_CHARS);
  });

  it('tên Sales dài KHÔNG còn ăn dòng ghi chú nào — PHASE 19', () => {
    // `shareNameFontSize()` ép tên về đúng một dòng bằng cách thu cỡ chữ, nên
    // tên dài không còn là một khoản chi ở phần đầu thẻ.
    expect(shareNoteBudget(LONG_NAME, SHORT_ROUTE)).toBe(MAX_SHARE_NOTE_CHARS);
  });

  it('tuyến xuống 2 dòng → ghi chú chỉ còn 1 dòng', () => {
    expect(shareNoteBudget(SHORT_NAME, LONG_ROUTE)).toBe(MAX_SHARE_NOTE_CHARS / 2);
  });

  it('tuyến dài tới đâu cũng chỉ trừ ĐÚNG một dòng — tuyến bị ép tối đa 2 dòng', () => {
    expect(shareNoteBudget(SHORT_NAME, 'R'.repeat(400))).toBe(MAX_SHARE_NOTE_CHARS / 2);
  });

  it('không có tuyến thì tuyến không ăn dòng nào', () => {
    expect(shareNoteBudget(SHORT_NAME, null)).toBe(MAX_SHARE_NOTE_CHARS);
  });

  it('ngân sách không bao giờ âm', () => {
    expect(shareNoteBudget('N'.repeat(200), 'R'.repeat(200))).toBeGreaterThanOrEqual(0);
  });

  it('CÓ cụm AMIS → ngân sách 0, tức BỎ HẲN khối ghi chú (PHASE 19)', () => {
    // Cụm "Tình trạng thực hiện" cao ~200px, bằng đúng cả khối ghi chú kể cả
    // nhãn. Đã render ra và thấy: giữ cả hai thì Yoga nén ghi chú còn một mẩu
    // nhãn "GHI CHÚ" thò ra rồi bị chém ngang.
    expect(shareNoteBudget(SHORT_NAME, SHORT_ROUTE, true)).toBe(0);
  });

  it('buildShareCardModel BỎ ghi chú khi có cụm AMIS, nhưng GIỮ khi không có', () => {
    const overrides = {
      sales: { full_name: LONG_NAME, employee_code: 'KD-1' },
      planned_route: LONG_ROUTE,
      actual_route: LONG_ROUTE,
      evening_note: 'Khách hẹn lại tuần sau, đã gửi báo giá mới.',
    };

    expect(build(overrides).noteText).toBeNull();
    expect(build(overrides, null).noteText).not.toBeNull();

    // Tuyến thì VẪN còn ở cả hai — nó là thông tin của chuyến đi, không phải
    // phần phụ được phép hy sinh.
    expect(build(overrides).routeText).not.toBeNull();
  });
});

describe('Cỡ chữ co theo độ dài (PHASE 19) — chỉ thu khi thật sự cần', () => {
  it('tên ngắn giữ NGUYÊN 64px — người dùng dặn chỉ giảm khi tên bị xuống dòng', () => {
    expect(shareNameFontSize('LÊ DUY KHANG')).toBe(SHARE_NAME_FONT_SIZE);
  });

  it('tên đúng 22 ký tự vẫn chưa bị đụng tới', () => {
    expect(shareNameFontSize('N'.repeat(22))).toBe(SHARE_NAME_FONT_SIZE);
  });

  it('tên 23 ký tự trở lên mới bắt đầu thu', () => {
    expect(shareNameFontSize('N'.repeat(23))).toBeLessThan(SHARE_NAME_FONT_SIZE);
  });

  it('tên càng dài cỡ chữ càng nhỏ, không bao giờ tăng lại', () => {
    const sizes = [24, 28, 32, 36, 40].map((n) => shareNameFontSize('N'.repeat(n)));

    for (let i = 1; i < sizes.length; i += 1) {
      expect(sizes[i]!).toBeLessThanOrEqual(sizes[i - 1]!);
    }
  });

  it('có SÀN — tên dài vô lý vẫn không nhỏ hơn 30px', () => {
    expect(shareNameFontSize('N'.repeat(400))).toBe(SHARE_NAME_MIN_FONT_SIZE);
  });

  it('model dùng đúng cỡ chữ đã tính, đo trên chuỗi ĐÃ IN HOA', () => {
    const model = build({ sales: { full_name: 'Nguyễn Trần Hoàng Phương Thảo Vy', employee_code: null } });

    expect(model.nameFontSize).toBe(shareNameFontSize(model.salesName));
    expect(model.nameFontSize).toBeLessThan(SHARE_NAME_FONT_SIZE);
  });

  it('tuyến ngắn giữ nguyên cỡ chữ, tuyến kịch trần bị thu', () => {
    expect(shareRouteFontSize('Quận 1 → Quận 3')).toBe(SHARE_ROUTE_FONT_SIZE);
    expect(shareRouteFontSize('Q'.repeat(MAX_SHARE_ROUTE_CHARS))).toBeLessThan(SHARE_ROUTE_FONT_SIZE);
  });

  it('không có tuyến thì trả cỡ chữ gốc, không ném', () => {
    expect(shareRouteFontSize(null)).toBe(SHARE_ROUTE_FONT_SIZE);
  });
});

describe('Thanh tiến độ + ngọn lửa vượt chỉ tiêu (PHASE 18, DEC-069)', () => {
  /** Lấy thanh của một dòng theo chỉ số trong `KPI_METRIC_ROWS`. */
  const progressOf = (overrides: Partial<ShareCardSource>, index: number) =>
    build(overrides).metrics[index]?.progress;

  it('fill = percent / 100 cho ca thường', () => {
    // 8,5tr trên cam kết 10tr = 85%.
    expect(progressOf({ target_revenue: 10_000_000, actual_revenue: 8_500_000 }, 2)).toEqual({
      fill: 0.85,
      isBlazing: false,
    });
  });

  it('ĐÚNG 100% thì thanh đầy nhưng KHÔNG cháy — người dùng chốt 2026-08-15', () => {
    // "vượt chỉ tiêu là lớn 100% mới được, = 100% thì không được nhé".
    expect(progressOf({ target_visit_points: 10, actual_visit_points: 10 }, 0)).toEqual({
      fill: 1,
      isBlazing: false,
    });
  });

  it('vượt 100% thì cháy, và fill bị CLAMP về 1 dù percent là 250%', () => {
    const progress = progressOf({ target_visit_points: 10, actual_visit_points: 25 }, 0);

    expect(progress).toEqual({ fill: 1, isBlazing: true });
    // BR-004 — con số KHÔNG bị clamp, chỉ chiều dài thanh mới bị.
    expect(build({ target_visit_points: 10, actual_visit_points: 25 }).metrics[0]?.achievement.display).toBe(
      '250,0%',
    );
  });

  it('vượt sát ngưỡng: 100,01% đã cháy', () => {
    const progress = progressOf({ target_visit_points: 10_000, actual_visit_points: 10_001 }, 0);

    expect(progress?.isBlazing).toBe(true);
  });

  it('99,99% hiển thị "100,0%" nhưng KHÔNG cháy — ngưỡng xét trên số chưa làm tròn', () => {
    const overrides = { target_visit_points: 10_000, actual_visit_points: 9_999 };

    expect(build(overrides).metrics[0]?.achievement.display).toBe('100,0%');
    expect(progressOf(overrides, 0)?.isBlazing).toBe(false);
  });

  it('BR-015 nhánh 1 — target = 0 và actual = 0: thanh đầy, KHÔNG cháy', () => {
    expect(progressOf({ target_visit_points: 0, actual_visit_points: 0 }, 0)).toEqual({
      fill: 1,
      isBlazing: false,
    });
  });

  it('BR-015 nhánh 2 — target = 0 mà vẫn làm được: thanh đầy VÀ cháy', () => {
    // Không có `%` nào tồn tại (percent = null), nhưng đây là ca vượt rõ nhất.
    expect(progressOf({ target_sales_amount: 0, actual_sales_amount: 3_000_000 }, 1)).toEqual({
      fill: 1,
      isBlazing: true,
    });
  });

  it('chưa có số liệu cuối ngày → thanh rỗng, không cháy (component bỏ luôn thanh)', () => {
    expect(progressOf({ target_visit_points: 10, actual_visit_points: null }, 0)).toEqual({
      fill: 0,
      isBlazing: false,
    });
  });

  it('fill LUÔN nằm trong [0, 1] với mọi tổ hợp target/actual khó', () => {
    const AWKWARD = [0, 1, 3, 999, 100_000_000_000] as const;

    for (const target of AWKWARD) {
      for (const actual of AWKWARD) {
        const model = build({
          target_visit_points: target,
          target_sales_amount: target,
          target_revenue: target,
          target_customer_visits: target,
          actual_visit_points: actual,
          actual_sales_amount: actual,
          actual_revenue: actual,
          actual_customer_visits: actual,
        });

        for (const row of model.metrics) {
          expect(row.progress.fill).toBeGreaterThanOrEqual(0);
          expect(row.progress.fill).toBeLessThanOrEqual(1);
          expect(Number.isFinite(row.progress.fill)).toBe(true);
        }
      }
    }
  });

  it('bản SÁNG không có cột "Hoàn thành" nên mọi thanh đều rỗng', () => {
    const model = build({
      status: 'MORNING_SUBMITTED',
      actual_visit_points: null,
      actual_sales_amount: null,
      actual_revenue: null,
      actual_customer_visits: null,
    });

    expect(model.metrics.every((row) => row.progress.fill === 0)).toBe(true);
    expect(model.metrics.every((row) => !row.progress.isBlazing)).toBe(true);
  });
});

describe('buildShareCardModel — cụm "Tình trạng thực hiện" (PHASE 19, DEC-070)', () => {
  it('bốn dòng KPI đúng thứ tự và ba số liệu AMIS nối tiếp bảng', () => {
    expect(build().performance?.rows.map((row) => row.label)).toEqual([
      'Doanh số đã ghi',
      'Doanh thu đã ghi',
      'SL KH đã ghé thăm',
      'SL KH đã mua hàng',
    ]);
    expect(build().performance?.supplementaryMetrics.map((metric) => metric.label)).toEqual([
      'SL ĐH đã ghi',
      'Giá trị trung bình 1 đơn',
      'Giá trị hàng hóa trả hàng',
    ]);
  });

  it('tiêu đề cố định, không kèm tên tháng như cụm DEC-068 đã bỏ', () => {
    expect(build().performance?.title).toBe('TÌNH TRẠNG THỰC HIỆN');
  });

  it('bốn cột số dùng dạng RÚT GỌN — cụm có 4 cột trong một khối hẹp', () => {
    const rows = build().performance?.rows;

    expect(rows?.map((row) => row.targetText)).toEqual(['500tr', '300tr', '120 khách', '96 khách']);
    expect(rows?.map((row) => row.actualText)).toEqual(['420tr', '210tr', '96 khách', '48 khách']);
  });

  it('`%` đi qua ĐÚNG calculateAchievement của bảng chính — không có công thức thứ hai (NFR-012)', () => {
    const rows = build().performance?.rows;

    expect(rows?.map((row) => row.achievement.display)).toEqual([
      '84,0%',
      '70,0%',
      '80,0%',
      '50,0%',
    ]);
    // BR-023 trên bốn tỉ lệ lệch nhau: 84 và 80 là NEAR, 70 và 50 là MISSED.
    expect(rows?.map((row) => row.achievement.status)).toEqual([
      'NEAR',
      'MISSED',
      'NEAR',
      'MISSED',
    ]);
  });

  it('dải số liệu AMIS bổ sung hiển thị số đơn, trung bình đơn và hàng trả lại', () => {
    expect(build().performance?.supplementaryMetrics.map((metric) => metric.valueText)).toEqual([
      '12 đơn',
      '35tr',
      '30tr',
    ]);
  });

  it('số đơn bằng 0 không làm giá trị trung bình thành Infinity', () => {
    const metrics = build(
      {},
      { ...PERFORMANCE, amisOrderCount: 0 },
    ).performance?.supplementaryMetrics;

    expect(metrics?.[0]?.valueText).toBe('0 đơn');
    expect(metrics?.[1]?.valueText).toBe('—');
  });

  it('chưa giao chỉ tiêu tháng → doanh thu cộng từ báo cáo, KHÔNG từ AMIS', () => {
    // AMIS biết đã thu được bao nhiêu nhưng không biết mục tiêu là bao nhiêu.
    const model = build({}, { ...PERFORMANCE, targetRevenue: 700_000_000 });

    expect(model.performance?.rows[1]?.targetText).toBe('700tr');
    // Ba dòng kia không nhúc nhích khi đổi con số của báo cáo.
    expect(model.performance?.rows[0]?.targetText).toBe('500tr');
  });

  it('chỉ tiêu tháng của Admin THẮNG cả AMIS lẫn tổng cam kết ngày (DEC-071)', () => {
    // Đây là lỗi thật đã lên ảnh production: bảng KPI công ty ghi 640tr doanh thu
    // cho Ngô Thế San nhưng ảnh in 200tr, vì 200tr là tổng cam kết NGÀY của anh.
    const model = build(
      {},
      {
        ...PERFORMANCE,
        monthlyTargetSalesAmount: 800_000_000,
        monthlyTargetRevenue: 640_000_000,
      },
    );

    expect(model.performance?.rows[0]?.targetText).toBe('800tr');
    expect(model.performance?.rows[1]?.targetText).toBe('640tr');
    // Hai dòng khách không đi qua bảng chỉ tiêu tháng.
    expect(model.performance?.rows[2]?.targetText).toBe('120 khách');
    expect(model.performance?.rows[3]?.targetText).toBe('96 khách');
  });

  it('giao MỘT trong hai thì dòng còn lại vẫn dùng đường lùi', () => {
    const model = build({}, { ...PERFORMANCE, monthlyTargetRevenue: 640_000_000 });

    expect(model.performance?.rows[1]?.targetText).toBe('640tr');
    // Doanh số chưa giao ⇒ giữ `target_amount` của AMIS.
    expect(model.performance?.rows[0]?.targetText).toBe('500tr');
  });

  it('chỉ tiêu tháng bằng 0 là con số HỢP LỆ, không rơi về đường lùi', () => {
    // `??` chứ không `||`. BR-015 có hẳn nhánh cho `target = 0`: đã thu được tiền
    // trong khi chỉ tiêu là 0 thì đó là VƯỢT KẾ HOẠCH, `percent` bằng `null`.
    const model = build({}, { ...PERFORMANCE, monthlyTargetRevenue: 0 });

    expect(model.performance?.rows[1]?.achievement.percent).toBeNull();
  });

  it('chỉ tiêu dòng "đã mua hàng" là số khách ĐÃ TƯƠNG TÁC, không phải số khách phụ trách', () => {
    // Đòi bán cho toàn bộ 120 khách phụ trách trong một tháng là mục tiêu không
    // ai đặt; mốc đúng là 96 khách đã gặp được.
    const rows = build().performance?.rows;

    expect(rows?.[3]?.targetText).toBe('96 khách');
    expect(rows?.[2]?.targetText).toBe('120 khách');
  });

  it('dòng phụ in mốc ĐỒNG BỘ, không phải ngày báo cáo — số có thể cũ vài ngày', () => {
    // Báo cáo là ngày 07/08 nhưng lần đồng bộ gần nhất là 15/08.
    expect(build().performance?.rangeText).toBe('Số liệu MISA tính đến 15/08/2026');
  });

  it('đồng bộ lúc 2h sáng giờ VN KHÔNG bị in lùi một ngày', () => {
    // 19:00 UTC ngày 15 = 02:00 giờ VN ngày 16. Cắt thô 10 ký tự chuỗi ISO sẽ ra
    // 15/08 và người đọc tưởng số cũ hơn thực tế.
    const model = build({}, { ...PERFORMANCE, syncedAt: '2026-08-15T19:00:00Z' });

    expect(model.performance?.rangeText).toBe('Số liệu MISA tính đến 16/08/2026');
  });

  it('chưa đồng bộ lần nào → nói thẳng ra, không im lặng bỏ dòng phụ', () => {
    const model = build({}, { ...PERFORMANCE, syncedAt: null });

    expect(model.performance?.rangeText).toBe('Chưa rõ mốc đồng bộ từ MISA');
    // Bốn dòng KPI và dải ba số liệu phụ vẫn còn — chỉ mốc thời gian là chưa biết.
    expect(model.performance?.rows).toHaveLength(4);
    expect(model.performance?.supplementaryMetrics).toHaveLength(3);
  });

  it('timestamp rác cũng rơi về "chưa rõ mốc" thay vì in Invalid Date', () => {
    const model = build({}, { ...PERFORMANCE, syncedAt: 'hôm qua' });

    expect(model.performance?.rangeText).toBe('Chưa rõ mốc đồng bộ từ MISA');
  });

  it('chưa map amis_employee_name → BỎ HẲN cụm, không in bốn dấu gạch', () => {
    // Một khối trống trên tấm ảnh gửi cấp trên trông như lỗi hệ thống.
    expect(build({}, null).performance).toBeNull();
  });

  it('thiếu số AMIS lẻ tẻ thì dòng đó PENDING, cụm vẫn còn', () => {
    const model = build({}, { ...PERFORMANCE, amisSalesActual: null });

    expect(model.performance).not.toBeNull();
    expect(model.performance?.rows[0]?.achievement.status).toBe('PENDING');
    // Ba dòng còn lại không bị kéo theo.
    expect(model.performance?.rows[1]?.achievement.status).toBe('MISSED');
  });

  it('CẢ HAI biến thể đều có cụm — số AMIS là luỹ kế tháng, không đợi thực đạt hôm nay', () => {
    const morning = build(
      { status: 'MORNING_SUBMITTED', actual_sales_amount: null, actual_revenue: null },
      PERFORMANCE,
    );

    expect(morning.performance).not.toBeNull();
    expect(build().performance).not.toBeNull();
  });
});

describe('shareMonthRange — mốc dừng theo biến thể (PHASE 17, DEC-068)', () => {
  it('bản CHIỀU cộng tới hết chính ngày báo cáo', () => {
    // Câu chốt của người dùng: "chiều ngày 21 tháng 9 → từ ngày 1 đến 21".
    expect(shareMonthRange('2026-09-21', 'EVENING')).toEqual({
      month: '2026-09',
      from: '2026-09-01',
      to: '2026-09-21',
      isEmpty: false,
    });
  });

  it('bản SÁNG dừng ở HÔM QUA — hôm nay chưa có thực đạt nào', () => {
    // "sáng ngày 21 tháng 9 thì chỉ cộng đến chỉ số thực đạt của 20".
    expect(shareMonthRange('2026-09-21', 'MORNING')).toEqual({
      month: '2026-09',
      from: '2026-09-01',
      to: '2026-09-20',
      isEmpty: false,
    });
  });

  it('bản SÁNG của ngày 01 → khoảng rỗng, KHÔNG tụt sang tháng trước', () => {
    // Mốc dừng rơi vào 31/08 nhưng THÁNG phải cộng vẫn là tháng 9. Suy tháng ra
    // từ mốc dừng sẽ cộng nhầm nguyên tháng 8 vào một tấm ảnh của tháng 9.
    expect(shareMonthRange('2026-09-01', 'MORNING')).toEqual({
      month: '2026-09',
      from: '2026-09-01',
      to: '2026-08-31',
      isEmpty: true,
    });
  });

  it('bản SÁNG của ngày 01 tháng 3 lùi đúng qua tháng 2 năm nhuận', () => {
    expect(shareMonthRange('2028-03-01', 'MORNING')?.to).toBe('2028-02-29');
  });

  it('ngày rác → null, tầng gọi bỏ cụm thay vì đoán một khoảng', () => {
    expect(shareMonthRange('2026-02-30', 'EVENING')).toBeNull();
    expect(shareMonthRange('không-phải-ngày', 'MORNING')).toBeNull();
  });
});

describe('buildShareCardModel — hai biến thể thẻ (PHASE 14, DEC-058)', () => {
  /** Một báo cáo mới chỉ có cam kết sáng: bốn cột `actual_*` đều `null`. */
  const morning = () =>
    build({
      status: 'MORNING_SUBMITTED',
      actual_visit_points: null,
      actual_sales_amount: null,
      actual_revenue: null,
      actual_customer_visits: null,
      actual_route: null,
      evening_note: null,
    });

  it('status quyết định biến thể — client KHÔNG chọn được', () => {
    expect(morning().variant).toBe('MORNING');
    expect(build().variant).toBe('EVENING');
  });

  it('chữ trên đầu thẻ nói rõ đây là ảnh nào', () => {
    expect(morning().kindLabel).toBe('CAM KẾT ĐẦU NGÀY');
    expect(build().kindLabel).toBe('KẾT QUẢ CUỐI NGÀY');
  });

  it('bản sáng KHÔNG có cột thực đạt, nhưng VẪN có cụm tình trạng thực hiện (DEC-070)', () => {
    expect(morning().variant).toBe('MORNING');
    expect(morning().performance).not.toBeNull();
  });

  it('bản sáng vẫn đủ 4 dòng cam kết, lấy tuyến KẾ HOẠCH', () => {
    const model = morning();

    expect(model.metrics.map((row) => row.targetText)).toEqual([
      '8 điểm',
      '5 ₫',
      '150tr',
      '12 khách',
    ]);
    expect(model.routeText).toBe('Quận 1 → Quận 3');
  });

  it('bản sáng: cột thực đạt là "—" và badge là "Chờ số liệu" (BR-023)', () => {
    const model = morning();

    expect(model.metrics.map((row) => row.actualText)).toEqual(['—', '—', '—', '—']);
    expect(model.metrics.every((row) => row.achievement.status === 'PENDING')).toBe(true);
  });
});

describe('Edge case bắt buộc của Phase 6', () => {
  it('tên 40+ ký tự KHÔNG bị cắt — thẻ xuống dòng, không cụt tên người', () => {
    const longName = 'Nguyễn Trần Hoàng Phương Thảo Vy Quỳnh Anh Ngọc';
    expect(longName.length).toBeGreaterThan(40);
    expect(build({ sales: { full_name: longName, employee_code: 'NV-1' } }).salesName).toBe(
      longName.toLocaleUpperCase('vi-VN'),
    );
  });

  it('tuyến 300 ký tự bị cắt an toàn và có dấu …', () => {
    const route = 'Quận Bình Thạnh '.repeat(30).slice(0, 300);
    const { routeText } = build({ actual_route: route });

    expect(route).toHaveLength(300);
    expect(routeText).not.toBeNull();
    expect(routeText?.length).toBeLessThanOrEqual(MAX_SHARE_ROUTE_CHARS);
    expect(routeText?.endsWith('…')).toBe(true);
  });

  it('ghi chú 1000 ký tự bị cắt an toàn và có dấu …', () => {
    const note = 'Khách hẹn lại tuần sau. '.repeat(50).slice(0, 1000);
    // `null` ở tham số hai: từ PHASE 19 cụm AMIS chiếm hết chỗ của ghi chú, nên
    // phép cắt chỉ quan sát được ở thẻ KHÔNG có cụm.
    const { noteText } = build({ evening_note: note }, null);

    expect(note).toHaveLength(1000);
    expect(noteText?.length).toBeLessThanOrEqual(MAX_SHARE_NOTE_CHARS);
    expect(noteText?.endsWith('…')).toBe(true);
  });

  it('ghi chú rỗng / chỉ khoảng trắng → null, thẻ bỏ hẳn khối ghi chú', () => {
    expect(build({}, null).noteText).toBeNull();
    expect(build({ evening_note: '   \n  ' }, null).noteText).toBeNull();
  });

  it('doanh thu 12 chữ số vẫn vừa khung nhờ dạng rút gọn trong bảng', () => {
    const model = build({ target_revenue: 100_000_000_000, actual_revenue: 99_999_999_999 });
    const revenue = model.metrics[2];

    expect(revenue?.targetText).toBe('100tỷ');
    expect(revenue?.actualText).toBe('100tỷ');
  });

  it('achievement 4 chữ số hiển thị đủ, KHÔNG clamp về 100% (BR-004)', () => {
    const model = build({ target_sales_amount: 8, actual_sales_amount: 100 });
    expect(model.metrics[1]?.achievement.display).toBe('1.250,0%');
  });

  it('BR-015 nhánh 1 — target = 0 và actual = 0 → 100,0%', () => {
    const model = build({ target_visit_points: 0, actual_visit_points: 0 });
    expect(model.metrics[0]?.achievement.display).toBe('100,0%');
    expect(model.metrics[0]?.achievement.status).toBe('EXCEEDED');
  });

  it('BR-015 nhánh 2 — target = 0 và actual > 0 → số vượt tuyệt đối có đơn vị', () => {
    const model = build({ target_sales_amount: 0, actual_sales_amount: 3 });
    expect(model.metrics[1]?.achievement.display).toBe('+3 ₫');
    expect(model.metrics[1]?.achievement.surplus).toBe(3);
    expect(model.metrics[1]?.achievement.percent).toBeNull();
  });

  it('KHÔNG một chuỗi nào của thẻ chứa NaN, Infinity hay ∞ (BR-015)', () => {
    // Quét lưới: mọi tổ hợp target/actual "khó" trên cả bốn chỉ tiêu.
    const AWKWARD = [0, 1, 3, 999, 100_000_000_000] as const;

    for (const target of AWKWARD) {
      for (const actual of AWKWARD) {
        const model = build({
          target_visit_points: target,
          target_sales_amount: target,
          target_revenue: target,
          target_customer_visits: target,
          actual_visit_points: actual,
          actual_sales_amount: actual,
          actual_revenue: actual,
          actual_customer_visits: actual,
        });

        const text = [
          model.dateText,
          model.salesName,
          model.kindLabel,
          model.performance?.title ?? '',
          model.performance?.rangeText ?? '',
          ...(model.performance?.rows.flatMap((row) => [
            row.label,
            row.targetText,
            row.actualText,
            row.achievement.display,
          ]) ?? []),
          ...(model.performance?.supplementaryMetrics.flatMap((metric) => [
            metric.label,
            metric.valueText,
          ]) ?? []),
          ...model.metrics.flatMap((row) => [row.targetText, row.actualText, row.achievement.display]),
        ].join(' | ');

        expect(text).not.toMatch(/NaN|Infinity|∞|undefined|null/);
      }
    }
  });
});

describe('truncateText — cắt ở tầng dữ liệu vì Satori không có line-clamp', () => {
  it('chuỗi ngắn hơn ngưỡng giữ nguyên (đã trim)', () => {
    expect(truncateText('  Quận 1 → Quận 3  ', 50)).toBe('Quận 1 → Quận 3');
  });

  it('cắt ở ranh giới TỪ, không cắt giữa một từ', () => {
    expect(truncateText('Quận Bình Thạnh và Thủ Đức', 12)).toBe('Quận Bình…');
  });

  it('chuỗi dài liền mạch không có khoảng trắng thì cắt cứng', () => {
    const result = truncateText('a'.repeat(200), 10);
    expect(result).toBe(`${'a'.repeat(9)}…`);
    expect(result).toHaveLength(10);
  });

  it('kết quả không bao giờ dài hơn ngưỡng', () => {
    for (const length of [1, 2, 5, 40, 104, 232]) {
      expect(truncateText('Quận Bình Thạnh '.repeat(40), length).length).toBeLessThanOrEqual(length);
    }
  });
});

describe('shareImageFileName — FR-019', () => {
  it('dùng tên ngắn cho báo cáo cuối ngày', () => {
    expect(shareImageFileName('Nguyễn Văn A', '2026-08-07', 'EVENING')).toBe(
      'Bao_Cao_Cuoi_Ngay_2026-08-07.png',
    );
  });

  it('hai tấm ảnh của CÙNG một ngày có tên khác nhau — DEC-058', () => {
    // Nếu hai tên trùng nhau, tấm chiều ghi đè tấm sáng trong thư mục Tải về.
    expect(shareImageFileName('Nguyễn Văn A', '2026-08-07', 'MORNING')).toBe(
      'Bao_Cao_Ngay_2026-08-07.png',
    );
    expect(shareImageFileName('Nguyễn Văn A', '2026-08-07', 'MORNING')).not.toBe(
      shareImageFileName('Nguyễn Văn A', '2026-08-07', 'EVENING'),
    );
  });

  it('xử lý được đ/Đ — chữ mà normalize("NFD") KHÔNG tách ra được', () => {
    expect(asciiNameSlug('Đỗ Thị Hường')).toBe('Do-Thi-Huong');
    expect(asciiNameSlug('Nguyễn Đình Đức')).toBe('Nguyen-Dinh-Duc');
    // Cả chữ thường — người dùng gõ nhanh không viết hoa vẫn phải ra tên file đúng.
    expect(asciiNameSlug('lê văn đức')).toBe('le-van-duc');
  });

  it('gộp ký tự lạ thành một dấu nối và không để dấu nối ở hai đầu', () => {
    expect(asciiNameSlug('  Trần   Văn (B) ')).toBe('Tran-Van-B');
  });

  it('không đưa tên Sales vào tên file hiển thị trong Zalo', () => {
    expect(shareImageFileName('。。。', '2026-08-07', 'EVENING')).toBe(
      'Bao_Cao_Cuoi_Ngay_2026-08-07.png',
    );
  });

  it('ngày giữ nguyên YYYY-MM-DD để tên file sắp xếp được theo thời gian', () => {
    const names = ['2026-08-07', '2026-08-09', '2026-12-01']
      .map((date) => shareImageFileName('A', date, 'EVENING'))
      .sort();

    expect(names).toEqual([
      'Bao_Cao_Cuoi_Ngay_2026-08-07.png',
      'Bao_Cao_Cuoi_Ngay_2026-08-09.png',
      'Bao_Cao_Cuoi_Ngay_2026-12-01.png',
    ]);
  });
});

describe('shareImagePath', () => {
  it('trỏ đúng Route Handler duy nhất của dự án (DEC-003)', () => {
    expect(shareImagePath('11111111-2222-3333-4444-555555555555')).toBe(
      '/api/reports/11111111-2222-3333-4444-555555555555/share-image',
    );
  });
});

describe('shareImageViewPath — DEC-061', () => {
  it('là CHÍNH route ảnh, chỉ thêm tham số xem', () => {
    const id = '11111111-2222-3333-4444-555555555555';

    expect(shareImageViewPath(id)).toBe(`${shareImagePath(id)}?view=1`);
  });

  it('KHÔNG đổi chế độ mặc định: không tham số thì vẫn là đường tải về', () => {
    // Máy tính không có "thư viện ảnh"; đổi mặc định sang `inline` là làm hỏng
    // hành vi tải file mà người dùng máy tính đã quen (DEC-060).
    expect(shareImagePath('11111111-2222-3333-4444-555555555555')).not.toContain('view');
  });
});
