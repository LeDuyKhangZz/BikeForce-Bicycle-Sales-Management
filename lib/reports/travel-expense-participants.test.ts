import { createClient } from '@supabase/supabase-js';
import { beforeEach, expect, it, vi } from 'vitest';

import { getTravelExpensePageData } from '@/features/admin-travel-expenses/queries';
import { getMonthlySummaryParticipant } from '@/features/admin-monthly-summaries/queries';
import { listSalesOptions } from '@/services/profiles';
import { listTravelExpenseEntries } from '@/services/travel-expenses';
import type { Database } from '@/types/database.types';

vi.mock('@/services/profiles', () => ({ listSalesOptions: vi.fn(), getMonthlySummarySales: vi.fn() }));
vi.mock('@/services/travel-expenses', () => ({ listTravelExpenseEntries: vi.fn() }));
const client = createClient<Database>('http://127.0.0.1:54321', 'unit-test-key');
beforeEach(() => vi.resetAllMocks());

it('danh sách nhập công tác phí và danh sách báo cáo dùng cùng khóa, đọc lại công tác phí theo tháng', async () => {
  vi.mocked(listSalesOptions).mockResolvedValue([]);
  vi.mocked(listTravelExpenseEntries).mockResolvedValue([
    { sales_id: 'salework-accounting-sales', amount: 15000000 },
    { sales_id: 'amis-kim-huong', amount: 16000000 },
    { sales_id: 'amis-dang-khoa', amount: 17000000 },
  ]);
  const result = await getTravelExpensePageData(client, '2026-08-01');
  expect(result.salesRows.map(person => person.full_name)).toEqual([
    'Abraham Kế Toán Bánhàng', 'Nguyễn Thị Kim Hương', 'Nguyễn Trần Đăng Khoa',
  ]);
  expect(result.currentAmounts).toEqual({
    'salework-accounting-sales': 15000000, 'amis-kim-huong': 16000000, 'amis-dang-khoa': 17000000,
  });
  expect(listTravelExpenseEntries).toHaveBeenCalledWith(client, '2026-08-01');
  expect(await getMonthlySummaryParticipant(client, 'amis-dang-khoa')).toMatchObject({
    id: 'amis-dang-khoa', full_name: 'Nguyễn Trần Đăng Khoa', profileId: null,
    saleWorkAccountName: 'Tàu - MT', amis_employee_name: 'Nguyễn Trần Đăng Khoa',
  });
});

it('Khoa đã có profile Sales dùng UUID cũ, không thêm dòng hoặc chuyển công tác phí sang khóa tích hợp', async () => {
  vi.mocked(listSalesOptions).mockResolvedValue([
    { id: 'existing-khoa', full_name: 'Nguyễn Trần Đăng Khoa', employee_code: 'VP-PTM-001', is_active: true },
  ]);
  vi.mocked(listTravelExpenseEntries).mockResolvedValue([{ sales_id: 'existing-khoa', amount: 20000000 }]);
  const result = await getTravelExpensePageData(client, '2026-09-01');
  expect(result.salesRows.filter(person => person.full_name === 'Nguyễn Trần Đăng Khoa')).toEqual([
    { id: 'existing-khoa', full_name: 'Nguyễn Trần Đăng Khoa', employee_code: 'VP-PTM-001', is_active: true },
  ]);
  expect(result.currentAmounts['existing-khoa']).toBe(20000000);
});
