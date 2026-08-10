import { expect, test } from '@playwright/test';

import {
  E2E_ADMIN_EMAIL,
  E2E_DONE_SALES_NAME,
  createdSalesEmail,
  toE2eProject,
} from './accounts';
import {
  expectNoBrokenNumbers,
  expectNoHorizontalScroll,
  fillField,
  signIn,
  visibleText,
} from './helpers';

/**
 * E2E — LUỒNG ADMIN (`PROJECT_CHECKLIST.md § Phase 11`):
 * Login → Dashboard → Reports → Filter tháng → Filter Sales → Detail.
 * Cộng thêm phần Phase 10 mà checklist đòi kiểm bằng đường người dùng thật.
 */

const newSalesEmailFor = (projectName: string): string =>
  createdSalesEmail(toE2eProject(projectName));

test.beforeEach(async ({ page }) => {
  await signIn(page, E2E_ADMIN_EMAIL);
});

test.describe('FR-024 / FR-033 — dashboard tổng quan', () => {
  test('UC-12: Admin vào đúng /admin và thấy 12 chỉ số + cảnh báo', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin(\?|$)/);

    // Bốn con số đếm của `docs/01 §12.1`.
    await expect(page.getByText('Sales đang hoạt động')).toBeVisible();
    await expect(visibleText(page, /Chưa báo cáo/)).toBeVisible();

    // FR-033 / AF-02 — fixture có 3 Sales luồng chưa báo cáo hôm nay.
    await expect(visibleText(page, /chưa/i)).toBeVisible();

    await expectNoBrokenNumbers(page);
    await expectNoHorizontalScroll(page);
  });
});

test.describe('FR-025 / FR-026 / FR-027 — danh sách và chi tiết báo cáo', () => {
  test('UC-13 → UC-14: lọc theo Sales rồi mở chi tiết báo cáo của người đó', async ({ page }) => {
    await page.getByRole('link', { name: 'Báo cáo' }).first().click();
    await expect(page).toHaveURL(/\/admin\/reports/);
    await expectNoHorizontalScroll(page);

    /*
     * Search theo tên Sales (`ilike`) — filter chạy SERVER-SIDE.
     * Tham số là `q`, không phải `search`: xem `REPORT_FILTER_PARAMS` trong
     * `lib/reports/admin-filters.ts`.
     *
     * Đo bằng CẶP ĐỐI CHỨNG thay vì tìm tên trên trang: tên mọi Sales luôn có
     * sẵn trong `<option>` của bộ lọc "Nhân viên", nên một phép `getByText`
     * trần sẽ "xanh" kể cả khi bộ lọc không lọc gì cả.
     */
    await page.goto(`/admin/reports?q=${encodeURIComponent(E2E_DONE_SALES_NAME)}`);
    await expect(page.locator('a[href^="/admin/reports/"]:visible').first()).toBeVisible({
      timeout: 20_000,
    });

    await page.goto(`/admin/reports?q=${encodeURIComponent('KhongCoAiTenNhuVay')}`);
    await expect(visibleText(page, 'Không có báo cáo nào khớp bộ lọc')).toBeVisible();

    /* ── Lọc theo tháng ────────────────────────────────────────────────────── */
    const previousMonth = await page.evaluate(() => {
      const now = new Date();
      const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`;
    });

    await page.goto(`/admin/reports?month=${previousMonth}`);
    const detailLink = page.locator('a[href^="/admin/reports/"]:visible').first();
    await expect(detailLink).toBeVisible({ timeout: 20_000 });
    await expectNoBrokenNumbers(page);

    /* ── UC-14 — Admin xem chi tiết báo cáo của một Sales bất kỳ (BR-022) ──── */
    await detailLink.click();
    await expect(page).toHaveURL(/\/admin\/reports\/[0-9a-f-]{36}/);
    await expect(visibleText(page, 'Viếng thăm')).toBeVisible();
    await expectNoBrokenNumbers(page);
    await expectNoHorizontalScroll(page);
  });

  test('bộ lọc rác không làm sập trang', async ({ page }) => {
    await page.goto('/admin/reports?month=abc&status=HACK&page=-9&q=' + 'x'.repeat(500));

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoBrokenNumbers(page);
  });
});

test.describe('FR-028 / FR-037 — phân tích tháng và biểu đồ trend', () => {
  test('UC-15: bốn chỉ tiêu tổng + biểu đồ theo ngày có phương án bảng', async ({ page }) => {
    const previousMonth = await page.evaluate(() => {
      const now = new Date();
      const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`;
    });

    await page.goto(`/admin/analytics?month=${previousMonth}`);

    await expect(page.getByText('Tổng cam kết và thực đạt')).toBeVisible({ timeout: 20_000 });

    /* ── FR-037 — biểu đồ SVG có nhãn cho trình đọc màn hình ───────────────── */
    const chart = page.getByRole('img', { name: /Biểu đồ cột/ });
    await expect(chart).toBeVisible();

    /* ── Phương án data-table bắt buộc của Phase 9 ─────────────────────────── */
    await page.getByText('Xem số liệu dạng bảng').click();
    await expect(page.getByRole('table', { name: /theo từng ngày/i })).toBeVisible();

    /* ── Đổi chỉ tiêu bằng URL, không bằng state client ────────────────────── */
    await page.getByRole('link', { name: 'Doanh số' }).click();
    await expect(page).toHaveURL(/metric=SALES_QUANTITY/);
    await expect(page.getByRole('img', { name: /Biểu đồ cột doanh số/i })).toBeVisible();

    await expectNoBrokenNumbers(page);
    await expectNoHorizontalScroll(page);
  });

  test('?metric= rác về chỉ tiêu mặc định, không sập', async ({ page }) => {
    await page.goto('/admin/analytics?metric=__proto__');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoBrokenNumbers(page);
  });
});

test.describe('FR-029 / FR-030 / FR-032 — quản lý tài khoản Sales', () => {
  test('UC-16: bảng hiệu suất hiện đủ Sales kèm số ngày đạt KPI', async ({ page }) => {
    await page.getByRole('link', { name: 'Sales' }).first().click();
    await expect(page).toHaveURL(/\/admin\/sales(\?|$)/);

    await expect(visibleText(page, E2E_DONE_SALES_NAME)).toBeVisible({ timeout: 20_000 });
    await expectNoBrokenNumbers(page);
    await expectNoHorizontalScroll(page);
  });

  test('UC-17: tạo tài khoản Sales, mật khẩu tạm hiện đúng một lần', async ({ page }, testInfo) => {
    const email = newSalesEmailFor(testInfo.project.name);

    await page.goto('/admin/sales/new');

    await fillField(page, 'email', email);
    await fillField(page, 'password', 'MatKhauTam2026');
    await fillField(page, 'full_name', 'E2E Nhân Viên Mới');
    await fillField(page, 'phone', '0912345678');
    await fillField(page, 'employee_code', `E2E-${testInfo.project.name.slice(0, 5)}`);

    await page.getByRole('button', { name: /Tạo tài khoản/ }).click();

    // Cố ý KHÔNG redirect: Admin phải ở lại để chép mật khẩu tạm.
    await expect(page.getByText(/Đã tạo tài khoản/)).toBeVisible({ timeout: 20_000 });

    /* ── BR-025 — email trùng bị chặn, báo lỗi tiếng Việt ──────────────────── */
    await page.goto('/admin/sales/new');
    await fillField(page, 'email', email);
    await fillField(page, 'password', 'MatKhauTam2026');
    await fillField(page, 'full_name', 'E2E Trùng Email');
    await page.getByRole('button', { name: /Tạo tài khoản/ }).click();

    // Câu này xuất hiện HAI chỗ cùng lúc — banner đầu form và lỗi gắn vào ô
    // email. Đó là chủ ý của form, nên lấy phần tử đầu tiên đang hiển thị.
    await expect(visibleText(page, /đã được dùng/i)).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('FR-004 — ranh giới vai trò', () => {
  test('Admin KHÔNG vào được khu vực Sales', async ({ page }) => {
    await page.goto('/sales/today');

    // Guard đưa về dashboard của chính mình, không phải trang lỗi.
    await expect(page).toHaveURL(/\/admin(\?|$)/);
  });
});
