import { describe, expect, it } from 'vitest';

import {
  MAX_MONTHLY_TARGET_VND,
  monthlyTargetFieldName,
  parseMonthlyTargetInput,
  periodMonthOf,
} from './monthly-targets';

describe('parseMonthlyTargetInput — ô chỉ tiêu tháng (DEC-071)', () => {
  it('ô trống là CHƯA GIAO (null), không phải 0', () => {
    // Phân biệt này quyết định thẻ ảnh in gì: `null` rơi về đường lùi, còn `0`
    // là một chỉ tiêu thật và BR-015 có nhánh riêng cho nó.
    expect(parseMonthlyTargetInput('')).toEqual({ ok: true, value: null });
    expect(parseMonthlyTargetInput('   ')).toEqual({ ok: true, value: null });
  });

  it('ô không tồn tại trong FormData cũng là chưa giao, không phải lỗi', () => {
    // `formData.get()` trả `null` cho field vắng mặt — ví dụ Sales mới được tạo
    // ở tab khác trong lúc Admin đang mở form.
    expect(parseMonthlyTargetInput(null)).toEqual({ ok: true, value: null });
  });

  it('nhận số nguyên thuần và số đã phân nhóm nghìn', () => {
    expect(parseMonthlyTargetInput('640000000')).toEqual({ ok: true, value: 640_000_000 });
    expect(parseMonthlyTargetInput('640.000.000')).toEqual({ ok: true, value: 640_000_000 });
  });

  it('số 0 là chỉ tiêu HỢP LỆ', () => {
    expect(parseMonthlyTargetInput('0')).toEqual({ ok: true, value: 0 });
  });

  it('từ chối chữ, số âm và số lẻ', () => {
    for (const raw of ['abc', '-1', '640000000,5', '1e9']) {
      expect(parseMonthlyTargetInput(raw).ok, raw).toBe(false);
    }
  });

  it('từ chối số vượt trần — bắt lỗi gõ thừa số 0 trước khi chạm database', () => {
    expect(parseMonthlyTargetInput(String(MAX_MONTHLY_TARGET_VND)).ok).toBe(true);
    expect(parseMonthlyTargetInput(String(MAX_MONTHLY_TARGET_VND + 1)).ok).toBe(false);
  });

  it('thông báo lỗi nói việc cần làm, không hiện mã kỹ thuật (NFR-014)', () => {
    const result = parseMonthlyTargetInput('abc');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('số tiền');
  });
});

describe('monthlyTargetFieldName', () => {
  it('mang salesId nên một form nhiều dòng không đụng tên field', () => {
    const a = '11111111-1111-4111-8111-111111111111';
    const b = '22222222-2222-4222-8222-222222222222';

    expect(monthlyTargetFieldName('target_sales_amount', a)).toBe(`target_sales_amount__${a}`);
    expect(monthlyTargetFieldName('target_revenue', a)).not.toBe(
      monthlyTargetFieldName('target_revenue', b),
    );
    expect(monthlyTargetFieldName('target_sales_amount', a)).not.toBe(
      monthlyTargetFieldName('target_revenue', a),
    );
  });
});

describe('periodMonthOf', () => {
  it('khớp quy ước khoá `period_month` — luôn ngày 01', () => {
    expect(periodMonthOf('2026-08')).toBe('2026-08-01');
    expect(periodMonthOf('2026-12')).toBe('2026-12-01');
  });
});
