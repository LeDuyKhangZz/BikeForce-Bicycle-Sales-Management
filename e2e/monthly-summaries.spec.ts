import { expect, test } from '@playwright/test';

import { E2E_ADMIN_EMAIL, E2E_DONE_SALES_EMAIL } from './accounts';
import { expectNoHorizontalScroll, signIn } from './helpers';

const PAGE_PATH = '/admin/monthly-summaries?month=2026-08';

test.describe('Tổng kết tháng', () => {
  test('Admin xem danh sách ưu tiên người đang làm việc và mở ảnh xem trước', async ({ page }) => {
    await signIn(page, E2E_ADMIN_EMAIL);
    await page.goto(PAGE_PATH);

    await expect(page.getByRole('heading', { level: 1, name: 'Tổng kết tháng' })).toBeVisible();
    const rows = page.getByRole('list', { name: 'Danh sách nhân viên' }).getByRole('listitem');
    await expect(rows.first().getByText('Đang làm việc')).toBeVisible();

    await rows.first().getByRole('link', { name: /Xem trước tổng kết tháng/ }).click();
    await expect(page).toHaveURL(/month=2026-08&sales=/);
    await expect(page.getByRole('button', { name: 'Xem toàn màn hình' })).toBeVisible();
    await expect(page.getByRole('img', { name: /Tổng kết tháng của/ })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('Sales không mở được màn hình tổng kết tháng', async ({ page }) => {
    await signIn(page, E2E_DONE_SALES_EMAIL);
    await page.goto(PAGE_PATH);
    await expect(page).not.toHaveURL(/\/admin\/monthly-summaries/);
  });
});
