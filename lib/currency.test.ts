/**
 * Unit test cho `lib/currency.ts` — bảng case lấy nguyên từ `docs/08 §3.3, §3.4`.
 *
 * ⚠ `Intl.NumberFormat('vi-VN', …)` chèn NO-BREAK SPACE `U+00A0` giữa số và `₫`.
 * Mọi assertion so chuỗi tiền đi qua `nbsp()` để không fail vì một ký tự vô hình
 * (docs/08 §3.3 — quy ước bắt buộc cho toàn dự án).
 */
import { describe, expect, it } from 'vitest';

import { formatCurrencyVND, formatThousands, parseCurrencyInput } from './currency';

/** Đổi NBSP thành space thường để assertion đọc được bằng mắt. */
const nbsp = (value: string): string => value.replace(/ /g, ' ');

describe('formatCurrencyVND (BR-010, DEC-008)', () => {
  it.each([
    ['số 0', 0, '0 ₫'],
    ['một nghìn — phân cách nghìn kiểu vi-VN', 1000, '1.000 ₫'],
    ['ví dụ chuẩn của Master Spec §26', 125000000, '125.000.000 ₫'],
    ['sát trần 12 chữ số', 99999999999, '99.999.999.999 ₫'],
    ['đúng trần BR-017', 100000000000, '100.000.000.000 ₫'],
  ])('%s', (_label, input, expected) => {
    expect(nbsp(formatCurrencyVND(input))).toBe(expected);
  });

  it('dùng dấu chấm làm phân cách nghìn, không dùng dấu phẩy', () => {
    expect(formatCurrencyVND(125000000)).not.toContain(',');
  });

  it('không hiện phần thập phân', () => {
    expect(formatCurrencyVND(1000)).not.toContain(',00');
  });

  it('số âm không phải dữ liệu hợp lệ nhưng hàm không được throw', () => {
    // Việc chặn số âm là của Zod + DB CHECK (BR-006), không phải của formatter.
    expect(() => formatCurrencyVND(-1000)).not.toThrow();
    expect(typeof formatCurrencyVND(-1000)).toBe('string');
  });

  it('NaN và Infinity không bao giờ lọt ra UI (AGENTS.md §9)', () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const output = formatCurrencyVND(value);
      expect(output).toBe('—');
      expect(output).not.toContain('NaN');
      expect(output).not.toContain('∞');
    }
  });
});

describe('formatThousands — hiển thị trong ô nhập (docs/05 §6.2)', () => {
  it.each([
    [0, '0'],
    [1000, '1.000'],
    [125000000, '125.000.000'],
    [100000000000, '100.000.000.000'],
  ])('%s → %s', (input, expected) => {
    expect(formatThousands(input)).toBe(expected);
  });

  it('KHÔNG kèm ký hiệu tiền tệ — ký hiệu trong ô làm bàn phím số khó dùng', () => {
    expect(formatThousands(125000000)).not.toContain('₫');
  });

  it('parse lại được chính chuỗi mình vừa tạo', () => {
    for (const value of [0, 1000, 125000000, 99999999999]) {
      expect(parseCurrencyInput(formatThousands(value))).toBe(value);
    }
  });

  it('NaN và Infinity trả chuỗi rỗng, không bao giờ ghi "NaN" vào ô nhập', () => {
    expect(formatThousands(Number.NaN)).toBe('');
    expect(formatThousands(Number.POSITIVE_INFINITY)).toBe('');
  });
});

describe('parseCurrencyInput (BR-006, BR-010)', () => {
  it.each([
    ['số thuần', '125000000', 125000000],
    ['chuỗi đã format kiểu vi-VN', '125.000.000', 125000000],
    ['chuỗi có ký hiệu tiền tệ và NBSP', '125.000.000 ₫', 125000000],
    ['chuỗi có ký hiệu tiền tệ và space thường', '125.000.000 ₫', 125000000],
    ['khoảng trắng thừa hai đầu', '  1.000  ', 1000],
    ['một nghìn rưỡi viết đúng kiểu vi-VN', '1.500', 1500],
    ['số 0', '0', 0],
  ])('%s → %s', (_label, input, expected) => {
    expect(parseCurrencyInput(input)).toBe(expected);
  });

  it.each([
    ['chuỗi rỗng', ''],
    ['chỉ khoảng trắng', '   '],
    ['chữ cái thuần — rác', 'abc'],
    ['số lẫn chữ — rác', '12abc'],
    ['ký hiệu khoa học — KHÔNG được hiểu là 1000000000', '1e9'],
    ['emoji và ký tự lạ — rác', '1.000₫₫₫x'],
    ['số âm bị từ chối', '-1000'],
    ['số thập phân kiểu vi-VN bị từ chối — VND không có phần lẻ', '1,5'],
    ['số thập phân kiểu Anh cũng bị từ chối', '1.5'],
    ['nhóm nghìn sai độ dài', '1.0000'],
    ['vượt Number.MAX_SAFE_INTEGER', '99999999999999999999'],
  ])('%s → null', (_label, input) => {
    expect(parseCurrencyInput(input)).toBeNull();
  });

  it('vượt trần BR-017 vẫn parse ra số — việc từ chối là của Zod', () => {
    // Ranh giới trách nhiệm: hàm này CHỈ chuyển đổi, không thẩm định nghiệp vụ.
    expect(parseCurrencyInput('100000000001')).toBe(100000000001);
  });

  it('khứ hồi format rồi parse là bất biến', () => {
    // Test giá trị cao nhất nhóm này: khoá cặp format/parse lại với nhau nên
    // không thể sửa một bên mà quên bên kia.
    for (const value of [0, 1000, 125000000, 99999999999, 100000000000]) {
      expect(parseCurrencyInput(formatCurrencyVND(value))).toBe(value);
    }
  });
});
