import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createReportAutomationClient: mocks.createClient,
}));

vi.mock('@/services/hatde', () => ({
  upsertHatdeSnapshot: mocks.upsert,
}));

import { POST } from './route';

const VALID_TOKEN = 'hatde-test-token';
const validPayload = {
  report_date: '2026-10-11',
  report_time: '12:25',
  branches: [
    { branch_code: 'cn_15h', revenue: 1_000_000, transactions: 10, vs_yesterday: 5, vs_last_week: -2 },
    { branch_code: 'lotte_vung_tau', revenue: 2_000_000, transactions: 20, vs_yesterday: -5, vs_last_week: 12 },
    { branch_code: 'passio_pho_quang', revenue: 0, transactions: 0, vs_yesterday: 0, vs_last_week: 0 },
    { branch_code: 'passio_dong_den', revenue: 500_000, transactions: 5, vs_yesterday: 1, vs_last_week: 2 },
    { branch_code: 'lotte_gold_coast', revenue: 0, transactions: 0, vs_yesterday: 0, vs_last_week: 0 },
    { branch_code: 'lotte_2310', revenue: 0, transactions: 0, vs_yesterday: 0, vs_last_week: 0 },
  ],
};

function request(payload: unknown, token: string | null = VALID_TOKEN): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (token !== null) headers.set('x-gustino-token', token);
  return new Request('http://localhost/api/n8n/hatde-snapshot', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

describe('POST /api/n8n/hatde-snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('N8N_REPORT_WEBHOOK_TOKEN', VALID_TOKEN);
    mocks.createClient.mockReturnValue({});
    mocks.upsert.mockResolvedValue({ id: '17abcf76-a9e4-42e4-8b99-e785b0e39fb3', created: true });
  });

  it.each([
    ['thiếu token', null, VALID_TOKEN],
    ['sai token', 'wrong-token', VALID_TOKEN],
    ['env chưa set', VALID_TOKEN, ''],
  ])('trả 401 khi %s', async (_label, token, envToken) => {
    vi.stubEnv('N8N_REPORT_WEBHOOK_TOKEN', envToken);
    const response = await POST(request(validPayload, token));
    expect(response.status).toBe(401);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it.each([
    ['thiếu trường', { report_date: '2026-10-11' }],
    ['mã sai', { ...validPayload, branches: [{ ...validPayload.branches[0], branch_code: 'invalid' }] }],
    ['trùng mã', { ...validPayload, branches: [validPayload.branches[0], validPayload.branches[0]] }],
    ['mảng rỗng', { ...validPayload, branches: [] }],
  ])('trả 400 khi %s', async (_label, payload) => {
    const response = await POST(request(payload));
    expect(response.status).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('tự tính tổng và vẫn lưu chi nhánh doanh thu/giao dịch cùng bằng 0', async () => {
    const response = await POST(request(validPayload));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: '17abcf76-a9e4-42e4-8b99-e785b0e39fb3',
      created: true,
    });
    expect(mocks.upsert).toHaveBeenCalledWith({}, expect.objectContaining({
      totalRevenue: 3_500_000,
      totalTransactions: 35,
      branches: expect.arrayContaining([
        expect.objectContaining({ branch_code: 'passio_pho_quang' }),
      ]),
    }));
    expect(mocks.upsert.mock.calls[0]?.[1].branches).toHaveLength(6);
  });

  it('trả created=false khi RPC nhận lại cùng ngày và giờ', async () => {
    mocks.upsert.mockResolvedValue({ id: '17abcf76-a9e4-42e4-8b99-e785b0e39fb3', created: false });
    const response = await POST(request(validPayload));
    expect(await response.json()).toEqual(expect.objectContaining({ created: false }));
  });
});
