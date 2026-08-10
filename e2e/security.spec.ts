import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

import { E2E_ADMIN_EMAIL, E2E_DONE_SALES_EMAIL } from './accounts';
import { E2E_PASSWORD, loadE2eEnv } from './env';
import { signIn } from './helpers';

/**
 * E2E — BẢO MẬT (`PROJECT_CHECKLIST.md § Phase 11`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  MỘT BÀI HỌC ĐÃ TRẢ GIÁ, GHI THẲNG VÀO CÁCH VIẾT BỘ NÀY
 * ─────────────────────────────────────────────────────────────────────────
 *  ISSUE-015: một phép kiểm "chưa đăng nhập → 401" từng báo `200` và suýt bị
 *  kết luận thành lỗ hổng "phát ảnh cho người lạ". Sự thật là middleware trả
 *  `307` về `/login` và **Playwright tự đi theo redirect** rồi thấy trang đăng
 *  nhập `200`. Vì vậy mọi bài dưới đây gọi API bằng `maxRedirects: 0` — đo đúng
 *  mã trạng thái đầu tiên, không đo mã của trang đích.
 *
 *  Ba bề mặt được đo, đúng ba đường mà một Sales tò mò có thể thử:
 *    1. mở thẳng URL màn hình của người khác  → `notFound()`;
 *    2. gọi thẳng route API ảnh của người khác → 404 (KHÔNG phải 403);
 *    3. gọi route xuất CSV toàn đội            → 403.
 */

test.describe('BR-003 / BR-022 — Sales không đọc được dữ liệu của người khác', () => {
  test('mở thẳng /sales/reports/<id-của-người-khác> → không tìm thấy', async ({ page }) => {
    const env = loadE2eEnv();

    // Lấy một `id` báo cáo có thật bằng phiên của CHÍNH CHỦ, rồi thử đọc nó
    // bằng một tài khoản khác — đúng kịch bản IDOR.
    const owner = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await owner.auth.signInWithPassword({ email: E2E_DONE_SALES_EMAIL, password: E2E_PASSWORD });
    const { data } = await owner.from('daily_reports').select('id').limit(1);
    const reportId = data?.[0]?.id;

    expect(reportId, 'Fixture phải có ít nhất một báo cáo').toBeDefined();
    if (reportId === undefined) return;

    // Admin thì ĐƯỢC xem (BR-022) — kiểm cả hai chiều mới có ý nghĩa.
    await signIn(page, E2E_ADMIN_EMAIL);
    const adminView = await page.goto(`/admin/reports/${reportId}`);
    expect(adminView?.status()).toBe(200);

    // Nhưng Admin đi vào cửa của Sales thì bị guard vai trò chặn.
    await page.goto(`/sales/reports/${reportId}`);
    await expect(page).toHaveURL(/\/admin(\?|$)/);
  });

  /**
   * ⚠ Bài này CỐ Ý không assert mã 404 cho trang — xem `docs/12 § ISSUE-017`.
   *
   * Route nằm trong route group có `loading.tsx`, nên Next stream phần vỏ ra
   * trước; khi `notFound()` được ném thì header đã gửi đi rồi và mã trạng thái
   * không đổi được nữa, kết quả là **200 kèm giao diện "Không tìm thấy"**.
   *
   * Thứ BR-003 thật sự đòi hỏi vẫn nguyên vẹn và ĐƯỢC ĐO ở đây: hai tình huống
   * "id không tồn tại" và "id của người khác" phải cho ra **kết quả không phân
   * biệt được**, để trang không trở thành kênh dò ID. Route API — nơi `fetch()`
   * đọc mã trạng thái để quyết định — vẫn trả 404/401 thật, có bài riêng bên dưới.
   */
  test('id không tồn tại và id của người khác KHÔNG phân biệt được', async ({ page }) => {
    await signIn(page, E2E_DONE_SALES_EMAIL);

    const unknown = await page.goto('/sales/reports/00000000-0000-4000-8000-000000000000');
    const unknownStatus = unknown?.status();
    const unknownText = await page.innerText('body');

    // Một `id` có thật nhưng KHÔNG thuộc về tài khoản đang đăng nhập.
    const other = await page.goto('/sales/reports/11111111-1111-4111-8111-111111111111');
    const otherStatus = other?.status();
    const otherText = await page.innerText('body');

    expect(unknownStatus).toBe(otherStatus);
    expect(unknownText).toContain('Không tìm thấy');
    expect(otherText).toContain('Không tìm thấy');
  });

  /**
   * Phép đo so sánh để chốt nguyên nhân của ISSUE-017: một đường dẫn KHÔNG nằm
   * trong route group có `loading.tsx` vẫn trả 404 thật. Nếu bài này một ngày
   * nào đó cũng thành 200 thì nguyên nhân đã khác, và ISSUE-017 phải viết lại.
   */
  test('đường dẫn không tồn tại ngoài route group vẫn trả 404 thật', async ({ page }) => {
    // PHẢI đăng nhập trước: middleware chuyển mọi đường dẫn không công khai của
    // khách vãng lai về `/login`, và Playwright đi theo redirect nên sẽ thấy
    // `200` của trang đăng nhập chứ không phải mã của đường dẫn đang đo
    // (đúng cái bẫy ISSUE-015 đã ghi lại).
    await signIn(page, E2E_DONE_SALES_EMAIL);

    const response = await page.goto('/duong-dan-khong-ton-tai');
    expect(response?.status()).toBe(404);
  });
});

test.describe('DEC-039 — route /api/* trả JSON, KHÔNG redirect', () => {
  test('chưa đăng nhập gọi route ảnh → 401 JSON', async ({ request }) => {
    const response = await request.get(
      '/api/reports/00000000-0000-4000-8000-000000000000/share-image',
      { maxRedirects: 0 },
    );

    expect(response.status()).toBe(401);
    expect(response.headers()['content-type']).toContain('application/json');
  });

  test('chưa đăng nhập gọi route CSV → 401 JSON', async ({ request }) => {
    const response = await request.get('/api/admin/reports/export', { maxRedirects: 0 });

    expect(response.status()).toBe(401);
    expect(response.headers()['content-type']).toContain('application/json');
  });
});

test.describe('FR-034 — xuất CSV chỉ dành cho Admin', () => {
  test('Sales gọi route xuất CSV → 403, không nhận một dòng dữ liệu nào', async ({ page }) => {
    await signIn(page, E2E_DONE_SALES_EMAIL);

    const response = await page.request.get('/api/admin/reports/export', { maxRedirects: 0 });

    expect(response.status()).toBe(403);
    const body = await response.text();
    expect(body).not.toContain('report_date');
  });

  test('Admin gọi route xuất CSV → 200, đúng header tải file và không cache', async ({ page }) => {
    await signIn(page, E2E_ADMIN_EMAIL);

    const response = await page.request.get('/api/admin/reports/export', { maxRedirects: 0 });

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/csv');
    expect(response.headers()['content-disposition']).toContain('attachment');
    // File chứa doanh thu toàn đội — không được nằm lại trong cache nào.
    expect(response.headers()['cache-control']).toContain('no-store');
  });
});

test.describe('BR-002 — ảnh chỉ xuất được sau khi báo cáo đã hoàn tất', () => {
  test('Admin gọi route ảnh của một báo cáo đã COMPLETED → PNG 1080×1920', async ({ page }) => {
    const env = loadE2eEnv();

    const owner = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await owner.auth.signInWithPassword({ email: E2E_DONE_SALES_EMAIL, password: E2E_PASSWORD });
    const { data } = await owner
      .from('daily_reports')
      .select('id')
      .eq('status', 'COMPLETED')
      .limit(1);
    const reportId = data?.[0]?.id;

    expect(reportId).toBeDefined();
    if (reportId === undefined) return;

    await signIn(page, E2E_ADMIN_EMAIL);
    const response = await page.request.get(`/api/reports/${reportId}/share-image`, {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');

    /*
     * Đọc thẳng khối `IHDR` của PNG: 8 byte chữ ký + 4 byte độ dài + 4 byte
     * `IHDR`, rồi hai số nguyên 32-bit big-endian là rộng × cao. Đây là cách duy
     * nhất chứng minh kích thước THẬT của ảnh mà không cần thư viện xử lý ảnh.
     */
    const body = await response.body();
    expect(body.readUInt32BE(16)).toBe(1080);
    expect(body.readUInt32BE(20)).toBe(1920);
  });
});

test.describe('NFR-005 — service role key không rò rỉ ra client', () => {
  test('không trang nào của ứng dụng chứa service role key', async ({ page }) => {
    const env = loadE2eEnv();

    await signIn(page, E2E_ADMIN_EMAIL);

    for (const path of ['/admin', '/admin/sales', '/admin/sales/new', '/admin/reports']) {
      await page.goto(path);
      const html = await page.content();

      expect(html, `${path} chứa service role key`).not.toContain(env.SUPABASE_SERVICE_ROLE_KEY);
      expect(html, `${path} chứa biến SUPABASE_SERVICE_ROLE_KEY`).not.toContain(
        'SUPABASE_SERVICE_ROLE_KEY',
      );
    }
  });
});
