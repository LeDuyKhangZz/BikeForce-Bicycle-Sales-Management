import { expect, test } from '@playwright/test';

import { E2E_ADMIN_EMAIL, E2E_DONE_SALES_EMAIL } from './accounts';
import { expectNoHorizontalScroll, signIn } from './helpers';

const PAGE_PATH = '/admin/monthly-summaries?month=2026-08';

test.describe('Tổng kết tháng', () => {
  test('Admin xem danh sách ưu tiên người đang làm việc và mở ảnh xem trước', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(globalThis, 'ClipboardItem', {
        configurable: true,
        value: class ClipboardItemMock {
          constructor(_items: Record<string, Blob | Promise<Blob>>) {}
        },
      });
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { write: async () => undefined },
      });
    });
    await page.route('**/api/admin/monthly-summaries/*/image?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64',
        ),
      });
    });
    await signIn(page, E2E_ADMIN_EMAIL);
    await page.goto(PAGE_PATH);

    await expect(page.getByRole('heading', { level: 1, name: 'Tổng kết tháng' })).toBeVisible();
    const rows = page.getByRole('list', { name: 'Danh sách nhân viên' }).getByRole('listitem');
    await expect(rows.first().getByText('Đang làm việc')).toBeVisible();

    const accounting = rows.filter({ hasText: 'Abraham Kế Toán Bánhàng' });
    await expect(accounting).toHaveCount(1);
    await accounting.getByRole('link', { name: 'Xem trước tổng kết tháng của Abraham Kế Toán Bánhàng' }).click();
    await expect(page).toHaveURL(/sales=salework-accounting-sales/);
    await expect(page.getByRole('img', { name: 'Tổng kết tháng của Abraham Kế Toán Bánhàng' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.goto(PAGE_PATH);

    await rows.first().getByRole('link', { name: /Xem trước tổng kết tháng/ }).click();
    await expect(page).toHaveURL(/month=2026-08&sales=/);
    await expect(page.getByRole('button', { name: 'Xem toàn màn hình' })).toBeVisible();
    await page.getByRole('button', { name: 'Sao chép hình ảnh' }).click();
    await expect(page.getByRole('button', { name: 'Đã sao chép hình ảnh' })).toBeVisible();
    await expect(page.getByRole('img', { name: /Tổng kết tháng của/ })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('Admin gửi yêu cầu đồng bộ đúng tháng từ nút riêng', async ({ page }) => {
    await signIn(page, E2E_ADMIN_EMAIL);
    await page.goto(PAGE_PATH);
    await page.getByRole('button', { name: 'Đồng bộ dữ liệu tháng' }).click();
    await expect(page.getByText(/Đã gửi yêu cầu đồng bộ tháng|đã có một lượt đồng bộ/)).toBeVisible();
  });

  test('Sales không mở được màn hình tổng kết tháng', async ({ page }) => {
    await signIn(page, E2E_DONE_SALES_EMAIL);
    await page.goto(PAGE_PATH);
    await expect(page).not.toHaveURL(/\/admin\/monthly-summaries/);
  });
});
