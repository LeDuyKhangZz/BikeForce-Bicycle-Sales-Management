/**
 * Unit test cho `lib/reports/today-cta.ts`.
 *
 * Khoá lại bảng ba trạng thái của `docs/03-workflow.md §3.2` (FR-007) và quy tắc
 * "chỉ xuất ảnh sau khi persist COMPLETED" (BR-002) — hai thứ mà Master Spec §12
 * gọi thẳng tên là chỗ dễ làm sai nhất.
 */
import { describe, expect, it } from 'vitest';

import {
  EVENING_REPORT_PATH,
  MORNING_REPORT_PATH,
  canOpenMorningForm,
  getTodayView,
  salesReportPath,
} from './today-cta';

const REPORT_ID = '11111111-2222-3333-4444-555555555555';

describe('getTodayView — chưa có báo cáo hôm nay', () => {
  const view = getTodayView(null);

  it('trạng thái "Chưa báo cáo"', () => {
    expect(view.state).toBe('NO_REPORT');
    expect(view.statusLabel).toBe('Chưa báo cáo');
  });

  it('CTA chính đưa tới form đầu ngày', () => {
    expect(view.primaryCta.key).toBe('CREATE_MORNING');
    expect(view.primaryCta.href).toBe(MORNING_REPORT_PATH);
  });

  it('không có CTA phụ — mỗi màn hình chỉ một hành động chính', () => {
    expect(view.secondaryCta).toBeNull();
  });

  it('không có gì để xuất ảnh — chưa có dòng nào trong database (BR-002)', () => {
    expect(view.shareImageVariant).toBeNull();
  });
});

describe('getTodayView — MORNING_SUBMITTED', () => {
  const view = getTodayView({ id: REPORT_ID, status: 'MORNING_SUBMITTED' });

  it('trạng thái "Đã cam kết"', () => {
    expect(view.state).toBe('MORNING_SUBMITTED');
    expect(view.statusLabel).toBe('Đã cam kết');
  });

  it('CTA chính là hoàn thành báo cáo cuối ngày', () => {
    expect(view.primaryCta.key).toBe('COMPLETE_EVENING');
    expect(view.primaryCta.href).toBe(EVENING_REPORT_PATH);
  });

  it('KHÔNG có CTA phụ — "Sửa cam kết sáng" đã bị gỡ (DEC-055)', () => {
    expect(view.secondaryCta).toBeNull();
  });

  it('xuất được ảnh bản SÁNG — DEC-058 nới BR-002', () => {
    expect(view.shareImageVariant).toBe('MORNING');
  });
});

describe('getTodayView — COMPLETED', () => {
  const view = getTodayView({ id: REPORT_ID, status: 'COMPLETED' });

  it('trạng thái "Đã hoàn thành"', () => {
    expect(view.state).toBe('COMPLETED');
    expect(view.statusLabel).toBe('Đã hoàn thành');
  });

  it('CTA chính là xem báo cáo hôm nay, kèm đúng id', () => {
    expect(view.primaryCta.key).toBe('VIEW_REPORT');
    expect(view.primaryCta.href).toBe(salesReportPath(REPORT_ID));
    expect(view.primaryCta.href).toContain(REPORT_ID);
  });

  it('KHÔNG còn CTA sửa cam kết sáng — BR-019 khoá vĩnh viễn', () => {
    expect(view.secondaryCta).toBeNull();
  });

  it('xuất được ảnh bản CHIỀU — bản có cột thực đạt và % hoàn thành', () => {
    expect(view.shareImageVariant).toBe('EVENING');
  });
});

describe('bất biến chung của cả ba trạng thái', () => {
  const views = [
    getTodayView(null),
    getTodayView({ id: REPORT_ID, status: 'MORNING_SUBMITTED' }),
    getTodayView({ id: REPORT_ID, status: 'COMPLETED' }),
  ];

  it('luôn có đúng MỘT CTA chính, và nó khác CTA phụ', () => {
    for (const view of views) {
      expect(view.primaryCta.label.length).toBeGreaterThan(0);
      expect(view.primaryCta.href.startsWith('/')).toBe(true);
      if (view.secondaryCta) {
        expect(view.secondaryCta.key).not.toBe(view.primaryCta.key);
      }
    }
  });

  it('có ảnh để xuất ⇔ hôm nay đã có báo cáo persist (BR-002 sau DEC-058)', () => {
    expect(views.map((view) => view.shareImageVariant)).toEqual([null, 'MORNING', 'EVENING']);
  });
});

describe('canOpenMorningForm', () => {
  it('mở được khi chưa có báo cáo — UC-04', () => {
    expect(canOpenMorningForm(null)).toBe(true);
  });

  it('KHÔNG mở được khi đã MORNING_SUBMITTED — DEC-055 gỡ UC-05', () => {
    expect(canOpenMorningForm({ id: REPORT_ID, status: 'MORNING_SUBMITTED' })).toBe(false);
  });

  it('KHÔNG mở được khi đã COMPLETED — BR-019, DEC-026', () => {
    expect(canOpenMorningForm({ id: REPORT_ID, status: 'COMPLETED' })).toBe(false);
  });

  it('mở form được ⇔ hôm nay chưa có báo cáo nào', () => {
    // Bất biến gộp: sau DEC-055, chỉ còn ĐÚNG MỘT lần mở form sáng mỗi ngày.
    const cases = [null, { id: REPORT_ID, status: 'MORNING_SUBMITTED' }, { id: REPORT_ID, status: 'COMPLETED' }] as const;
    for (const report of cases) {
      expect(canOpenMorningForm(report)).toBe(report === null);
    }
  });
});
