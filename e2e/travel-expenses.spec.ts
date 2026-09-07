import { expect, test } from '@playwright/test';

import { E2E_ADMIN_EMAIL, E2E_DONE_SALES_EMAIL } from './accounts';
import { expectNoHorizontalScroll, signIn } from './helpers';

const PAGE_PATH = '/admin/travel-expenses?month=2032-05';

test.describe('Admin nhập công tác phí theo tháng', () => {
  test('nút Công tác phí nằm trong sidebar trái desktop và không chen vào bottom nav mobile', async ({
    page,
  }) => {
    await signIn(page, E2E_ADMIN_EMAIL);
    await page.goto(PAGE_PATH);

    const link = page.getByRole('link', { name: 'Công tác phí', exact: true });
    const viewportWidth = page.viewportSize()?.width ?? 0;
    if (viewportWidth >= 1024) {
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('aria-current', 'page');
      const box = await link.boundingBox();
      expect(box?.x ?? Number.POSITIVE_INFINITY).toBeLessThan(224);
    } else {
      await expect(link).toBeHidden();
    }
  });

  test('lưu rồi tải lại vẫn giữ đúng số tiền', async ({ page }) => {
    await signIn(page, E2E_ADMIN_EMAIL);
    await page.goto(PAGE_PATH);

    await expect(page.getByRole('heading', { level: 1, name: 'Công tác phí' })).toBeVisible();
    const employeeCards = page.locator('form > ul > li');
    if ((await employeeCards.count()) >= 2) {
      const firstBox = await employeeCards.nth(0).boundingBox();
      const secondBox = await employeeCards.nth(1).boundingBox();
      expect(secondBox?.y ?? 0).toBeGreaterThan(firstBox?.y ?? Number.POSITIVE_INFINITY);
    }
    const firstAmount = page.locator('input[name^="amount__"]').first();
    await firstAmount.fill('3500000');
    await page.getByRole('button', { name: /Lưu công tác phí/ }).click();
    await expect(page.getByText('Đã lưu công tác phí tháng.')).toBeVisible({ timeout: 30_000 });

    await page.reload();
    await expect(page.locator('input[name^="amount__"]').first()).toHaveValue('3.500.000');
    await expectNoHorizontalScroll(page);
  });

  test('Sales không mở được màn hình Công tác phí', async ({ page }) => {
    await signIn(page, E2E_DONE_SALES_EMAIL);
    await page.goto(PAGE_PATH);
    await expect(page).not.toHaveURL(/\/admin\/travel-expenses/);
  });
});
