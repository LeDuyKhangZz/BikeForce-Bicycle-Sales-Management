import { describe, expect, it } from 'vitest';

import {
  DEFAULT_REPORT_BACKGROUND_PATH,
  getSaleWorkReportBackgroundPath,
  HALLOWEEN_REPORT_BACKGROUND_PATH,
} from '@/lib/reports/salework-image-accounts';

describe('nền ảnh báo cáo theo tài khoản', () => {
  it.each([
    'Nguyễn Ngọc Triết',
    'Hải TeleSale',
    'Abraham Kế Toán Bánhàng',
  ])('dùng nền Halloween cho %s', (accountName) => {
    expect(getSaleWorkReportBackgroundPath(accountName)).toBe(HALLOWEEN_REPORT_BACKGROUND_PATH);
  });

  it('giữ nền hiện tại cho tài khoản khác', () => {
    expect(getSaleWorkReportBackgroundPath('Cô Lê')).toBe(DEFAULT_REPORT_BACKGROUND_PATH);
  });
});
