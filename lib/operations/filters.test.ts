import { describe, expect, it } from 'vitest';

import {
  buildInventoryQuery,
  hasActiveInventoryFilters,
  inventoryPath,
  ordersPath,
  parseInventoryFilters,
  parseOrderFilters,
  sanitizeOperationsSearch,
} from './filters';
import {
  findMisaAccessToken,
  normalizeMisaOrderRow,
} from './misa-public-api';
import {
  buildInventoryDashboardViewModel,
  buildOrdersDashboardViewModel,
  resolveOrderStatusBadge,
} from './view-models';
import { buildPageInfo } from '@/lib/reports/pagination';

describe('lib/operations/filters', () => {
  it('loại bỏ ký tự đặc biệt PostgREST trong từ khoá tìm kiếm', () => {
    expect(sanitizeOperationsSearch('  DH001,(test)%*\\  ')).toBe('DH001 test');
    expect(sanitizeOperationsSearch('   ')).toBeNull();
  });

  it('parseOrderFilters chuẩn hoá tháng và từ khoá', () => {
    const parsed = parseOrderFilters({ month: '2026-11', q: '  KH001 ' });
    expect(parsed).toEqual({
      month: '2026-11',
      from: '2026-11-01',
      to: '2026-11-30',
      search: 'KH001',
    });
    expect(ordersPath(parsed, { page: 2 })).toContain('q=KH001');
  });

  it('parseInventoryFilters chuẩn hoá kho và trạng thái tồn', () => {
    const parsed = parseInventoryFilters({
      q: 'XE-01',
      warehouse: 'KHO-TONG',
      stock: 'in',
    });
    expect(parsed).toEqual({
      search: 'XE-01',
      warehouse: 'KHO-TONG',
      stock: 'in',
    });
    expect(hasActiveInventoryFilters(parsed)).toBe(true);
    expect(buildInventoryQuery(parsed).toString()).toBe('q=XE-01&warehouse=KHO-TONG&stock=in');
    expect(inventoryPath(parsed, { page: 3 })).toBe(
      '/admin/inventory?q=XE-01&warehouse=KHO-TONG&stock=in&page=3',
    );
  });
});

describe('lib/operations/view-models', () => {
  it('buildOrdersDashboardViewModel định dạng tiền VND, ngày Việt Nam và chi tiết dòng hàng', () => {
    const vm = buildOrdersDashboardViewModel(
      {
        orderCount: 2,
        totalAmount: 15_500_000,
        outstandingAmount: 3_500_000,
        customerCount: 2,
        latestSyncedAt: '2026-11-04T03:00:00Z',
      },
      [
        {
          id: 'ord-1',
          orderCode: 'SO-2026-001',
          orderDate: '2026-11-03',
          status: 'Đã thực hiện',
          subtotal: 10_000_000,
          discountAmount: 500_000,
          totalAmount: 9_500_000,
          outstandingAmount: 3_500_000,
          syncedAt: '2026-11-04T03:00:00Z',
          customerCode: 'KH001',
          customerName: 'Đại lý Minh Phát',
          salesName: 'Nguyễn Văn A',
          employeeCode: 'NV01',
          lines: [
            {
              id: 'line-1',
              productCode: 'SP01',
              productName: 'Xe đạp địa hình 26 inch',
              unit: 'Chiếc',
              quantity: 2,
              unitPrice: 5_000_000,
              discountAmount: 500_000,
              lineTotal: 9_500_000,
            },
          ],
        },
      ],
      buildPageInfo(2, 1, 20),
    );

    expect(vm.summaryCards[0]?.valueDisplay).toBe('2 đơn');
    expect(vm.summaryCards[1]?.valueDisplay).toBe('15.500.000\u00a0₫');
    expect(vm.summaryCards[2]?.valueDisplay).toBe('12.000.000\u00a0₫');
    expect(vm.summaryCards[3]?.valueDisplay).toBe('3.500.000\u00a0₫');
    expect(vm.rows[0]).toMatchObject({
      orderCode: 'SO-2026-001',
      statusTone: 'success',
      paymentLabel: 'Còn phải thu',
      paymentTone: 'warning',
      totalAmountDisplay: '9.500.000\u00a0₫',
      outstandingDisplay: '3.500.000\u00a0₫',
    });
    expect(resolveOrderStatusBadge('Đã hủy').tone).toBe('danger');
  });

  it('buildInventoryDashboardViewModel tổng hợp kho và trạng thái còn/hết hàng', () => {
    const vm = buildInventoryDashboardViewModel(
      [
        {
          warehouseCode: 'KHO-HCM',
          productCount: 120,
          inStockCount: 95,
          quantityOnHand: 450,
          latestSyncedAt: '2026-11-04T03:00:00Z',
        },
      ],
      [
        {
          id: 'inv-1',
          warehouseCode: 'KHO-HCM',
          productCode: 'SP01',
          productName: 'Xe đạp địa hình 26 inch',
          unit: 'Chiếc',
          quantityOnHand: 12,
          quantityReserved: 2,
          quantityAvailable: 10,
          syncedAt: '2026-11-04T03:00:00Z',
        },
      ],
      buildPageInfo(1, 1, 20),
      'KHO-HCM',
    );

    expect(vm.totalWarehousesDisplay).toBe('1 kho');
    expect(vm.warehouses[0]?.isSelected).toBe(true);
    expect(vm.rows[0]).toMatchObject({
      warehouseCode: 'KHO-HCM',
      quantityAvailableDisplay: '10',
      stockStatusLabel: 'Còn hàng',
      stockStatusTone: 'success',
    });
  });

  it('findMisaAccessToken và normalizeMisaOrderRow chuẩn hoá dữ liệu từ MISA API', () => {
    expect(
      findMisaAccessToken({
        Data: JSON.stringify({ access_token: 'tok_1234567890123456789012345678901234567890' }),
      }),
    ).toBe('tok_1234567890123456789012345678901234567890');

    const normalized = normalizeMisaOrderRow({
      id: 991,
      sale_order_no: 'SO-2026-991',
      sale_order_date: '2026-10-28T00:00:00',
      account_code: 'KH-991',
      owner_name: 'Trần Văn B (NV02)',
      revenue_status: 'Đã thực hiện',
      sale_order_amount: 12_500_000,
      balance_receipt_amount: 2_500_000,
      sale_order_product_mappings: [
        {
          id: 5001,
          product_code: 'SP-991',
          description_product: 'Xe đạp đua Carbon',
          usage_unit: 'Chiếc',
          usage_unit_amount: 1,
          usage_unit_price: 12_500_000,
          discount: 0,
          to_currency_after_discount: 12_500_000,
        },
      ],
    });

    expect(normalized).toMatchObject({
      sourceId: '991',
      orderCode: 'SO-2026-991',
      orderDate: '2026-10-28',
      customerCode: 'KH-991',
      employeeName: 'Trần Văn B',
      totalAmount: 12_500_000,
      outstandingAmount: 2_500_000,
    });
    expect(normalized?.lines).toHaveLength(1);
    expect(normalized?.lines[0]?.productCode).toBe('SP-991');
  });
});

