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
  asciiNameSlug,
  buildShareCardModel,
  shareImageFileName,
  shareImagePath,
  shareImageViewPath,
  shareMonthRange,
  shareNoteBudget,
  truncateText,
  type ShareCardMonthlySource,
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
 * Lũy kế tháng mặc định — PHASE 17, DEC-068. Số đã cộng sẵn: view model KHÔNG
 * cộng gì, phép cộng thuộc `lib/reports/month-summary.ts` và có bộ test riêng.
 */
const MONTHLY: ShareCardMonthlySource = {
  range: { month: '2026-08', from: '2026-08-01', to: '2026-08-06', isEmpty: false },
  summary: {
    salesAmount: 320_000_000,
    revenue: 210_000_000,
    kpiAchievedDays: 4,
    reportedDays: 6,
  },
};

function build(
  overrides: Partial<ShareCardSource> = {},
  monthly: ShareCardMonthlySource | null = MONTHLY,
) {
  return buildShareCardModel({ ...BASE, ...overrides }, monthly);
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

  it('tên Sales xuống 2 dòng → ghi chú chỉ còn 1 dòng', () => {
    expect(shareNoteBudget(LONG_NAME, SHORT_ROUTE)).toBe(MAX_SHARE_NOTE_CHARS / 2);
  });

  it('tuyến xuống 2 dòng → ghi chú cũng chỉ còn 1 dòng', () => {
    expect(shareNoteBudget(SHORT_NAME, LONG_ROUTE)).toBe(MAX_SHARE_NOTE_CHARS / 2);
  });

  it('CẢ HAI cùng dài → ngân sách 0, tức BỎ HẲN khối ghi chú', () => {
    // Đây là ca đã render ra và thấy tận mắt: giữ khối ghi chú thì nó bị **chém
    // ngang** giữa dòng chữ, trông như ảnh lỗi.
    expect(shareNoteBudget(LONG_NAME, LONG_ROUTE)).toBe(0);
  });

  it('không có tuyến thì tuyến không ăn dòng nào', () => {
    expect(shareNoteBudget(SHORT_NAME, null)).toBe(MAX_SHARE_NOTE_CHARS);
  });

  it('ngân sách không bao giờ âm', () => {
    expect(shareNoteBudget('N'.repeat(200), 'R'.repeat(200))).toBe(0);
  });

  it('buildShareCardModel BỎ ghi chú khi ngân sách bằng 0', () => {
    const model = build({
      sales: { full_name: LONG_NAME, employee_code: 'KD-1' },
      planned_route: LONG_ROUTE,
      actual_route: LONG_ROUTE,
      evening_note: 'Khách hẹn lại tuần sau, đã gửi báo giá mới.',
    });

    expect(model.noteText).toBeNull();
    // Tuyến thì VẪN còn — nó là thông tin của chuyến đi, không phải phần phụ.
    expect(model.routeText).not.toBeNull();
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

describe('buildShareCardModel — cụm lũy kế tháng (PHASE 17, DEC-068)', () => {
  it('ba dòng đúng thứ tự người dùng yêu cầu: doanh số · doanh thu · ngày đạt KPI', () => {
    expect(build().monthly?.rows.map((row) => row.label)).toEqual([
      'Doanh số tháng',
      'Doanh thu tháng',
      'Ngày đạt KPI',
    ]);
  });

  it('hai dòng tiền dùng số ĐẦY ĐỦ, không rút gọn như trong bảng', () => {
    const rows = build().monthly?.rows;

    // ⚠ Ký tự trước `₫` là NO-BREAK SPACE U+00A0 (docs/08 §3.3).
    expect(rows?.[0]?.valueText).toBe('320.000.000 ₫');
    expect(rows?.[1]?.valueText).toBe('210.000.000 ₫');
  });

  it('dòng thứ ba đếm NGÀY, không phải phần trăm — BR-024', () => {
    expect(build().monthly?.rows[2]?.valueText).toBe('4 ngày');
  });

  it('tiêu đề nói rõ đang cộng tháng nào', () => {
    expect(build().monthly?.title).toBe('TỔNG THÁNG 08/2026');
  });

  it('dòng phụ nói rõ mốc dừng — người nhận Zalo không có ngữ cảnh nào khác', () => {
    expect(build().monthly?.rangeText).toBe('Tính đến hết ngày 06/08/2026');
  });

  it('khoảng RỖNG (ảnh sáng của ngày 01) vẫn hiện đủ ba dòng, nói thẳng là chưa có ngày nào', () => {
    const model = build(
      {},
      {
        range: { month: '2026-09', from: '2026-09-01', to: '2026-08-31', isEmpty: true },
        summary: { salesAmount: 0, revenue: 0, kpiAchievedDays: 0, reportedDays: 0 },
      },
    );

    expect(model.monthly?.rangeText).toBe('Chưa có ngày nào trong tháng');
    expect(model.monthly?.rows[2]?.valueText).toBe('0 ngày');
  });

  it('truy vấn hỏng → BỎ HẲN cụm, KHÔNG in 0 ₫ cho một tháng có thể có số liệu', () => {
    expect(build({}, null).monthly).toBeNull();
  });

  it('CẢ HAI biến thể đều có cụm — khác hẳn khối "Số khách làm việc" cũ (DEC-056)', () => {
    const morning = build(
      { status: 'MORNING_SUBMITTED', actual_sales_amount: null, actual_revenue: null },
      MONTHLY,
    );

    expect(morning.monthly).not.toBeNull();
    expect(build().monthly).not.toBeNull();
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

  it('bản sáng KHÔNG có cột thực đạt, nhưng VẪN có cụm lũy kế tháng (DEC-068)', () => {
    expect(morning().variant).toBe('MORNING');
    expect(morning().monthly).not.toBeNull();
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
    const { noteText } = build({ evening_note: note });

    expect(note).toHaveLength(1000);
    expect(noteText?.length).toBeLessThanOrEqual(MAX_SHARE_NOTE_CHARS);
    expect(noteText?.endsWith('…')).toBe(true);
  });

  it('ghi chú rỗng / chỉ khoảng trắng → null, thẻ bỏ hẳn khối ghi chú', () => {
    expect(build().noteText).toBeNull();
    expect(build({ evening_note: '   \n  ' }).noteText).toBeNull();
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
          model.monthly?.title ?? '',
          model.monthly?.rangeText ?? '',
          ...(model.monthly?.rows.flatMap((row) => [row.label, row.valueText]) ?? []),
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
