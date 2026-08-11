import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getReportForShare } from '@/services/reports';

import { closePool } from '../integration/setup';
import { setUpRlsFixture, tearDownRlsFixture, type RlsFixture } from './setup';

/**
 * TẦNG 3 — `services/reports.getReportForShare()` chạy dưới JWT THẬT.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO BỘ NÀY BẮT BUỘC PHẢI CÓ
 * ─────────────────────────────────────────────────────────────────────────
 *  `GET /api/reports/[id]/share-image` là **bề mặt IDOR rõ ràng nhất của hệ
 *  thống** (`docs/07 §4.1`): một `id` trong URL, không có form, không có CSRF
 *  token, gọi được bằng một dòng `curl`. Bài bắt buộc của `AGENTS.md §11` cho
 *  Phase 6 là: *salesA gọi share-image với id của salesB → 403/404*.
 *
 *  Nó phải nằm ở `tests/rls/` chứ không phải `tests/integration/`: tầng
 *  integration nối Postgres bằng role `postgres`, mà role đó có `rolbypassrls`
 *  (DEC-031) nên sẽ "xanh" kể cả khi policy sai hoàn toàn.
 *
 *  Bộ này còn khoá lại một thứ nữa mà unit test không với tới: cú pháp embedded
 *  resource `sales:profiles!inner(...)`. Nếu tên quan hệ sai, `data` trả về
 *  `null` và thẻ ảnh mất tên Sales — mà route vẫn trả 404 nên trông hệt như
 *  "không có quyền".
 */

let fx: RlsFixture;

beforeAll(async () => {
  fx = await setUpRlsFixture();
});

afterAll(async () => {
  await tearDownRlsFixture();
  await closePool();
});

describe('getReportForShare() — UC-08, FR-018', () => {
  it('Sales đọc được báo cáo của CHÍNH MÌNH, kèm tên và mã nhân viên', async () => {
    const report = await getReportForShare(fx.clients.salesA, fx.reports.salesA);

    expect(report).not.toBeNull();
    expect(report?.id).toBe(fx.reports.salesA);
    // Chứng minh embedded resource `sales:profiles!inner(...)` đúng tên quan hệ.
    expect(report?.sales).toEqual({ full_name: 'RLS Sales A', employee_code: 'RLS-A' });
  });

  it('trả về `status` để route handler chọn BIẾN THỂ ảnh — fixture đang MORNING_SUBMITTED', async () => {
    const report = await getReportForShare(fx.clients.salesA, fx.reports.salesA);

    // PHASE 14 (DEC-058): giá trị này cho ra thẻ bản `MORNING` (bảng 2 cột) chứ
    // không còn cho ra 403 `NOT_COMPLETED` như trước. Service KHÔNG tự lọc theo
    // status: quyết định nghiệp vụ thuộc về tầng gọi (AGENTS.md §5).
    expect(report?.status).toBe('MORNING_SUBMITTED');
  });

  it('BR-003 — salesA KHÔNG đọc được báo cáo của salesB dù biết chính xác id', async () => {
    const stolen = await getReportForShare(fx.clients.salesA, fx.reports.salesB);

    // RLS `reports_select_own_or_admin` trả 0 dòng ⇒ `null` ⇒ route trả 404,
    // giống hệt trường hợp id không tồn tại. Đó là điều kiện chống dò ID.
    expect(stolen).toBeNull();
  });

  it('BR-022 — Admin đọc được báo cáo của Sales bất kỳ qua đúng route đó', async () => {
    const report = await getReportForShare(fx.clients.admin, fx.reports.salesA);

    expect(report).not.toBeNull();
    expect(report?.sales.full_name).toBe('RLS Sales A');
  });

  it('chưa đăng nhập thì không đọc được gì — deny-by-default (NFR-004)', async () => {
    expect(await getReportForShare(fx.anon, fx.reports.salesA)).toBeNull();
  });

  it('id không tồn tại trả `null` giống hệt id không có quyền', async () => {
    const missing = await getReportForShare(
      fx.clients.salesA,
      '11111111-2222-3333-4444-555555555555',
    );

    expect(missing).toBeNull();
  });
});
