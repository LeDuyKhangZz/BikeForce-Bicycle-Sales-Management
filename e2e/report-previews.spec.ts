import { expect, test } from '@playwright/test';

import { E2E_ADMIN_EMAIL } from './accounts';
import { expectNoHorizontalScroll, signIn } from './helpers';

test('Admin mở và đóng ảnh báo cáo toàn màn hình', async ({ page }) => {
  await signIn(page, E2E_ADMIN_EMAIL);
  await page.goto('/admin/report-previews');

  const previewLink = page.getByRole('link', { name: /Xem trước báo cáo đầu ngày/ }).first();
  await expect(previewLink).toBeVisible();
  await previewLink.click();

  const openButton = page.getByRole('button', { name: 'Xem toàn màn hình' });
  await expect(openButton).toBeVisible();
  await openButton.click();

  const dialog = page.getByRole('dialog', { name: 'Xem báo cáo toàn màn hình' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đóng' })).toBeFocused();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await expectNoHorizontalScroll(page);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(openButton).toBeFocused();
});
