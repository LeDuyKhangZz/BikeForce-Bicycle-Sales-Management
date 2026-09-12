import { createClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMonthlySummaryParticipant, listMonthlySummaryParticipants } from '@/features/admin-monthly-summaries/queries';
import { getMonthlySummarySales, listSalesOptions } from '@/services/profiles';
import type { Database } from '@/types/database.types';

vi.mock('@/services/profiles', () => ({
  getMonthlySummarySales: vi.fn(),
  listSalesOptions: vi.fn(),
}));

const client = createClient<Database>('http://127.0.0.1:54321', 'unit-test-key');

beforeEach(() => vi.clearAllMocks());

describe('monthly summary participant queries', () => {
  it('lấy kế toán không cần profile Sales và ghép đúng AMIS cũ', async () => {
    const person = await getMonthlySummaryParticipant(client, 'salework-accounting-sales');
    expect(person).toMatchObject({
      full_name: 'Abraham Kế Toán Bánhàng',
      profileId: null,
      saleWorkAccountName: 'Abraham Kế Toán Bánhàng',
      amis_employee_name: 'Kế Toán Bán Hàng',
    });
    expect(getMonthlySummarySales).not.toHaveBeenCalled();
  });

  it('giữ nguyên profile, SaleWork và AMIS của Sales', async () => {
    vi.mocked(getMonthlySummarySales).mockResolvedValue({
      id: 'sales-id', full_name: 'Nguyễn Trần Đăng Khoa', employee_code: null,
      is_active: true, amis_employee_name: 'Tên AMIS hiện hữu',
    });
    expect(await getMonthlySummaryParticipant(client, 'sales-id')).toMatchObject({
      profileId: 'sales-id', saleWorkAccountName: 'Tàu - MT',
      amis_employee_name: 'Tên AMIS hiện hữu',
    });
  });

  it('không chấp nhận tài khoản không tồn tại', async () => {
    vi.mocked(getMonthlySummarySales).mockResolvedValue(null);
    expect(await getMonthlySummaryParticipant(client, 'missing')).toBeNull();
  });

  it('danh sách rỗng Sales vẫn có kế toán để xem ảnh tháng', async () => {
    vi.mocked(listSalesOptions).mockResolvedValue([]);
    expect(await listMonthlySummaryParticipants(client)).toEqual([
      expect.objectContaining({ id: 'salework-accounting-sales' }),
    ]);
  });
});
