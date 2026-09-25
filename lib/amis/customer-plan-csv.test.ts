import { describe, expect, it } from 'vitest';

import { buildCustomerPlanCsv, CUSTOMER_PLAN_CSV_HEADERS, parseCustomerPlanCells, parseCustomerPlanCsv } from './customer-plan-csv';

describe('customer plan CSV', () => {
  it('round-trips Vietnamese names and nullable commitments', () => {
    const csv = buildCustomerPlanCsv([
      { customerId: 12, customerCode: 'KH001', customerName: 'Cửa hàng An, Bình', monthlyFrequency: 4, committedSales: 150_000_000 },
      { customerId: 13, customerCode: 'KH002', customerName: 'Xe đạp Việt', monthlyFrequency: 2, committedSales: null },
    ]);
    expect(parseCustomerPlanCsv(csv)).toEqual({
      rows: [
        { customerId: 12, monthlyFrequency: 4, committedSales: 150_000_000 },
        { customerId: 13, monthlyFrequency: 2, committedSales: null },
      ],
      errors: [],
    });
  });

  it('reports duplicate IDs and invalid numeric values without accepting those rows', () => {
    const csv = buildCustomerPlanCsv([
      { customerId: 12, customerCode: 'A', customerName: 'A', monthlyFrequency: 4, committedSales: 1 },
      { customerId: 12, customerCode: 'B', customerName: 'B', monthlyFrequency: 5, committedSales: 2 },
    ]).replace('"4","1"', '"32","1"');
    const result = parseCustomerPlanCsv(csv);
    expect(result.rows).toEqual([{ customerId: 12, monthlyFrequency: 5, committedSales: 2 }]);
    expect(result.errors).toEqual([{ line: 2, message: 'Tần suất phải là số nguyên từ 0 đến 31.' }]);
  });

  it('rejects a foreign header', () => {
    expect(parseCustomerPlanCsv('customer_id,name\r\n1,A').errors[0]?.line).toBe(1);
  });

  it('parses the five columns read from an Excel workbook', () => {
    expect(parseCustomerPlanCells([
      [...CUSTOMER_PLAN_CSV_HEADERS],
      ['27396', 'BDI0120', '6 Triệu - Tây Sơn', '4', '40000000'],
      ['29829', 'BDI0172', 'A Thái Tây Sơn', '1', ''],
    ])).toEqual({
      rows: [
        { customerId: 27396, monthlyFrequency: 4, committedSales: 40_000_000 },
        { customerId: 29829, monthlyFrequency: 1, committedSales: null },
      ],
      errors: [],
    });
  });
});
