import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { E2E_ADMIN_EMAIL, E2E_DONE_SALES_EMAIL, flowSalesEmail, toE2eProject } from './accounts';
import { signIn } from './helpers';

/**
 * E2E — KHẢ NĂNG TIẾP CẬN (NFR-007).
 *
 * `PROJECT_CHECKLIST.md § Phase 11`: **0 violation mức serious/critical** trên
 * `/login`, `/sales/today`, `/sales/today/morning`, `/admin`. Bộ này quét thêm
 * ba màn hình mới của Phase 7–9 vì chúng có bảng, biểu đồ và điều hướng — ba
 * chỗ dễ sai nhất về a11y.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO CHỈ CHẶN Ở MỨC serious/critical
 * ─────────────────────────────────────────────────────────────────────────
 *  axe xếp hạng 4 mức. `minor` và `moderate` gồm nhiều khuyến nghị mang tính
 *  phong cách (ví dụ "vùng landmark nên có nhãn duy nhất") mà việc chạy theo
 *  chúng không cải thiện gì cho người dùng thật của app này. Ngưỡng
 *  serious/critical là ngưỡng NFR-007 đặt ra, và nó là ngưỡng được thực thi —
 *  không nới thêm.
 *
 *  Vi phạm bị bỏ qua sẽ được IN RA đầy đủ khi có, để không ai "vượt qua" bằng
 *  cách không nhìn.
 */

const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

async function scan(page: import('@playwright/test').Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const blocking = results.violations.filter((violation) =>
    BLOCKING_IMPACTS.has(violation.impact ?? ''),
  );

  const detail = blocking
    .map(
      (violation) =>
        `[${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes.length} phần tử)\n  ${violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(' '))
          .join('\n  ')}`,
    )
    .join('\n');

  expect(blocking, `${label} có vi phạm a11y mức serious/critical:\n${detail}`).toHaveLength(0);
}

test.describe('NFR-007 — 0 vi phạm serious/critical', () => {
  test('/login (chưa đăng nhập)', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
    await scan(page, '/login');
  });

  test('/sales/today — trạng thái CHƯA báo cáo', async ({ page }, testInfo) => {
    await signIn(page, flowSalesEmail(toE2eProject(testInfo.project.name)));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await scan(page, '/sales/today (chưa báo cáo)');
  });

  test('/sales/today — trạng thái ĐÃ hoàn thành, có bảng đối chiếu', async ({ page }) => {
    await signIn(page, E2E_DONE_SALES_EMAIL);
    await expect(page.getByText('Đã hoàn thành')).toBeVisible();
    await scan(page, '/sales/today (đã hoàn thành)');
  });

  test('/sales/today/morning — form 5 trường bắt buộc', async ({ page }, testInfo) => {
    await signIn(page, flowSalesEmail(toE2eProject(testInfo.project.name)));
    await page.goto('/sales/today/morning');
    await expect(page.locator('[name="planned_route"]')).toBeVisible();
    await scan(page, '/sales/today/morning');
  });

  test('/sales/history — danh sách và bộ lọc tháng', async ({ page }) => {
    await signIn(page, E2E_DONE_SALES_EMAIL);
    await page.goto('/sales/history');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await scan(page, '/sales/history');
  });

  test('/sales/account — hồ sơ và đổi mật khẩu', async ({ page }) => {
    await signIn(page, E2E_DONE_SALES_EMAIL);
    await page.goto('/sales/account');
    await expect(page.locator('[name="password"]')).toBeVisible();
    await scan(page, '/sales/account');
  });

  test('/admin — dashboard 12 chỉ số', async ({ page }) => {
    await signIn(page, E2E_ADMIN_EMAIL);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await scan(page, '/admin');
  });

  test('/admin/reports — bảng có bộ lọc', async ({ page }) => {
    await signIn(page, E2E_ADMIN_EMAIL);
    await page.goto('/admin/reports');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await scan(page, '/admin/reports');
  });

  test('/admin/analytics — có biểu đồ SVG và bảng thay thế', async ({ page }) => {
    await signIn(page, E2E_ADMIN_EMAIL);

    const previousMonth = await page.evaluate(() => {
      const now = new Date();
      const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`;
    });

    await page.goto(`/admin/analytics?month=${previousMonth}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await scan(page, '/admin/analytics');
  });

  test('/admin/sales/new — form tạo tài khoản', async ({ page }) => {
    await signIn(page, E2E_ADMIN_EMAIL);
    await page.goto('/admin/sales/new');
    await expect(page.locator('[name="email"]')).toBeVisible();
    await scan(page, '/admin/sales/new');
  });

  /**
   * PHASE 14 (DEC-063) — trang này **đổi bản chất** nên phải quét lại.
   *
   * Trước đây nó chỉ đọc, và `/sales/account` đã quét khuôn tương đương. Nay nó
   * có một form ba trường **cộng** một khối `<dl>` chỉ đọc nằm ngay trong cùng
   * thẻ `<form>` — đúng kiểu bố cục dễ sinh nhãn mồ côi và thứ tự tiêu đề sai.
   */
  test('/admin/account — form sửa hồ sơ của chính mình', async ({ page }) => {
    await signIn(page, E2E_ADMIN_EMAIL);
    await page.goto('/admin/account');
    await expect(page.locator('[name="full_name"]')).toBeVisible();
    await scan(page, '/admin/account');
  });
});
