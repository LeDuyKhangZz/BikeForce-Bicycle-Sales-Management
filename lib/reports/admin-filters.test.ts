/**
 * Unit test cho `lib/reports/admin-filters.ts` — PHASE 9, FR-025/FR-026.
 *
 * Năm chiều lọc nhân với "mọi giá trị đều đến từ URL" cho ra rất nhiều tổ hợp
 * hỏng. Ba nhóm bài quan trọng nhất:
 *   • **thứ tự ưu tiên** khi nhiều chiều ngày cùng bật (hẹp nhất thắng);
 *   • **đầu vào rác** không bao giờ được đi tới Postgres (`?salesId=abc` sẽ làm
 *     câu lệnh hỏng bằng `22P02`);
 *   • **URL sinh ra phải khứ hồi được** — nếu không, nút phân trang và link tải
 *     CSV sẽ trỏ tới một bộ lọc khác với bảng đang hiển thị (FR-034).
 */
import { describe, expect, it } from 'vitest';

import {
  adminReportsPath,
  hasActiveFilters,
  parseAdminReportFilters,
  MAX_SEARCH_LENGTH,
  type AdminReportSearchParams,
} from './admin-filters';

describe('parseAdminReportFilters — chiều ngày', () => {
  it('không tham số nào → không lọc ngày', () => {
    const filters = parseAdminReportFilters({});
    expect(filters.range).toBeNull();
    expect(filters.dateMode).toBe('ALL');
  });

  it('một ngày cụ thể → khoảng một ngày, inclusive hai đầu', () => {
    const filters = parseAdminReportFilters({ date: '2026-08-07' });
    expect(filters.range).toEqual({ from: '2026-08-07', to: '2026-08-07' });
    expect(filters.dateMode).toBe('DAY');
  });

  it('khoảng ngày đủ hai đầu', () => {
    const filters = parseAdminReportFilters({ from: '2026-08-01', to: '2026-08-15' });
    expect(filters.range).toEqual({ from: '2026-08-01', to: '2026-08-15' });
    expect(filters.dateMode).toBe('RANGE');
  });

  it('cả tháng', () => {
    const filters = parseAdminReportFilters({ month: '2026-02' });
    expect(filters.range).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(filters.dateMode).toBe('MONTH');
  });

  it('tháng 2 năm nhuận qua đường lọc tháng', () => {
    expect(parseAdminReportFilters({ month: '2028-02' }).range).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    });
  });

  /** ⚠ Thứ tự ưu tiên — hẹp nhất thắng. */
  it.each([
    [
      'date thắng cả from/to lẫn month',
      { date: '2026-08-07', from: '2026-08-01', to: '2026-08-31', month: '2026-08' },
      'DAY',
      { from: '2026-08-07', to: '2026-08-07' },
    ],
    [
      'from/to thắng month',
      { from: '2026-08-01', to: '2026-08-15', month: '2026-08' },
      'RANGE',
      { from: '2026-08-01', to: '2026-08-15' },
    ],
  ] as const)('%s', (_label, params, expectedMode, expectedRange) => {
    const filters = parseAdminReportFilters(params);
    expect(filters.dateMode).toBe(expectedMode);
    expect(filters.range).toEqual(expectedRange);
  });

  it('chọn ngược từ/đến thì TỰ ĐẢO thay vì trả về rỗng', () => {
    const filters = parseAdminReportFilters({ from: '2026-08-31', to: '2026-08-01' });
    expect(filters.range).toEqual({ from: '2026-08-01', to: '2026-08-31' });
    expect(filters.raw.from).toBe('2026-08-01');
    expect(filters.raw.to).toBe('2026-08-31');
  });

  it('thiếu MỘT đầu của khoảng → rơi xuống chiều tiếp theo', () => {
    expect(parseAdminReportFilters({ from: '2026-08-01' }).dateMode).toBe('ALL');
    expect(parseAdminReportFilters({ from: '2026-08-01', month: '2026-08' }).dateMode).toBe(
      'MONTH',
    );
  });

  it.each([
    ['ngày không tồn tại', { date: '2026-02-30' }],
    ['ngày sai định dạng', { date: '07/08/2026' }],
    ['tháng 13', { month: '2026-13' }],
    ['chuỗi rác', { date: 'abc', month: 'xyz' }],
    ['khoảng có một đầu rác', { from: '2026-08-01', to: 'abc' }],
  ])('%s → bỏ qua, không lọc ngày, KHÔNG throw', (_label, params) => {
    expect(() => parseAdminReportFilters(params)).not.toThrow();
    const filters = parseAdminReportFilters(params);
    expect(filters.range).toBeNull();
    expect(filters.dateMode).toBe('ALL');
  });

  it('khoảng trả về luôn có from <= to', () => {
    const cases: AdminReportSearchParams[] = [
      { date: '2026-08-07' },
      { from: '2026-08-31', to: '2026-08-01' },
      { month: '2026-12' },
      { month: '2028-02' },
    ];

    for (const params of cases) {
      const range = parseAdminReportFilters(params).range;
      expect(range).not.toBeNull();
      expect(String(range?.from) <= String(range?.to)).toBe(true);
    }
  });
});

describe('parseAdminReportFilters — Sales, trạng thái, tìm kiếm', () => {
  const uuid = '8f1c0000-0000-4000-8000-000000000001';

  it('salesId hợp lệ được giữ', () => {
    expect(parseAdminReportFilters({ salesId: uuid }).salesId).toBe(uuid);
  });

  /** ⚠ Không lọt xuống Postgres: `?salesId=abc` gây lỗi `22P02`. */
  it.each([
    ['chuỗi rác', 'abc'],
    ['thiếu đoạn', '8f1c0000-0000-4000-8000'],
    ['chuỗi rỗng', ''],
    ['SQL injection thử', "' or 1=1--"],
  ])('salesId %s → null, không đi tới database', (_label, raw) => {
    expect(parseAdminReportFilters({ salesId: raw }).salesId).toBeNull();
  });

  it.each([
    ['MORNING_SUBMITTED', 'MORNING_SUBMITTED'],
    ['COMPLETED', 'COMPLETED'],
  ])('trạng thái hợp lệ %s được giữ', (_label, raw) => {
    expect(parseAdminReportFilters({ status: raw }).status).toBe(raw);
  });

  it.each([
    ['giá trị không có trong enum', 'DELETED'],
    ['chữ thường', 'completed'],
    ['chuỗi rỗng', ''],
  ])('trạng thái %s → null', (_label, raw) => {
    expect(parseAdminReportFilters({ status: raw }).status).toBeNull();
  });

  it('ô tìm kiếm được trim; chuỗi toàn khoảng trắng thành null', () => {
    expect(parseAdminReportFilters({ q: '  Khang  ' }).search).toBe('Khang');
    expect(parseAdminReportFilters({ q: '   ' }).search).toBeNull();
    expect(parseAdminReportFilters({ q: '' }).search).toBeNull();
  });

  it('ô tìm kiếm bị cắt ở trần độ dài — không đẩy chuỗi khổng lồ vào ilike', () => {
    const long = 'a'.repeat(MAX_SEARCH_LENGTH + 500);
    expect(parseAdminReportFilters({ q: long }).search).toHaveLength(MAX_SEARCH_LENGTH);
  });

  it('dấu tiếng Việt trong ô tìm kiếm được giữ nguyên', () => {
    expect(parseAdminReportFilters({ q: 'Lê Duy Khang' }).search).toBe('Lê Duy Khang');
  });
});

describe('hasActiveFilters', () => {
  it('không có gì → false', () => {
    expect(hasActiveFilters(parseAdminReportFilters({}))).toBe(false);
  });

  it.each([
    ['ngày', { date: '2026-08-07' }],
    ['tháng', { month: '2026-08' }],
    ['trạng thái', { status: 'COMPLETED' }],
    ['tìm kiếm', { q: 'Khang' }],
    ['Sales', { salesId: '8f1c0000-0000-4000-8000-000000000001' }],
  ])('có %s → true', (_label, params) => {
    expect(hasActiveFilters(parseAdminReportFilters(params))).toBe(true);
  });

  it('tham số rác không tính là bộ lọc đang bật', () => {
    expect(hasActiveFilters(parseAdminReportFilters({ date: 'abc', status: 'XXX' }))).toBe(false);
  });
});

describe('adminReportsPath — URL phải khứ hồi được', () => {
  it('không lọc gì → đường dẫn trần', () => {
    expect(adminReportsPath(parseAdminReportFilters({}))).toBe('/admin/reports');
  });

  it('page = 1 được lược bỏ khỏi URL', () => {
    const filters = parseAdminReportFilters({ month: '2026-08' });
    expect(adminReportsPath(filters, { page: 1 })).toBe('/admin/reports?month=2026-08');
    expect(adminReportsPath(filters, { page: 3 })).toBe('/admin/reports?month=2026-08&page=3');
  });

  /**
   * ⚠ Bài quan trọng nhất của nhóm này: parse → build → parse phải cho ra đúng
   * bộ lọc ban đầu. Nếu không, nút "Trang sau" và link tải CSV sẽ trỏ tới một
   * tập dữ liệu khác với bảng đang hiển thị.
   */
  it.each([
    ['một ngày', { date: '2026-08-07' }],
    ['khoảng ngày', { from: '2026-08-01', to: '2026-08-15' }],
    ['tháng', { month: '2026-08' }],
    ['trạng thái + tìm kiếm', { status: 'COMPLETED', q: 'Lê Duy Khang' }],
    [
      'đủ mọi chiều',
      {
        month: '2026-08',
        salesId: '8f1c0000-0000-4000-8000-000000000001',
        status: 'MORNING_SUBMITTED',
        q: 'Khang',
      },
    ],
  ])('%s: parse → build → parse cho kết quả giống hệt', (_label, params) => {
    const first = parseAdminReportFilters(params);
    const url = new URL(adminReportsPath(first), 'https://bikeforce.test');
    const roundTripped = parseAdminReportFilters(
      Object.fromEntries(url.searchParams.entries()) as AdminReportSearchParams,
    );

    expect(roundTripped.range).toEqual(first.range);
    expect(roundTripped.salesId).toBe(first.salesId);
    expect(roundTripped.status).toBe(first.status);
    expect(roundTripped.search).toBe(first.search);
    expect(roundTripped.dateMode).toBe(first.dateMode);
  });

  it('ký tự đặc biệt trong ô tìm kiếm được mã hoá đúng', () => {
    const filters = parseAdminReportFilters({ q: 'Lê & Khang' });
    const url = new URL(adminReportsPath(filters), 'https://bikeforce.test');

    expect(url.searchParams.get('q')).toBe('Lê & Khang');
  });
});
