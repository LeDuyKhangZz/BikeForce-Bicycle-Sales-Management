/**
 * Unit test cho `lib/date.ts` — bảng case lấy nguyên từ `docs/08 §3.5`.
 *
 * Không I/O, không mạng, không DB (docs/08 §2.2). Toàn bộ case phụ thuộc thời
 * gian đều ĐÓNG BĂNG đồng hồ — nguyên tắc 4 của docs/08 §1.1: ngày nghiệp vụ
 * theo `Asia/Ho_Chi_Minh` là nguồn flaky lớn nhất của hệ thống này.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  formatVietnamDate,
  formatVietnamMonth,
  formatVietnamDateTime,
  formatVietnamShortDate,
  getVietnamCurrentMonth,
  getVietnamMonthRange,
  getVietnamMonthToDateRange,
  getVietnamToday,
  isValidVietnamDate,
  resolveVietnamMonth,
  shiftVietnamDate,
  shiftVietnamMonth,
} from './date';

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

/* ===========================================================================
 * NHÓM HÀM THÁNG — PHASE 7. Bảng case lấy nguyên từ `docs/08 §3.5.3`.
 * ========================================================================= */

describe('getVietnamMonthRange — khoảng tháng inclusive hai đầu (FR-021, FR-028)', () => {
  const CASES: ReadonlyArray<readonly [label: string, input: string, from: string, to: string]> = [
    ['tháng 31 ngày', '2026-08', '2026-08-01', '2026-08-31'],
    ['tháng 30 ngày', '2026-04', '2026-04-01', '2026-04-30'],
    ['tháng 2 năm thường', '2026-02', '2026-02-01', '2026-02-28'],
    ['tháng 2 năm nhuận', '2028-02', '2028-02-01', '2028-02-29'],
    ['tháng 12 không tràn sang năm sau', '2026-12', '2026-12-01', '2026-12-31'],
    ['tháng 1 là biên dưới', '2026-01', '2026-01-01', '2026-01-31'],
    ['năm chia hết 100 nhưng KHÔNG nhuận', '2100-02', '2100-02-01', '2100-02-28'],
    ['năm chia hết 400 nên NHUẬN', '2000-02', '2000-02-01', '2000-02-29'],
  ];

  it.each(CASES)('%s', (_label, input, from, to) => {
    expect(getVietnamMonthRange(input)).toEqual({ from, to });
  });

  it('hai đầu khoảng đều là ngày CÓ THẬT trên lịch', () => {
    for (const [, input] of CASES) {
      const range = getVietnamMonthRange(input);
      expect(range).not.toBeNull();
      // `range` đã được khẳng định khác null ngay trên dòng này.
      expect(isValidVietnamDate(range!.from)).toBe(true);
      expect(isValidVietnamDate(range!.to)).toBe(true);
    }
  });

  it('ngày cuối tháng nằm TRONG khoảng — không bỏ sót báo cáo ngày 31', () => {
    const range = getVietnamMonthRange('2026-08');
    expect(range?.to).toBe('2026-08-31');
    // `between from and to` của Postgres là inclusive, nên `to` phải là ngày
    // cuối cùng chứ không phải ngày đầu tháng sau.
    expect(range?.to).not.toBe('2026-09-01');
  });

  it.each([
    ['tháng 13 không tồn tại', '2026-13'],
    ['tháng 00 không tồn tại', '2026-00'],
    ['thiếu số 0 đứng đầu', '2026-8'],
    ['là một ngày đầy đủ chứ không phải tháng', '2026-08-01'],
    ['chuỗi rác', 'not-a-month'],
    ['chuỗi rỗng', ''],
    ['sai thứ tự', '08-2026'],
    ['có khoảng trắng', ' 2026-08'],
  ])('%s → trả null, KHÔNG throw (DEC-040)', (_label, input) => {
    expect(() => getVietnamMonthRange(input)).not.toThrow();
    expect(getVietnamMonthRange(input)).toBeNull();
  });

  it('không phụ thuộc timezone của tiến trình', () => {
    const originalTz = process.env.TZ;

    try {
      for (const tz of ['UTC', 'America/New_York', 'Asia/Ho_Chi_Minh', 'Pacific/Kiritimati']) {
        process.env.TZ = tz;
        expect(getVietnamMonthRange('2026-08'), `TZ=${tz}`).toEqual({
          from: '2026-08-01',
          to: '2026-08-31',
        });
      }
    } finally {
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
    }
  });
});

describe('getVietnamCurrentMonth — tháng nghiệp vụ hôm nay (BR-005)', () => {
  it.each([
    ['một phút trước biên đổi ngày cuối tháng', '2026-08-31T16:59:00Z', '2026-08'],
    ['một phút sau biên — đã sang tháng 9 giờ VN', '2026-08-31T17:01:00Z', '2026-09'],
    ['qua mốc đổi năm', '2026-12-31T17:01:00Z', '2027-01'],
    ['giữa tháng', '2026-08-10T03:00:00Z', '2026-08'],
  ])('%s', (_label, instant, expected) => {
    freezeAt(instant);
    expect(getVietnamCurrentMonth()).toBe(expected);
  });

  it('kết quả luôn là chuỗi tháng hợp lệ mà getVietnamMonthRange nhận được', () => {
    freezeAt('2026-08-31T17:01:00Z');
    expect(getVietnamMonthRange(getVietnamCurrentMonth())).not.toBeNull();
  });
});

describe('formatVietnamMonth — hiển thị (DEC-033)', () => {
  it.each([
    ['2026-08', 'Tháng 08/2026'],
    ['2026-01', 'Tháng 01/2026'],
    ['2026-12', 'Tháng 12/2026'],
  ])('%s → %s', (input, expected) => {
    expect(formatVietnamMonth(input)).toBe(expected);
  });

  it.each([
    ['chuỗi rác', 'not-a-month'],
    ['tháng 13', '2026-13'],
    ['chuỗi rỗng', ''],
    ['là một ngày đầy đủ', '2026-08-01'],
  ])('%s → trả "—", KHÔNG throw', (_label, input) => {
    expect(() => formatVietnamMonth(input)).not.toThrow();
    expect(formatVietnamMonth(input)).toBe('—');
  });

  it('không bao giờ trả chuỗi chứa "Invalid" hay "NaN"', () => {
    for (const input of ['not-a-month', '2026-13', '', 'NaN-NaN']) {
      expect(formatVietnamMonth(input)).not.toContain('Invalid');
      expect(formatVietnamMonth(input)).not.toContain('NaN');
    }
  });
});

describe('shiftVietnamMonth — nút Tháng trước / Tháng sau', () => {
  it.each([
    ['lùi một tháng trong cùng năm', '2026-08', -1, '2026-07'],
    ['tiến một tháng trong cùng năm', '2026-08', 1, '2026-09'],
    ['lùi qua mốc đổi năm', '2026-01', -1, '2025-12'],
    ['tiến qua mốc đổi năm', '2026-12', 1, '2027-01'],
    ['lùi 12 tháng', '2026-08', -12, '2025-08'],
    ['delta 0 giữ nguyên', '2026-08', 0, '2026-08'],
  ])('%s', (_label, input, delta, expected) => {
    expect(shiftVietnamMonth(input, delta)).toBe(expected);
  });

  it('đi tới rồi đi lui trả về đúng tháng ban đầu', () => {
    for (const month of ['2026-01', '2026-08', '2026-12', '2028-02']) {
      const next = shiftVietnamMonth(month, 1);
      expect(next).not.toBeNull();
      expect(shiftVietnamMonth(next!, -1)).toBe(month);
    }
  });

  it('kết quả luôn được getVietnamMonthRange chấp nhận', () => {
    for (const delta of [-13, -1, 0, 1, 13]) {
      const shifted = shiftVietnamMonth('2026-08', delta);
      expect(shifted).not.toBeNull();
      expect(getVietnamMonthRange(shifted!)).not.toBeNull();
    }
  });

  it.each([
    ['tháng sai định dạng', '2026-13', 1],
    ['chuỗi rác', 'abc', 1],
    ['delta không nguyên', '2026-08', 1.5],
    ['delta NaN', '2026-08', Number.NaN],
  ])('%s → trả null, KHÔNG throw', (_label, month, delta) => {
    expect(() => shiftVietnamMonth(month, delta)).not.toThrow();
    expect(shiftVietnamMonth(month, delta)).toBeNull();
  });
});

describe('resolveVietnamMonth — chuẩn hoá ?month= từ URL (DEC-040)', () => {
  it('tháng hợp lệ được giữ nguyên, không fallback', () => {
    freezeAt('2026-08-10T03:00:00Z');
    expect(resolveVietnamMonth('2026-04')).toEqual({
      month: '2026-04',
      from: '2026-04-01',
      to: '2026-04-30',
      didFallback: false,
    });
  });

  it('thiếu tham số → tháng hiện tại, KHÔNG coi là fallback', () => {
    freezeAt('2026-08-10T03:00:00Z');
    expect(resolveVietnamMonth(undefined)).toEqual({
      month: '2026-08',
      from: '2026-08-01',
      to: '2026-08-31',
      didFallback: false,
    });
  });

  it.each([
    ['tháng 13', '2026-13'],
    ['chuỗi rác', 'abc'],
    ['chuỗi rỗng', ''],
    ['là một ngày đầy đủ', '2026-08-01'],
  ])('%s → lùi về tháng hiện tại và báo didFallback', (_label, raw) => {
    freezeAt('2026-08-10T03:00:00Z');
    expect(resolveVietnamMonth(raw)).toEqual({
      month: '2026-08',
      from: '2026-08-01',
      to: '2026-08-31',
      didFallback: true,
    });
  });

  it('kết quả LUÔN dùng được — không bao giờ null, không bao giờ chuỗi rỗng', () => {
    freezeAt('2028-02-15T03:00:00Z');
    for (const raw of [undefined, '', 'abc', '2026-13', '2028-02', '2026-08-01']) {
      const resolved = resolveVietnamMonth(raw);
      expect(isValidVietnamDate(resolved.from)).toBe(true);
      expect(isValidVietnamDate(resolved.to)).toBe(true);
      expect(getVietnamMonthRange(resolved.month)).not.toBeNull();
      expect(resolved.from <= resolved.to).toBe(true);
    }
  });

  it('tháng 2 năm nhuận qua đường fallback vẫn ra 29 ngày', () => {
    freezeAt('2028-02-15T03:00:00Z');
    expect(resolveVietnamMonth('rác')).toMatchObject({ month: '2028-02', to: '2028-02-29' });
  });
});

describe('formatVietnamShortDate — dòng "Tính đến hết ngày…" của thẻ ảnh (DEC-068)', () => {
  it('bỏ thứ trong tuần, giữ đủ ngày/tháng/năm', () => {
    expect(formatVietnamShortDate('2026-08-14')).toBe('14/08/2026');
  });

  it('giữ số 0 đứng đầu — tên ngày trên ảnh phải luôn hai chữ số', () => {
    expect(formatVietnamShortDate('2026-01-05')).toBe('05/01/2026');
  });

  it('đầu vào rác trả "—" chứ KHÔNG ném (DEC-033)', () => {
    expect(formatVietnamShortDate('2026-02-30')).toBe('—');
    expect(formatVietnamShortDate('hôm nay')).toBe('—');
  });
});

describe('formatVietnamDateTime — mốc đồng bộ AMIS theo giờ TP.HCM (PHASE 19)', () => {
  it('quy đổi UTC sang giờ VN, KHÔNG in nguyên giờ máy chạy', () => {
    // Đây là lỗi thật đã lên production: trang Admin in `02:26` cho một lần
    // đồng bộ lúc 09:26 giờ VN, vì `toLocaleString('vi-VN')` trần lấy múi giờ
    // của máy chạy — trên Vercel là UTC.
    expect(formatVietnamDateTime('2026-08-17T02:26:18Z')).toBe('17/08/2026 09:26');
  });

  it('mốc sau 17:00 UTC rơi sang NGÀY HÔM SAU theo giờ VN', () => {
    expect(formatVietnamDateTime('2026-08-17T19:00:00Z')).toBe('18/08/2026 02:00');
  });

  it('nửa đêm giờ VN', () => {
    expect(formatVietnamDateTime('2026-08-16T17:00:00Z')).toBe('17/08/2026 00:00');
  });

  it('dùng đồng hồ 24 giờ, không kèm SA/CH', () => {
    const text = formatVietnamDateTime('2026-08-17T10:30:00Z');

    expect(text).toBe('17/08/2026 17:30');
    expect(text).not.toMatch(/SA|CH|AM|PM/i);
  });

  it('đầu vào rác trả "—" chứ KHÔNG ném (DEC-033)', () => {
    expect(formatVietnamDateTime('hôm qua')).toBe('—');
    expect(formatVietnamDateTime('')).toBe('—');
  });
});

describe('shiftVietnamDate — lùi một ngày cho tấm ảnh sáng (DEC-068)', () => {
  it('lùi trong cùng tháng', () => {
    expect(shiftVietnamDate('2026-09-21', -1)).toBe('2026-09-20');
  });

  it('lùi qua đầu tháng thì sang tháng trước, đúng số ngày của tháng đó', () => {
    expect(shiftVietnamDate('2026-09-01', -1)).toBe('2026-08-31');
    expect(shiftVietnamDate('2026-07-01', -1)).toBe('2026-06-30');
  });

  it('lùi qua đầu năm', () => {
    expect(shiftVietnamDate('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('tháng 2 năm nhuận và năm không nhuận', () => {
    expect(shiftVietnamDate('2028-03-01', -1)).toBe('2028-02-29');
    expect(shiftVietnamDate('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('tiến ngày cũng đúng — hàm không chỉ dùng cho delta âm', () => {
    expect(shiftVietnamDate('2026-08-31', 1)).toBe('2026-09-01');
  });

  it('KHÔNG đọc đồng hồ: kết quả không đổi dù máy đang ở múi giờ nào', () => {
    freezeAt('2026-09-21T18:30:00Z');
    expect(shiftVietnamDate('2026-09-21', -1)).toBe('2026-09-20');
  });

  it('đầu vào sai trả null', () => {
    expect(shiftVietnamDate('2026-02-30', -1)).toBeNull();
    expect(shiftVietnamDate('2026-09-21', 1.5)).toBeNull();
  });
});

describe('getVietnamMonthToDateRange — lũy kế tháng của thẻ ảnh (DEC-068)', () => {
  it('từ ngày 01 của tháng chứa báo cáo, đến đúng mốc dừng được truyền vào', () => {
    expect(getVietnamMonthToDateRange('2026-09-21', '2026-09-21')).toEqual({
      month: '2026-09',
      from: '2026-09-01',
      to: '2026-09-21',
      isEmpty: false,
    });
  });

  it('THÁNG lấy từ ngày báo cáo, KHÔNG lấy từ mốc dừng', () => {
    // Ảnh sáng ngày 01/09 dừng ở 31/08. Nếu suy tháng ra từ mốc dừng thì cụm
    // lũy kế của một tấm ảnh tháng 9 sẽ cộng nguyên tháng 8 — sai hoàn toàn.
    const range = getVietnamMonthToDateRange('2026-09-01', '2026-08-31');

    expect(range?.month).toBe('2026-09');
    expect(range?.from).toBe('2026-09-01');
    expect(range?.isEmpty).toBe(true);
  });

  it('mốc dừng nằm trong tháng thì isEmpty = false, kể cả khi trùng ngày 01', () => {
    expect(getVietnamMonthToDateRange('2026-09-01', '2026-09-01')?.isEmpty).toBe(false);
  });

  it('hàm THUẦN — không đọc đồng hồ, xuất lại ảnh cũ vẫn ra đúng khoảng cũ', () => {
    freezeAt('2027-05-05T03:00:00Z');
    expect(getVietnamMonthToDateRange('2026-09-10', '2026-09-10')).toEqual({
      month: '2026-09',
      from: '2026-09-01',
      to: '2026-09-10',
      isEmpty: false,
    });
  });

  it('ngày rác ở bất kỳ vế nào cũng trả null', () => {
    expect(getVietnamMonthToDateRange('2026-02-30', '2026-02-28')).toBeNull();
    expect(getVietnamMonthToDateRange('2026-02-28', 'rác')).toBeNull();
  });
});
