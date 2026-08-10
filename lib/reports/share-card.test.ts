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
  truncateText,
  type ShareCardSource,
} from './share-card';

/** Đổi NBSP thành space thường để assertion đọc được bằng mắt. */
const nbsp = (value: string): string => value.replace(/\u00a0/g, ' ');

/**
 * Một báo cáo đã `COMPLETED` "bình thường" — mọi test bên dưới chỉ ghi đè đúng
 * trường nó quan tâm, nên đọc test là thấy ngay case đang kiểm là gì.
 */
const BASE: ShareCardSource = {
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

function build(overrides: Partial<ShareCardSource> = {}) {
  return buildShareCardModel({ ...BASE, ...overrides });
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
    expect(build().metrics.map((row) => row.label)).toEqual([
      'Viếng thăm',
      'Doanh số',
      'Công nợ',
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

  it('doanh thu thực đạt ở khối nhấn mạnh là số ĐẦY ĐỦ, không rút gọn', () => {
    expect(nbsp(build().revenueActualText)).toBe('125.000.000 ₫');
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

  it('doanh thu 12 chữ số vẫn vừa khung: rút gọn trong bảng, đầy đủ ở khối dưới', () => {
    const model = build({ target_revenue: 100_000_000_000, actual_revenue: 99_999_999_999 });
    const revenue = model.metrics[2];

    expect(revenue?.targetText).toBe('100tỷ');
    expect(revenue?.actualText).toBe('100tỷ');
    expect(nbsp(model.revenueActualText)).toBe('99.999.999.999 ₫');
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
          model.revenueActualText,
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
  it('bỏ dấu tiếng Việt và thay khoảng trắng bằng dấu nối', () => {
    expect(shareImageFileName('Nguyễn Văn A', '2026-08-07')).toBe(
      'BikeForce_Report_Nguyen-Van-A_2026-08-07.png',
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

  it('tên không còn ký tự ASCII nào vẫn cho ra tên file hợp lệ', () => {
    expect(shareImageFileName('。。。', '2026-08-07')).toBe(
      'BikeForce_Report_Sales_2026-08-07.png',
    );
  });

  it('ngày giữ nguyên YYYY-MM-DD để tên file sắp xếp được theo thời gian', () => {
    const names = ['2026-08-07', '2026-08-09', '2026-12-01']
      .map((date) => shareImageFileName('A', date))
      .sort();

    expect(names).toEqual([
      'BikeForce_Report_A_2026-08-07.png',
      'BikeForce_Report_A_2026-08-09.png',
      'BikeForce_Report_A_2026-12-01.png',
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
