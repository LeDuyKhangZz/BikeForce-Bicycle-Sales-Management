import { describe, expect, it } from 'vitest';

import { buildMisaCustomerCsv } from './customer-export';

describe('MISA customer export', () => {
  it('exports a spreadsheet-compatible page without evaluating customer text as formulas', () => {
    const csv = buildMisaCustomerCsv([{
      id: 1, code: 'BDI0005', name: '=HYPERLINK("unsafe")', billingProvince: 'Bình Định',
      debt: 154797600, orderSales: 669313850, recentPurchaseDate: '2026-09-19T00:00:00+07:00',
      daysWithoutPurchase: 3, lastVisitDate: null, owner: 'Ngô Thế San',
    }]);
    expect(csv).toContain('"Mã khách hàng","Tên khách hàng"');
    expect(csv).toContain('"\'=HYPERLINK(""unsafe"")"');
    expect(csv).toContain('"154.797.600');
    expect(csv).toContain('"19/09/2026"');
  });
});
