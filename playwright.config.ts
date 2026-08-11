import { defineConfig, devices } from '@playwright/test';

import { E2E_BASE_URL, E2E_PORT, loadE2eEnv } from './e2e/env';

/**
 * Cấu hình E2E — PHASE 11 (`docs/08 §2.4`, `PROJECT_CHECKLIST.md § Phase 11`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  BA PROJECT, VÀ VÌ SAO ĐỦ BA
 * ─────────────────────────────────────────────────────────────────────────
 *  `mobile-375`   — bề rộng NHỎ NHẤT phải hỗ trợ. Sales dùng điện thoại ngoài
 *                   thị trường, nên đây là môi trường **thật**, không phải
 *                   trường hợp biên.
 *  `desktop-1440` — nơi DEC-019 đổi card thành `<table>` và DEC-018 đổi bottom
 *                   nav thành sidebar. Hai nhánh hiển thị khác nhau ⇒ phải đo cả hai.
 *  `zalo-like`    — userAgent của webview trong ứng dụng Zalo (NFR-009).
 *
 *  ⚠ GIỚI HẠN ĐÃ BIẾT của `zalo-like`, ghi ở đây để không ai đọc nhầm kết quả:
 *  đội một `userAgent` khác **không** tái hiện được giới hạn API thật của
 *  webview (Web Share API, quyền tải file, quyền lưu ảnh). Nó bắt được lỗi ở
 *  tầng bố cục và tầng suy luận theo UA, **không** thay thế được ISSUE-003 —
 *  việc đó vẫn cần một điện thoại thật và một link công khai.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  MÔI TRƯỜNG — vì sao tự dựng server thay vì trỏ vào `npm run dev`
 * ─────────────────────────────────────────────────────────────────────────
 *  Bộ E2E **ghi và xoá dữ liệu**. `.env.local` của máy này trỏ sang Supabase
 *  cloud, và `NEXT_PUBLIC_*` được Next nhúng vào bundle **lúc build** — nên
 *  không thể sửa sau khi build xong. Vì vậy `webServer` tự chạy `next build`
 *  với env đã bơm từ `.env.test.local` (xem `e2e/env.ts`), đảm bảo cả server
 *  lẫn bundle client đều trỏ vào Supabase LOCAL (DEC-022).
 *
 *  `reuseExistingServer: false` là **cố ý**: một `next start` cũ còn giữ cổng
 *  sẽ phục vụ đúng bản build cũ với env cũ, và đó đã từng gây một vòng chẩn
 *  đoán sai ở Phase 4. Thà chờ build lại còn hơn đo nhầm.
 */

const env = loadE2eEnv();

export default defineConfig({
  testDir: './e2e',
  // Cả ba project cùng chạm một database local ⇒ không chạy song song trong
  // một project. Mỗi project đã có Sales riêng nên chạy song song GIỮA các
  // project là an toàn (xem `e2e/fixtures.ts`).
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: E2E_BASE_URL,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    /*
     * ISSUE-028 — bộ quét a11y ĐUA với hiệu ứng xuất hiện, và thua.
     *
     * `/login` có `animate-rise-in` (opacity 0→1 trong 260ms, DEC-053). axe chạy
     * ngay sau khi nút "Đăng nhập" hiện ra, nên có lượt nó đo màu chữ **giữa
     * chừng hiệu ứng**: `text-heading` `#0B4A76` bị đọc thành `#8BA9BE`
     * (2,29:1) và báo `color-contrast` mức serious. Bài này đỏ trên một project
     * rồi xanh ở lượt sau — đúng dạng flaky tệ nhất: nó dạy người đọc bỏ qua
     * kết quả đỏ.
     *
     * `reducedMotion: 'reduce'` khiến trình duyệt gửi `prefers-reduced-motion:
     * reduce`, và `app/globals.css` đã tôn trọng cờ đó từ DEC-053 (rút mọi
     * animation về 0,01ms). Nhờ vậy mọi phép đo màu chạy trên **trạng thái cuối**.
     *
     * ⚠ Đây KHÔNG phải che lỗi: màu cuối cùng vẫn đúng bảng đã đo của DEC-046
     * (`#0B4A76` trên nền `#F4F7FA` = **8,66:1**). WCAG không yêu cầu đủ tương
     * phản ở từng khung hình của một hiệu ứng chuyển tiếp. Nó cũng là cấu hình
     * TRUNG THỰC hơn: một người bật "giảm chuyển động" là người dùng thật.
     *
     * ⚠ Ở Playwright 1.62, `reducedMotion` nằm trong `contextOptions`, KHÔNG
     * phải trực tiếp trong `use` — đặt sai chỗ là lỗi biên dịch, và `next build`
     * bắt được nó trước cả Playwright vì webServer chạy `next build` (type-check
     * cả `playwright.config.ts`).
     */
    contextOptions: { reducedMotion: 'reduce' },
  },

  projects: [
    {
      name: 'mobile-375',
      use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 }, isMobile: true },
    },
    {
      name: 'desktop-1440',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'zalo-like',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        // Chuỗi UA của webview Zalo trên Android — phần `ZaloTheme` là dấu hiệu
        // mà các thư viện nhận diện webview thường bắt.
        userAgent:
          'Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 ZaloTheme/light ZaloLanguage/vi',
      },
    },
  ],

  webServer: {
    command: `npx next build && npx next start --port ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...env,
      NEXT_PUBLIC_SITE_URL: E2E_BASE_URL,
    },
  },
});
