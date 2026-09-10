import { expect, test } from '@playwright/test';

import { E2E_ADMIN_EMAIL, E2E_DONE_SALES_EMAIL } from './accounts';
import { expectNoHorizontalScroll, signIn } from './helpers';

const PAGE_PATH = '/admin/salaries?month=2032-07';

test.describe('Admin nhập lương theo tháng', () => {
  test('nút Lương nằm ngay dưới Công tác phí trong sidebar desktop', async ({ page }) => {
    await signIn(page, E2E_ADMIN_EMAIL);
    await page.goto(PAGE_PATH);

    const salaryLink = page.getByRole('link', { name: 'Lương', exact: true });
    const viewportWidth = page.viewportSize()?.width ?? 0;
    if (viewportWidth >= 1024) {
      const travelLink = page.getByRole('link', { name: 'Công tác phí', exact: true });
      await expect(salaryLink).toBeVisible();
      await expect(salaryLink).toHaveAttribute('aria-current', 'page');
      const travelBox = await travelLink.boundingBox();
      const salaryBox = await salaryLink.boundingBox();
      expect(salaryBox?.y ?? 0).toBeGreaterThan(travelBox?.y ?? Number.POSITIVE_INFINITY);
    } else {
      await expect(salaryLink).toBeHidden();
    }
  });

  test('lưu rồi tải lại vẫn giữ đúng lương', async ({ page }) => {
    await signIn(page, E2E_ADMIN_EMAIL);
    await page.goto(PAGE_PATH);

    await expect(page.getByRole('heading', { level: 1, name: 'Lương' })).toBeVisible();
    const firstAmount = page.locator('input[name^="amount__"]').first();
    await firstAmount.fill('15000000');
    await page.getByRole('button', { name: /Lưu lương/ }).click();
    await expect(page.getByText('Đã lưu lương tháng.')).toBeVisible({ timeout: 30_000 });

    await page.reload();
    await expect(page.locator('input[name^="amount__"]').first()).toHaveValue('15.000.000');
    await expectNoHorizontalScroll(page);
  });

  test('Sales không mở được màn hình Lương', async ({ page }) => {
    await signIn(page, E2E_DONE_SALES_EMAIL);
    await page.goto(PAGE_PATH);
    await expect(page).not.toHaveURL(/\/admin\/salaries/);
  });
});
