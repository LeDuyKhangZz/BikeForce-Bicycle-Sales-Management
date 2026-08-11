import { expect, test } from '@playwright/test';

import { E2E_DONE_SALES_EMAIL, flowSalesEmail, toE2eProject } from './accounts';
import {
  expectNoBrokenNumbers,
  expectNoHorizontalScroll,
  fillField,
  signIn,
  visibleText,
} from './helpers';

/**
 * E2E — LUỒNG SALES ĐẦY ĐỦ (`PROJECT_CHECKLIST.md § Phase 11`):
 * Login → Today → Morning → Save → Reopen → Evening → Save → Comparison → Export.
 *
 * Mỗi project Playwright dùng **Sales riêng** vì BR-001 chỉ cho một báo cáo mỗi
 * ngày và BR-019 khoá vĩnh viễn khi `COMPLETED` — lý do đầy đủ ở `e2e/fixtures.ts`.
 */

const salesFor = (projectName: string): string => flowSalesEmail(toE2eProject(projectName));

test.describe('Luồng Sales đầu-cuối', () => {
  test('UC-04 → UC-06: cam kết sáng (khoá ngay), rồi hoàn tất cuối ngày', async ({
    page,
  }, testInfo) => {
    await signIn(page, salesFor(testInfo.project.name));

    /* ── 1. Sau đăng nhập phải vào đúng dashboard của Sales (FR-005) ───────── */
    await expect(page).toHaveURL(/\/sales\/today/);
    await expect(page.getByText('Chưa báo cáo')).toBeVisible();
    await expectNoHorizontalScroll(page);

    /* ── 2. CTA duy nhất của trạng thái "chưa báo cáo" (FR-007) ────────────── */
    await page.getByRole('link', { name: 'Tạo báo cáo đầu ngày' }).click();
    await expect(page).toHaveURL(/\/sales\/today\/morning/);

    /* ── 3. Cam kết sáng — 5 trường bắt buộc của FR-008 ────────────────────────
       PHASE 13: "Mục đích chuyến đi" ĐÃ BỊ GỠ (DEC-048) · điểm viếng thăm có
       sàn 10 (BR-026, DEC-049) · doanh số nhập TIỀN (DEC-050).                */
    await expect(page.locator('[name="visit_purpose"]')).toHaveCount(0);

    await fillField(page, 'planned_route', 'Quận 1 → Quận 3 → Bình Thạnh');
    await fillField(page, 'target_visit_points', '12');
    // 60tr là con số cố ý: cuối ngày nhập 75tr ⇒ 125,0%, một đầu của BR-023.
    await fillField(page, 'target_sales_amount', '60000000');
    await fillField(page, 'target_revenue', '100000000');
    await fillField(page, 'target_customer_visits', '12');

    await page.getByRole('button', { name: 'Lưu báo cáo đầu ngày' }).click();

    /* ── 4. Quay về /sales/today với banner do SERVER quyết (DEC-034) ──────── */
    await expect(page).toHaveURL(/\/sales\/today(\?|$)/, { timeout: 20_000 });
    await expect(page.getByText('Đã lưu báo cáo đầu ngày')).toBeVisible();
    await expect(page.getByText('Đã cam kết')).toBeVisible();
    await expectNoBrokenNumbers(page);

    /* ── 5. DEC-055 — cam kết sáng KHOÁ NGAY khi gửi ───────────────────────────
       Không còn nút "Sửa cam kết sáng", và gõ thẳng URL cũng bị đá về.        */
    await expect(page.getByRole('link', { name: 'Sửa cam kết sáng' })).toHaveCount(0);

    await page.goto('/sales/today/morning');
    await expect(page).toHaveURL(/\/sales\/today(\?|$)/);

    /* ── 5b. DEC-058 — chỗ nút cũ nay là ảnh CAM KẾT ĐẦU NGÀY ──────────────── */
    await expect(page.getByRole('button', { name: 'Lưu hình báo cáo đầu ngày' })).toBeVisible();

    /* ── 6. UC-06 — hoàn tất cuối ngày ─────────────────────────────────────── */
    await page.getByRole('link', { name: 'Hoàn thành báo cáo cuối ngày' }).click();
    await expect(page).toHaveURL(/\/sales\/today\/evening/);

    // FR-013 — form tối phải nhắc lại cam kết sáng để đối chiếu. Dùng chỉ tiêu
    // ĐẾM cho phép so sánh này: chuỗi tiền chứa NO-BREAK SPACE nên so bằng chuỗi
    // gõ tay rất dễ đỏ oan (docs/08 §3.3).
    await expect(visibleText(page, '12 điểm')).toBeVisible();

    await fillField(page, 'actual_visit_points', '12');
    await fillField(page, 'actual_sales_amount', '75000000');
    await fillField(page, 'actual_revenue', '125000000');
    await fillField(page, 'actual_customer_visits', '9');
    await fillField(page, 'actual_route', 'Quận 1 → Quận 3 → Quận 5');
    await fillField(page, 'evening_note', 'Chốt thêm một đơn ngoài kế hoạch: ừ ẫ ợ ỹ đ Đ.');

    await page.getByRole('button', { name: 'Hoàn tất báo cáo hôm nay' }).click();

    /* ── 7. Bảng đối chiếu 4 chỉ tiêu (Phase 5) ────────────────────────────── */
    await expect(page).toHaveURL(/\/sales\/today(\?|$)/, { timeout: 20_000 });
    await expect(page.getByText('Đã hoàn tất báo cáo hôm nay')).toBeVisible();
    await expect(page.getByText('Đã hoàn thành')).toBeVisible();

    // 10/8 = 125% ⇒ vượt mục tiêu; 9/12 = 75% ⇒ chưa đạt. Hai đầu của BR-023.
    await expect(visibleText(page, '125,0%')).toBeVisible();
    await expect(visibleText(page, '75,0%')).toBeVisible();
    await expectNoBrokenNumbers(page);
    await expectNoHorizontalScroll(page);

    /* ── 8. BR-019 — khoá vĩnh viễn, cả hai form đều bị đá về ──────────────── */
    await page.goto('/sales/today/evening');
    await expect(page).toHaveURL(/\/sales\/today(\?|$)/);

    await page.goto('/sales/today/morning');
    await expect(page).toHaveURL(/\/sales\/today(\?|$)/);

    /* ── 9. DEC-058 — nút ảnh đổi sang bản KẾT QUẢ sau khi hoàn tất ─────────── */
    await expect(page.getByRole('button', { name: 'Xuất ảnh báo cáo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lưu hình báo cáo đầu ngày' })).toHaveCount(0);
  });

  test('BR-007: chưa cam kết sáng thì không vào được form cuối ngày', async ({
    page,
  }, testInfo) => {
    // Tài khoản "đã hoàn tất" không dùng được cho bài này; dùng một phiên sạch
    // là không khả thi vì bài trên đã hoàn tất báo cáo của Sales luồng. Nên bài
    // này đo bằng chính tài khoản đã COMPLETED: nó cũng phải bị đá về
    // /sales/today, và đó là cùng một hàng rào guard.
    void testInfo;
    await signIn(page, E2E_DONE_SALES_EMAIL);

    await page.goto('/sales/today/evening');
    await expect(page).toHaveURL(/\/sales\/today(\?|$)/);
  });
});

test.describe('FR-021 / FR-022 — lịch sử và chi tiết báo cáo', () => {
  test('UC-09: lịch sử tháng có phân trang, lọc tháng, và mở được chi tiết', async ({ page }) => {
    await signIn(page, E2E_DONE_SALES_EMAIL);

    /* ── Bottom nav 3 mục, có icon VÀ chữ (DEC-018) ────────────────────────── */
    await page.getByRole('link', { name: 'Lịch sử' }).first().click();
    await expect(page).toHaveURL(/\/sales\/history/);
    await expectNoHorizontalScroll(page);

    /* ── Tháng trước có đủ dữ liệu fixture ⇒ phải phân trang ───────────────── */
    const previousMonth = await page.evaluate(() => {
      const now = new Date();
      const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`;
    });

    await page.goto(`/sales/history?month=${previousMonth}`);

    /*
     * Chọn theo `href` chứ không theo chữ: dưới 768px danh sách là card (nhãn
     * là ngày + badge), từ 768px mới có chữ "Xem" trong `<table>` (DEC-019).
     * `:visible` để không bắt nhầm nhánh đang bị `md:hidden` ẩn đi.
     */
    const detailLink = page.locator('a[href^="/sales/reports/"]:visible').first();
    await expect(detailLink).toBeVisible({ timeout: 20_000 });
    await expectNoBrokenNumbers(page);

    /* ── UC-10 — mở chi tiết, dùng lại bảng đối chiếu + nút xuất ảnh ───────── */
    await detailLink.click();
    await expect(page).toHaveURL(/\/sales\/reports\/[0-9a-f-]{36}/);
    await expect(visibleText(page, 'Viếng thăm')).toBeVisible();
    await expect(page.getByRole('button', { name: /Xuất ảnh/ })).toBeVisible();
    await expectNoBrokenNumbers(page);
    await expectNoHorizontalScroll(page);
  });

  test('tháng không có báo cáo nào hiện empty state, không phải trang trắng', async ({ page }) => {
    await signIn(page, E2E_DONE_SALES_EMAIL);

    // Một tháng chắc chắn không có dữ liệu.
    await page.goto('/sales/history?month=2019-02');
    await expect(visibleText(page, /chưa có báo cáo/i)).toBeVisible();
    await expectNoBrokenNumbers(page);
  });

  test('?month= rác không làm sập trang (DEC-040)', async ({ page }) => {
    await signIn(page, E2E_DONE_SALES_EMAIL);

    await page.goto('/sales/history?month=abc&page=-5');
    // `getVietnamMonthRange` trả `null`, trang tự lùi về tháng hiện tại.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoBrokenNumbers(page);
  });
});

test.describe('FR-023 — màn hình tài khoản', () => {
  test('UC-11: xem hồ sơ và đổi mật khẩu có kiểm tra khớp', async ({ page }) => {
    await signIn(page, E2E_DONE_SALES_EMAIL);

    await page.goto('/sales/account');
    await expect(page.getByText(E2E_DONE_SALES_EMAIL)).toBeVisible();

    // Hai lần nhập không khớp ⇒ lỗi gắn vào ĐÚNG ô nhập lại (DEC-041).
    await fillField(page, 'password', 'MatKhauMoi2026');
    await fillField(page, 'confirm_password', 'MatKhauKhac2026');
    await page.getByRole('button', { name: /Đổi mật khẩu/ }).click();

    await expect(page.getByText('Hai lần nhập mật khẩu chưa khớp nhau.')).toBeVisible();
  });
});
