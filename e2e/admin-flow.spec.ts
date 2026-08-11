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

    // DEC-066 — URL trần mặc định tháng hiện tại, không còn mở toàn lịch sử.
    await expect(visibleText(page, /Tháng \d{2}\/\d{4}/)).toBeVisible();
    const advanced = page.locator('details').filter({ hasText: 'Bộ lọc nâng cao' });
    await expect(advanced).not.toHaveAttribute('open', '');
    await expect(page.getByLabel('Nhân viên')).not.toBeVisible();

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
    await page.getByText('Bộ lọc nâng cao').click();
    await page.getByLabel('Nhân viên').selectOption({ label: E2E_DONE_SALES_NAME });
    await page.getByLabel('Trạng thái').selectOption('COMPLETED');
    await page.getByRole('button', { name: /Áp dụng bộ lọc/ }).click();
    await expect(page).toHaveURL(/status=COMPLETED/);
    const filteredUrl = new URL(page.url());
    expect(filteredUrl.searchParams.get('month')).toBe(previousMonth);
    expect(filteredUrl.searchParams.get('salesId')).not.toBeNull();
    expect(filteredUrl.searchParams.get('status')).toBe('COMPLETED');
    await expect(visibleText(page, E2E_DONE_SALES_NAME)).toBeVisible();
    await expect(visibleText(page, 'Đã hoàn thành')).toBeVisible();

    // Nhảy thẳng tới trang 2 — không bấm "Trang sau" tuần tự.
    await page.getByLabel('Đi tới trang').fill('2');
    await page.getByRole('button', { name: 'Mở trang đã nhập' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(visibleText(page, /Báo cáo 21–\d+ trên/)).toBeVisible();

    const detailLink = page.locator('a[href^="/admin/reports/"]:visible').first();
    await expect(detailLink).toBeVisible({ timeout: 20_000 });
    await expectNoBrokenNumbers(page);

    /* ── UC-14 — Admin xem chi tiết báo cáo của một Sales bất kỳ (BR-022) ──── */
    await detailLink.click();
    await expect(page).toHaveURL(/\/admin\/reports\/[0-9a-f-]{36}/);
    await expect(visibleText(page, 'Viếng thăm')).toBeVisible();
    await expectNoBrokenNumbers(page);
    await expectNoHorizontalScroll(page);

    // Back giữ đúng tháng, Sales, trạng thái và trang đang xem (state-preservation).
    await page.goBack();
    await expect(page).toHaveURL(/month=.*salesId=.*status=COMPLETED.*page=2/);
    await expect(visibleText(page, /Báo cáo 21–\d+ trên/)).toBeVisible();
  });

  test('chỉ period=all mới mở toàn bộ lịch sử', async ({ page }) => {
    await page.goto('/admin/reports?period=all');

    await expect(visibleText(page, 'Tất cả thời gian')).toBeVisible();
    await expect(page).toHaveURL(/period=all/);
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

    /* ── Phương án data-table bắt buộc của Phase 9 ─────────────────────────────
       PHASE 13: khối này render HAI nhánh theo DEC-019 — danh sách thẻ ở
       < 768px, `<table>` thật từ 768px. Trước đây nó là một `<table>` duy nhất
       và **tràn ngang 116px ở 375px**. Vì vậy assert theo NỘI DUNG NHÌN THẤY
       chứ không theo `role=table`: role đó cố ý không tồn tại ở mobile.        */
    await page.getByText('Xem số liệu dạng bảng').click();
    await expect(visibleText(page, 'Hoàn thành')).toBeVisible();

    /* ── Đổi chỉ tiêu bằng URL, không bằng state client ────────────────────── */
    await page.getByRole('link', { name: 'Doanh số' }).click();
    await expect(page).toHaveURL(/metric=SALES_AMOUNT/);
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

/**
 * PHASE 14 — DEC-063: Admin sửa hồ sơ của chính mình.
 *
 * Trước đó `/admin/account` chỉ đọc và kết thúc bằng câu "Cần sửa thông tin hồ
 * sơ? Hãy liên hệ Admin" — tức là bảo Admin đi liên hệ chính mình. Không màn
 * hình nào sửa được hồ sơ Admin: UC-18 lọc `role = 'SALES'`.
 */
test.describe('DEC-063 — Admin tự sửa hồ sơ', () => {
  test('sửa họ tên, SĐT và mã NV rồi thấy đổi thật sau khi tải lại', async ({ page }) => {
    await page.goto('/admin/account');

    const newName = 'E2E Quản Trị Đã Đổi';
    const newPhone = '0987654321';
    const newCode = 'E2E-ADM';

    await fillField(page, 'full_name', newName);
    await fillField(page, 'phone', newPhone);
    await fillField(page, 'employee_code', newCode);
    await page.getByRole('button', { name: /Lưu hồ sơ/ }).click();

    await expect(visibleText(page, /Đã cập nhật hồ sơ/)).toBeVisible({ timeout: 20_000 });

    // Tải lại: chứng minh dữ liệu nằm trong database chứ không phải chỉ trong
    // state của form — đúng bài học DEC-034.
    await page.reload();
    await expect(page.getByLabel('Họ và tên')).toHaveValue(newName);
    await expect(page.getByLabel('Số điện thoại')).toHaveValue(newPhone);
    await expect(page.getByLabel('Mã nhân viên')).toHaveValue(newCode);

    // Tên trên header thuộc LAYOUT, không thuộc page. Không `revalidatePath`
    // đúng chỗ thì chỗ này còn tên cũ — một lỗi rất dễ lọt vì trang thì đúng.
    await expect(visibleText(page, newName).first()).toBeVisible();
  });

  test('email và vai trò KHÔNG có ô nhập nào', async ({ page }) => {
    await page.goto('/admin/account');

    // Chúng hiển thị dạng `<dl>` chứ không phải `<input disabled>` — một ô nhập
    // mờ đi đọc ra "tạm thời chưa sửa được", còn sự thật là không bao giờ sửa
    // được ở đây (trigger `guard_profile_self_update()` chặn ở database).
    await expect(page.locator('input[name="email"]')).toHaveCount(0);
    await expect(page.locator('input[name="role"]')).toHaveCount(0);
    await expect(page.locator('input[name="is_active"]')).toHaveCount(0);
  });

  test('số điện thoại sai định dạng bị chặn ngay tại ô nhập', async ({ page }) => {
    await page.goto('/admin/account');

    await fillField(page, 'phone', '090-abc-123');
    await page.getByRole('button', { name: /Lưu hồ sơ/ }).click();

    await expect(visibleText(page, /Số điện thoại chỉ gồm chữ số/)).toBeVisible({
      timeout: 20_000,
    });
  });
});
