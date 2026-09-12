import { beforeEach, describe, expect, it, vi } from 'vitest';

import { saveSalariesAction } from '@/features/admin-salaries/actions';
import { saveSalaryEntries } from '@/services/salaries';

const session = vi.hoisted(() => ({ user: true, role: 'ADMIN', active: true }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: session.user ? { id: 'admin' } : null } }) },
}) }));
vi.mock('@/services/profiles', () => ({
  getSessionProfile: async () => ({ id: 'admin', role: session.role, is_active: session.active }),
  listSalesOptions: async () => [],
}));
vi.mock('@/services/salaries', () => ({ saveSalaryEntries: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

function form() {
  const data = new FormData();
  data.set('month', '2026-08');
  data.set('amount__salework-accounting-sales', '15.000.000');
  data.set('amount__amis-kim-huong', '16.000.000');
  data.set('amount__amis-dang-khoa', '17.000.000');
  return data;
}
beforeEach(() => {
  vi.clearAllMocks(); session.user = true; session.role = 'ADMIN'; session.active = true;
  vi.mocked(saveSalaryEntries).mockResolvedValue({ ok: true, saved: 3 });
});

describe('nhập lương nhân viên báo cáo tháng', () => {
  it('lưu đủ ba khóa đúng kỳ bằng một RPC; không nhận người nhận giả từ payload', async () => {
    const data = form(); data.set('amount__forged-id', '999999');
    expect(await saveSalariesAction(null, data)).toMatchObject({ ok: true });
    expect(saveSalaryEntries).toHaveBeenCalledExactlyOnceWith(expect.anything(), '2026-08-01', [
      { sales_id: 'salework-accounting-sales', amount: 15000000 },
      { sales_id: 'amis-kim-huong', amount: 16000000 },
      { sales_id: 'amis-dang-khoa', amount: 17000000 },
    ]);
  });
  it('tiền lỗi hoặc tháng lỗi không lưu dở', async () => {
    const data = form(); data.set('amount__amis-kim-huong', '-1');
    expect(await saveSalariesAction(null, data)).toMatchObject({ ok: false, code: 'VALIDATION' });
    data.set('month', '2026-13');
    expect(await saveSalariesAction(null, data)).toMatchObject({ ok: false, code: 'VALIDATION' });
    expect(saveSalaryEntries).not.toHaveBeenCalled();
  });
  it('không auth, Sales hoặc Admin inactive không được ghi', async () => {
    session.user = false;
    expect(await saveSalariesAction(null, form())).toMatchObject({ ok: false, code: 'UNAUTHORIZED' });
    session.user = true; session.role = 'SALES';
    expect(await saveSalariesAction(null, form())).toMatchObject({ ok: false, code: 'FORBIDDEN' });
    session.role = 'ADMIN'; session.active = false;
    expect(await saveSalariesAction(null, form())).toMatchObject({ ok: false, code: 'ACCOUNT_DISABLED' });
    expect(saveSalaryEntries).not.toHaveBeenCalled();
  });
});
