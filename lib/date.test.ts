/**
 * Unit test cho `lib/date.ts` — bảng case lấy nguyên từ `docs/08 §3.5`.
 *
 * Không I/O, không mạng, không DB (docs/08 §2.2). Toàn bộ case phụ thuộc thời
 * gian đều ĐÓNG BĂNG đồng hồ — nguyên tắc 4 của docs/08 §1.1: ngày nghiệp vụ
 * theo `Asia/Ho_Chi_Minh` là nguồn flaky lớn nhất của hệ thống này.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatVietnamDate, getVietnamToday, isValidVietnamDate } from './date';

afterEach(() => {
  vi.useRealTimers();
});

/** Đóng băng đồng hồ ở một mốc UTC tuyệt đối. */
function freezeAt(utcInstant: string): void {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(utcInstant));
}

describe('getVietnamToday — biên đổi ngày UTC (BR-005, NFR-011)', () => {
  /**
   * Việt Nam là UTC+7 và KHÔNG có DST, nên ngày nghiệp vụ đổi lúc 17:00Z của
   * ngày hôm trước. Đây là bảng quan trọng nhất của cả bộ unit test.
   */
  const CASES: ReadonlyArray<readonly [label: string, instant: string, expected: string]> = [
    ['một phút trước biên đổi ngày UTC', '2026-08-06T16:59:00Z', '2026-08-06'],
    ['một phút sau biên đổi ngày UTC', '2026-08-06T17:01:00Z', '2026-08-07'],
    ['đúng biên 17:00Z đã thuộc ngày mới', '2026-08-06T17:00:00Z', '2026-08-07'],
    ['23:30 giờ VN vẫn là ngày cũ', '2026-08-06T16:30:00Z', '2026-08-06'],
    ['00:30 giờ VN đã là ngày mới', '2026-08-06T17:30:00Z', '2026-08-07'],
    ['nửa đêm UTC vẫn là 07:00 sáng VN cùng ngày', '2026-08-07T00:00:00Z', '2026-08-07'],
    ['qua mốc đổi tháng', '2026-08-31T17:01:00Z', '2026-09-01'],
    ['qua mốc đổi năm', '2026-12-31T17:01:00Z', '2027-01-01'],
    ['năm nhuận 29/02', '2028-02-28T17:01:00Z', '2028-02-29'],
  ];

  it.each(CASES)('%s', (_label, instant, expected) => {
    freezeAt(instant);
    expect(getVietnamToday()).toBe(expected);
  });

  it('kết quả luôn đúng định dạng YYYY-MM-DD, không có T, không có Z', () => {
    for (const [, instant] of CASES) {
      freezeAt(instant);
      const today = getVietnamToday();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(today).not.toContain('T');
      expect(today).not.toContain('Z');
    }
  });

  /**
   * Dòng quan trọng nhất của bảng: CI chạy ở UTC còn máy dev ở
   * `Asia/Ho_Chi_Minh`. Nếu hàm vô tình rơi về `Date.prototype.getDate()` thì
   * một trong hai môi trường sẽ đỏ. `Pacific/Kiritimati` là UTC+14 — cố tình
   * chọn để chứng minh hàm không ăn theo timezone máy (NFR-011).
   */
  it('không phụ thuộc timezone của tiến trình', () => {
    const originalTz = process.env.TZ;

    try {
      for (const tz of ['UTC', 'America/New_York', 'Asia/Ho_Chi_Minh', 'Pacific/Kiritimati']) {
        process.env.TZ = tz;

        for (const [, instant, expected] of CASES) {
          freezeAt(instant);
          expect(getVietnamToday(), `TZ=${tz} tại ${instant}`).toBe(expected);
        }
      }
    } finally {
      // Trả lại nguyên trạng, nếu không các test file sau sẽ chạy ở UTC+14.
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
    }
  });
});

describe('isValidVietnamDate', () => {
  it.each([
    ['ngày thường', '2026-08-07', true],
    ['ngày đầu tháng', '2026-08-01', true],
    ['29/02 năm nhuận', '2028-02-29', true],
    ['29/02 năm KHÔNG nhuận', '2026-02-29', false],
    ['30/02 không tồn tại', '2026-02-30', false],
    ['tháng 13', '2026-13-01', false],
    ['ngày 32', '2026-08-32', false],
    ['định dạng dd/MM/yyyy', '07/08/2026', false],
    ['thiếu số 0 đứng đầu', '2026-8-7', false],
    ['chuỗi rác', 'not-a-date', false],
    ['chuỗi rỗng', '', false],
    ['có kèm giờ', '2026-08-07T00:00:00Z', false],
  ])('%s → %s', (_label, input, expected) => {
    expect(isValidVietnamDate(input)).toBe(expected);
  });
});

describe('formatVietnamDate', () => {
  it.each([
    // Thứ trong tuần đã được TÍNH bằng Intl, không viết tay (docs/08 §3.5.2).
    ['ngày mẫu của brief', '2026-08-07', 'Thứ Sáu, 07/08/2026'],
    ['chủ nhật', '2026-08-09', 'Chủ Nhật, 09/08/2026'],
    ['thứ bảy', '2026-08-01', 'Thứ Bảy, 01/08/2026'],
  ])('%s', (_label, input, expected) => {
    expect(formatVietnamDate(input)).toBe(expected);
  });

  it('ngày một chữ số vẫn có số 0 đứng đầu', () => {
    expect(formatVietnamDate('2026-08-01')).toMatch(/^.+, 01\/08\/2026$/);
  });

  /**
   * Bẫy kinh điển: `new Date('2026-08-07')` được hiểu là nửa đêm UTC. Ở một máy
   * đặt UTC+14, `getDate()` trả về ngày 07 nhưng ở UTC-5 lại là 06. Hàm phải cho
   * cùng một kết quả ở mọi timezone.
   */
  it('không lệch ngày do parse ISO theo timezone máy', () => {
    const originalTz = process.env.TZ;

    try {
      for (const tz of ['UTC', 'America/New_York', 'Pacific/Kiritimati']) {
        process.env.TZ = tz;
        expect(formatVietnamDate('2026-08-07'), `TZ=${tz}`).toBe('Thứ Sáu, 07/08/2026');
      }
    } finally {
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
    }
  });

  it.each([
    ['chuỗi rác', 'not-a-date'],
    ['ngày không tồn tại', '2026-02-30'],
    ['sai định dạng', '07/08/2026'],
    ['chuỗi rỗng', ''],
  ])('%s → trả "—", KHÔNG throw (DEC-033)', (_label, input) => {
    expect(() => formatVietnamDate(input)).not.toThrow();
    expect(formatVietnamDate(input)).toBe('—');
  });

  it('không bao giờ trả chuỗi chứa "Invalid Date"', () => {
    for (const input of ['not-a-date', '2026-02-30', '', '2026-13-01']) {
      expect(formatVietnamDate(input)).not.toContain('Invalid');
    }
  });
});
