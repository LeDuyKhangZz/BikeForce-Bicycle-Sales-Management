import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createCanvas: vi.fn(),
  createClient: vi.fn(),
  draw: vi.fn(),
  getLatest: vi.fn(),
  loadImage: vi.fn(),
  toBuffer: vi.fn(),
}));

vi.mock('@napi-rs/canvas', () => ({
  createCanvas: mocks.createCanvas,
  GlobalFonts: { registerFromPath: vi.fn(() => true) },
  loadImage: mocks.loadImage,
}));
vi.mock('@/lib/hatde/board-image', () => ({
  drawHatdeBoardImage: mocks.draw,
  getHatdeBoardImageHeight: (count: number) => 1320 + Math.max(0, count - 6) * 130,
  HATDE_BOARD_IMAGE_HEIGHT: 1320,
  HATDE_BOARD_IMAGE_WIDTH: 1080,
}));
vi.mock('@/lib/supabase/admin', () => ({ createReportAutomationClient: mocks.createClient }));
vi.mock('@/services/hatde', () => ({ getLatestHatdeSnapshot: mocks.getLatest }));

import { GET } from './route';

const API_KEY = 'hatde-image-test-key';
const report = {
  snapshot: {
    id: '17abcf76-a9e4-42e4-8b99-e785b0e39fb3',
    report_date: '2026-10-11',
    report_time: '14:35',
    total_revenue: 1_000_000,
    total_transactions: 10,
    created_at: '2026-10-11T07:35:00Z',
  },
  branches: [],
};

function request(apiKey: string | null = API_KEY) {
  const headers = new Headers();
  if (apiKey !== null) headers.set('x-api-key', apiKey);
  return new Request('http://localhost/api/hatde/board/image', { headers });
}

describe('GET /api/hatde/board/image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('HATDE_BOARD_IMAGE_API_KEY', API_KEY);
    mocks.createClient.mockReturnValue({});
    mocks.getLatest.mockResolvedValue(report);
    mocks.loadImage.mockResolvedValue({});
    mocks.toBuffer.mockReturnValue(Buffer.from([137, 80, 78, 71]));
    mocks.createCanvas.mockReturnValue({ getContext: () => ({}), toBuffer: mocks.toBuffer });
  });

  it('trả 503 khi server chưa cấu hình API key', async () => {
    vi.stubEnv('HATDE_BOARD_IMAGE_API_KEY', '');
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(mocks.getLatest).not.toHaveBeenCalled();
  });

  it.each([['thiếu key', null], ['sai key', 'wrong-key']])('trả 401 khi %s', async (_label, key) => {
    const response = await GET(request(key));
    expect(response.status).toBe(401);
    expect(mocks.getLatest).not.toHaveBeenCalled();
  });

  it('trả 404 JSON khi chưa có snapshot', async () => {
    mocks.getLatest.mockResolvedValue(null);
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('trả PNG 1080px và không cache khi có dữ liệu', async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('content-disposition')).toContain('bang-thi-dua-hat-de.png');
    expect(mocks.createCanvas).toHaveBeenCalledWith(1080, 1320);
    expect(mocks.draw).toHaveBeenCalledOnce();
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71]));
  });

  it('tạo canvas với chiều cao 1450px khi có 7 chi nhánh', async () => {
    const validCodes = [
      'cn_15h',
      'lotte_gold_coast',
      'lotte_2310',
      'lotte_vung_tau',
      'passio_pho_quang',
      'passio_dong_den',
      'bep_trung_tam',
    ];
    const reportWith7 = {
      ...report,
      branches: validCodes.map((branch_code, index) => ({
        branch_code,
        rank: index + 1,
        revenue: 1_000_000,
        transactions: 10,
        diff_yesterday_revenue: 0,
        diff_yesterday_percent: 0,
        diff_last_week_revenue: 0,
        diff_last_week_percent: 0,
      })),
    };
    mocks.getLatest.mockResolvedValue(reportWith7);
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(mocks.createCanvas).toHaveBeenCalledWith(1080, 1450);
    expect(mocks.draw).toHaveBeenCalledOnce();
  });
});
