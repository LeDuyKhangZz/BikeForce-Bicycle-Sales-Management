/**
 * Unit test cho `lib/reports/csv.ts` — PHASE 9, FR-034.
 *
 * Bốn cái bẫy thật của dữ liệu BikeForce đều có bài riêng: dấu phẩy trong tuyến,
 * xuống dòng trong ghi chú, dấu nháy kép, và BOM cho Excel tiếng Việt.
 */
import { describe, expect, it } from 'vitest';

import { buildCsv, csvFileName, escapeCell, UTF8_BOM } from './csv';

describe('escapeCell', () => {
  it.each([
    ['chuỗi thường không bị bọc', 'Quận 1', 'Quận 1'],
    ['số giữ nguyên dạng số', 125_000_000, '125000000'],
    ['số 0 KHÔNG thành chuỗi rỗng', 0, '0'],
    ['boolean', true, 'true'],
    ['null → ô rỗng', null, ''],
    ['undefined → ô rỗng', undefined, ''],
  ])('%s', (_label, input, expected) => {
    expect(escapeCell(input)).toBe(expected);
  });

  it('dấu phẩy trong tuyến → bọc dấu nháy kép', () => {
    expect(escapeCell('Quận 1, Quận 3, Quận 5')).toBe('"Quận 1, Quận 3, Quận 5"');
  });

  it('xuống dòng trong ghi chú → bọc, giữ nguyên ký tự xuống dòng', () => {
    expect(escapeCell('Dòng 1\nDòng 2')).toBe('"Dòng 1\nDòng 2"');
    expect(escapeCell('Dòng 1\r\nDòng 2')).toBe('"Dòng 1\r\nDòng 2"');
  });

  it('dấu nháy kép được NHÂN ĐÔI theo RFC 4180', () => {
    expect(escapeCell('Khách "VIP" đã chốt')).toBe('"Khách ""VIP"" đã chốt"');
  });

  it('ô chỉ toàn dấu nháy kép vẫn hợp lệ', () => {
    expect(escapeCell('"')).toBe('""""');
  });

  it('dấu tiếng Việt không bị đụng tới', () => {
    expect(escapeCell('Lê Duy Khang · ừ ẫ ợ ỹ đ Đ Ệ Ỡ ₫')).toBe(
      'Lê Duy Khang · ừ ẫ ợ ỹ đ Đ Ệ Ỡ ₫',
    );
  });
});

describe('buildCsv', () => {
  it('bắt đầu bằng BOM UTF-8 — nếu không, Excel làm hỏng dấu tiếng Việt', () => {
    const csv = buildCsv(['Ngày'], [['2026-08-07']]);
    expect(csv.startsWith(UTF8_BOM)).toBe(true);
  });

  it('dùng CRLF làm dấu ngắt dòng (RFC 4180)', () => {
    const csv = buildCsv(['A', 'B'], [['1', '2']]);
    expect(csv).toBe(`${UTF8_BOM}A,B\r\n1,2\r\n`);
  });

  it('dòng cuối cũng kết thúc bằng CRLF', () => {
    expect(buildCsv(['A'], [['1'], ['2']]).endsWith('\r\n')).toBe(true);
  });

  it('không có dòng dữ liệu vẫn ra file có tiêu đề', () => {
    expect(buildCsv(['Ngày', 'Sales'], [])).toBe(`${UTF8_BOM}Ngày,Sales\r\n`);
  });

  it('số cột của mọi dòng giữ nguyên khi ô chứa dấu phẩy', () => {
    const csv = buildCsv(
      ['Ngày', 'Tuyến', 'Doanh thu'],
      [['2026-08-07', 'Quận 1, Quận 3', 125_000_000]],
    );

    const dataLine = csv.replace(UTF8_BOM, '').split('\r\n')[1];
    expect(dataLine).toBe('2026-08-07,"Quận 1, Quận 3",125000000');
  });

  it('tiền là SỐ THÔ, không phải chuỗi đã format — để Excel cộng được', () => {
    const csv = buildCsv(['Doanh thu'], [[125_000_000]]);
    expect(csv).toContain('125000000');
    expect(csv).not.toContain('125.000.000');
    expect(csv).not.toContain('₫');
  });
});

describe('csvFileName', () => {
  it('ghép tiền tố với dấu thời gian', () => {
    expect(csvFileName('BikeForce Reports', '2026-08-07')).toBe(
      'BikeForce-Reports_2026-08-07.csv',
    );
  });

  /**
   * `asciiNameSlug` quy MỌI ký tự không phải chữ/số về dấu nối, kể cả gạch
   * dưới. Ghi lại ở đây để không ai ngạc nhiên khi đặt tiền tố có `_`.
   */
  it('gạch dưới trong tiền tố thành dấu nối; dấu ngăn cách với ngày vẫn là "_"', () => {
    expect(csvFileName('BikeForce_Reports', '2026-08-07')).toBe(
      'BikeForce-Reports_2026-08-07.csv',
    );
  });

  it('BỎ DẤU chứ không cắt mất chữ — dùng lại asciiNameSlug của Phase 6', () => {
    expect(csvFileName('Báo cáo tháng', '2026-08')).toBe('Bao-cao-thang_2026-08.csv');
    expect(csvFileName('Đơn hàng', '2026-08')).toBe('Don-hang_2026-08.csv');
  });

  it('kết quả luôn chỉ chứa ASCII an toàn', () => {
    for (const prefix of ['Báo cáo', 'a b c', 'x/y\\z', '"quote"']) {
      expect(csvFileName(prefix, '2026-08-07')).toMatch(/^[A-Za-z0-9_-]*_[0-9-]+\.csv$/);
    }
  });
});
