import { expect, test } from '@playwright/test';

import { E2E_ADMIN_EMAIL, E2E_DONE_SALES_EMAIL, E2E_DONE_SALES_NAME } from './accounts';
import { expectNoBrokenNumbers, expectNoHorizontalScroll, signIn } from './helpers';

/**
 * E2E — CHỈ TIÊU THÁNG (`/admin/targets`, DEC-071).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO PHẢI CÓ BÀI BẤM THẬT Ở ĐÂY
 * ─────────────────────────────────────────────────────────────────────────
 *  Nút "chép chỉ tiêu tháng trước" chạy **hoàn toàn ở client**: nó chỉ đổ state
 *  vào các ô, không gọi Server Action nào. Unit test không thấy nó, và
 *  `toBeVisible()` cũng không — đúng loại nút mà ISSUE-027 đã dạy là phải **bấm
 *  thật** rồi đọc lại giá trị ô.
 *
 *  Mỗi lượt chạy dùng một tháng **rất xa** (`TEST_MONTH`) để không đụng vào dữ
 *  liệu tháng thật của fixture, và để hai lượt chạy liên tiếp vẫn thấy đúng số
 *  mình vừa ghi.
 */

/** Tháng thử — xa mọi tháng có báo cáo trong fixture. */
const TEST_MONTH = '2031-03';
const PREVIOUS_MONTH = '2031-02';

const TARGETS_PATH = `/admin/targets?month=${TEST_MONTH}`;

/** Ô của một Sales trong form. Tên field mang `sales_id` nên phải tra qua DOM. */
async function cellsOfFirstSales(page: import('@playwright/test').Page) {
  const salesAmount = page.locator('input[name^="target_sales_amount__"]').first();
  const revenue = page.locator('input[name^="target_revenue__"]').first();

  await expect(salesAmount).toBeVisible();
  await expect(revenue).toBeVisible();

  return { salesAmount, revenue };
}

test.describe('DEC-071 — Admin giao chỉ tiêu tháng', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, E2E_ADMIN_EMAIL);
  });

  test('vào được từ nút trên /admin/sales, không cần tab riêng ở nav', async ({ page }) => {
    await page.goto('/admin/sales');

    await page.getByRole('link', { name: /Chỉ tiêu tháng/ }).click();

    await expect(page).toHaveURL(/\/admin\/targets/);
    await expect(page.getByRole('heading', { level: 1, name: 'Chỉ tiêu tháng' })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('lưu chỉ tiêu rồi tải lại trang thì số vẫn còn', async ({ page }) => {
    await page.goto(TARGETS_PATH);

    const { salesAmount, revenue } = await cellsOfFirstSales(page);

    await salesAmount.fill('800000000');
    await revenue.fill('640000000');
    await page.getByRole('button', { name: /Lưu chỉ tiêu/ }).click();

    await expect(page.getByText('Đã lưu chỉ tiêu tháng.')).toBeVisible({ timeout: 30_000 });

    // Tải lại: giá trị phải đến từ DATABASE chứ không phải state còn sót.
    await page.reload();

    const reloaded = await cellsOfFirstSales(page);
    await expect(reloaded.salesAmount).toHaveValue('800.000.000');
    await expect(reloaded.revenue).toHaveValue('640.000.000');

    await expectNoBrokenNumbers(page);
    await expectNoHorizontalScroll(page);
  });

  test('nút "chép chỉ tiêu tháng trước" ĐIỀN ô nhưng KHÔNG tự lưu', async ({ page }) => {
    // 1) Đặt số cho tháng trước.
    await page.goto(`/admin/targets?month=${PREVIOUS_MONTH}`);

    const previous = await cellsOfFirstSales(page);
    await previous.salesAmount.fill('123000000');
    await previous.revenue.fill('456000000');
    await page.getByRole('button', { name: /Lưu chỉ tiêu/ }).click();
    await expect(page.getByText('Đã lưu chỉ tiêu tháng.')).toBeVisible({ timeout: 30_000 });

    // 2) Sang tháng sau và bấm chép.
    await page.goto(TARGETS_PATH);

    const target = await cellsOfFirstSales(page);
    await target.salesAmount.fill('');
    await target.revenue.fill('');

    await page.getByRole('button', { name: /Chép chỉ tiêu/ }).click();

    await expect(target.salesAmount).toHaveValue('123.000.000');
    await expect(target.revenue).toHaveValue('456.000.000');

    // 3) ⚠ Điểm mấu chốt: CHƯA bấm Lưu ⇒ database chưa được đụng tới. Tải lại
    //    thì hai ô phải trở về đúng thứ đang có trong database.
    await page.reload();

    const afterReload = await cellsOfFirstSales(page);
    await expect(afterReload.salesAmount).not.toHaveValue('123.000.000');
  });

  test('ô để trống là hợp lệ — nghĩa là CHƯA GIAO, không phải 0', async ({ page }) => {
    await page.goto(TARGETS_PATH);

    const { salesAmount } = await cellsOfFirstSales(page);
    await expect(salesAmount).toHaveAttribute('placeholder', 'Chưa giao');

    await salesAmount.fill('');
    await page.getByRole('button', { name: /Lưu chỉ tiêu/ }).click();

    await expect(page.getByText('Đã lưu chỉ tiêu tháng.')).toBeVisible({ timeout: 30_000 });
  });

  test('số sai bị chặn ở server và báo ngay tại ô', async ({ page }) => {
    await page.goto(TARGETS_PATH);

    const { salesAmount } = await cellsOfFirstSales(page);
    await salesAmount.fill('không phải số');
    await page.getByRole('button', { name: /Lưu chỉ tiêu/ }).click();

    await expect(page.getByText(/Chỉ nhập số tiền/)).toBeVisible({ timeout: 30_000 });
    // Chuỗi rác giữ NGUYÊN để người dùng thấy đúng thứ mình đã gõ.
    await expect(salesAmount).toHaveValue('không phải số');
  });

  test('BR-003 — Sales KHÔNG mở được màn hình chỉ tiêu', async ({ page, context }) => {
    await context.clearCookies();
    await signIn(page, E2E_DONE_SALES_EMAIL);

    await page.goto(TARGETS_PATH);

    // `requireRole('ADMIN')` đá về khu vực của Sales, không hiện form.
    await expect(page).not.toHaveURL(/\/admin\/targets/);
    await expect(page.getByRole('heading', { level: 1, name: 'Chỉ tiêu tháng' })).toHaveCount(0);
  });
});

test.describe('DEC-071 — chỉ tiêu tháng hiện đúng người', () => {
  test('mỗi Sales có một thẻ riêng, tên hiện đầy đủ', async ({ page }) => {
    await signIn(page, E2E_ADMIN_EMAIL);
    await page.goto(TARGETS_PATH);

    await expect(page.getByText(E2E_DONE_SALES_NAME).first()).toBeVisible();
  });
});
