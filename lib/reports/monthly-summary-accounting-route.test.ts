import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/admin/monthly-summaries/[salesId]/image/route';

const mocks = vi.hoisted(() => {
  const session: { userId: string | null; role: string; active: boolean } = {
    userId: 'admin', role: 'ADMIN', active: true,
  };
  return {
    session,
    amis: vi.fn(async () => null),
    saleWork: vi.fn(async () => null),
    targets: vi.fn(), salary: vi.fn(), travel: vi.fn(),
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({
    data: { user: mocks.session.userId === null ? null : { id: mocks.session.userId } },
  }) } }),
}));
vi.mock('@/services/profiles', () => ({
  getSessionProfile: async () => ({ role: mocks.session.role, is_active: mocks.session.active }),
  getMonthlySummarySales: vi.fn(), listSalesOptions: vi.fn(),
}));
vi.mock('@/services/salework', () => ({
  AMIS_EMPLOYEE_MAP: { 'Abraham Kế Toán Bánhàng': 'Kế Toán Bán Hàng' },
  getMonthlySaleWorkReportByAccountName: mocks.saleWork,
}));
vi.mock('@/services/reports', () => ({ getAmisMetricsForShare: mocks.amis }));
vi.mock('@/services/monthly-targets', () => ({ getMonthlyTargets: mocks.targets }));
vi.mock('@/services/salaries', () => ({ getMonthlySalary: mocks.salary }));
vi.mock('@/services/travel-expenses', () => ({ getMonthlyTravelExpense: mocks.travel }));
vi.mock('next/og', () => ({
  ImageResponse: class extends Response {
    constructor(_node: unknown, options: ResponseInit) { super('png', options); }
  },
}));

function request(id = 'salework-accounting-sales') {
  return GET(new Request(`http://localhost/api/admin/monthly-summaries/${id}/image?month=2026-08`), {
    params: Promise.resolve({ salesId: id }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.userId = 'admin'; mocks.session.role = 'ADMIN'; mocks.session.active = true;
});

describe('ảnh tổng kết tháng kế toán', () => {
  it('Kim Hương chỉ đọc AMIS cùng tên/kỳ, không gọi SaleWork hoặc bảng khoản theo UUID giả', async () => {
    const response = await request('amis-kim-huong');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.amis).toHaveBeenCalledExactlyOnceWith(expect.anything(), 'Nguyễn Thị Kim Hương', '2026-08-01');
    expect(mocks.saleWork).not.toHaveBeenCalled();
    expect(mocks.targets).not.toHaveBeenCalled();
    expect(mocks.salary).toHaveBeenCalledExactlyOnceWith(expect.anything(), 'amis-kim-huong', '2026-08-01');
    expect(mocks.travel).not.toHaveBeenCalled();
  });
  it('chấp nhận ID tích hợp, lọc đúng tháng cả hai nguồn, không hỏi bảng khoản Sales bằng ID giả', async () => {
    const response = await request();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.amis).toHaveBeenCalledWith(expect.anything(), 'Kế Toán Bán Hàng', '2026-08-01');
    expect(mocks.saleWork).toHaveBeenCalledWith('Abraham Kế Toán Bánhàng', '2026-08');
    expect(mocks.targets).not.toHaveBeenCalled();
    expect(mocks.salary).toHaveBeenCalledExactlyOnceWith(expect.anything(), 'salework-accounting-sales', '2026-08-01');
    expect(mocks.travel).not.toHaveBeenCalled();
  });

  it('chưa đăng nhập bị chặn trước khi đọc số liệu', async () => {
    mocks.session.userId = null;
    expect((await request()).status).toBe(401);
    expect(mocks.saleWork).not.toHaveBeenCalled();
  });

  it('Sales và Admin inactive không được đọc ảnh kế toán', async () => {
    mocks.session.role = 'SALES';
    expect((await request()).status).toBe(403);
    mocks.session.role = 'ADMIN'; mocks.session.active = false;
    expect((await request()).status).toBe(403);
    expect(mocks.saleWork).not.toHaveBeenCalled();
  });

  it('không mở quyền cho ID tích hợp tùy ý', async () => {
    expect((await request('salework-anyone')).status).toBe(400);
    expect(mocks.saleWork).not.toHaveBeenCalled();
  });
});
