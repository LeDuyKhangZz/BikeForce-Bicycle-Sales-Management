import { expect, test } from '@playwright/test';

/**
 * E2E — PWA (FR-036, DEC-024, `PROJECT_CHECKLIST.md § Phase 12`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO PHẢI LÀ E2E CHỨ KHÔNG PHẢI UNIT TEST
 * ─────────────────────────────────────────────────────────────────────────
 *  `lib/pwa/manifest.test.ts` đã khoá **nội dung** manifest. Nhưng hai kiểu
 *  hỏng nguy hiểm nhất của FR-036 không nằm trong nội dung:
 *
 *    1. Manifest bị middleware chặn. Trình duyệt tải nó bằng request **không
 *       kèm cookie**, nên nhánh "chưa đăng nhập" của middleware sẽ trả HTML của
 *       `/login` kèm `status = 200`. Không có lỗi nào hiện ra — chỉ là nút "Thêm
 *       vào màn hình chính" lặng lẽ biến mất. Đúng họ hàng với ISSUE-015.
 *    2. File icon không tồn tại hoặc sai kích thước so với `sizes` đã khai.
 *       Cả build, typecheck, lint lẫn unit test đều xanh — manifest chỉ khai
 *       một chuỗi đường dẫn, không ai kiểm chuỗi đó trỏ vào đâu.
 *
 *  Cả hai chỉ lộ ra khi có một request thật, và đó là việc của bộ này.
 *
 *  Điều bộ này KHÔNG chứng minh: bản thân thao tác "Thêm vào màn hình chính"
 *  trên Chrome mobile / Safari mobile. Việc đó cần thiết bị thật (NFR-009,
 *  ISSUE-003) — headless Chromium không có màn hình chính.
 */

type ManifestIcon = { src: string; sizes: string; type: string; purpose: string };
type Manifest = {
  display: string;
  start_url: string;
  scope: string;
  theme_color: string;
  icons: ManifestIcon[];
};

test.describe('FR-036 — manifest đọc được khi CHƯA đăng nhập', () => {
  test('/manifest.webmanifest trả 200 JSON, không phải trang đăng nhập', async ({ request }) => {
    // `maxRedirects: 0` là bắt buộc — đây chính là bài học ISSUE-015: để
    // Playwright tự đi theo redirect thì trang `/login` trả `200` và bài test
    // "xanh" trong khi manifest hoàn toàn không tới được trình duyệt.
    const response = await request.get('/manifest.webmanifest', { maxRedirects: 0 });

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('manifest+json');

    const manifest = (await response.json()) as Manifest;
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.icons).toHaveLength(4);
  });

  test('mọi icon khai trong manifest đều tồn tại và đúng kích thước đã khai', async ({
    request,
  }) => {
    const response = await request.get('/manifest.webmanifest', { maxRedirects: 0 });
    const manifest = (await response.json()) as Manifest;

    for (const icon of manifest.icons) {
      const file = await request.get(icon.src, { maxRedirects: 0 });

      expect(file.status(), `${icon.src} không tải được`).toBe(200);
      expect(file.headers()['content-type']).toContain('image/png');

      /*
       * Đọc thẳng khối `IHDR`: 8 byte chữ ký + 4 byte độ dài + 4 byte `IHDR`,
       * rồi hai số nguyên 32-bit big-endian là rộng × cao. Cùng cách đo với bài
       * kiểm ảnh 9:16 ở `security.spec.ts` — chứng minh kích thước THẬT của file
       * chứ không tin vào tên file.
       */
      const body = await file.body();
      const [declaredWidth, declaredHeight] = icon.sizes.split('x').map(Number);

      expect(body.readUInt32BE(16), `${icon.src} sai bề rộng`).toBe(declaredWidth);
      expect(body.readUInt32BE(20), `${icon.src} sai chiều cao`).toBe(declaredHeight);
    }
  });

  test('icon của iOS và favicon đọc được khi chưa đăng nhập', async ({ request }) => {
    // iOS BỎ QUA manifest khi "Thêm vào màn hình chính" — nó chỉ đọc
    // `<link rel="apple-touch-icon">`. Thiếu file này thì iPhone lấy ảnh chụp
    // màn hình trang làm icon, và không có bài nào khác trong dự án bắt được.
    for (const path of ['/apple-icon.png', '/icon.svg', '/favicon.ico']) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), `${path} không tải được`).toBe(200);
    }
  });
});

test.describe('FR-036 — trang khai báo đủ thẻ để cài được', () => {
  test('/login có link manifest, apple-touch-icon và theme-color', async ({ page }) => {
    // Kiểm trên trang CÔNG KHAI: đây là trang duy nhất một thiết bị chưa đăng
    // nhập nhìn thấy, nên nếu thẻ chỉ có ở trang trong thì Add to Home Screen
    // từ màn hình đăng nhập sẽ không có icon.
    await page.goto('/login');

    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      /manifest\.webmanifest/,
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#ffffff');
  });
});
