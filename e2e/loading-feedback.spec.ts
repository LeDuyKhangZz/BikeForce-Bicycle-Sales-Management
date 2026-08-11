import { expect, test, type Page, type Route } from '@playwright/test';

import { E2E_ADMIN_EMAIL } from './accounts';
import { E2E_PASSWORD } from './env';
import { signIn, waitForContent } from './helpers';

type RequestGate = {
  wait: Promise<void>;
  release: () => void;
};

function createRequestGate(): RequestGate {
  let release = () => {};
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });

  return { wait, release };
}

function isPrefetch(route: Route): boolean {
  const headers = route.request().headers();
  return headers['next-router-prefetch'] === '1' || headers.purpose === 'prefetch';
}

async function signInWithVisiblePendingState(page: Page): Promise<void> {
  const loginGate = createRequestGate();

  await page.route('**/login', async (route) => {
    if (route.request().method() === 'POST') {
      await loginGate.wait;
      await route.continue();
      return;
    }

    await route.continue();
  });

  await page.goto('/login');
  await page.locator('input[name="email"]').fill(E2E_ADMIN_EMAIL);
  await page.locator('input[name="password"]').fill(E2E_PASSWORD);

  const submit = page.locator('form button[type="submit"]');
  const click = submit.click({ noWaitAfter: true });

  try {
    const pendingSubmit = page.locator('form button[aria-busy="true"]');
    await expect(pendingSubmit).toContainText('Đang đăng nhập…');
    await expect(pendingSubmit.locator('[data-loading-spinner="true"]')).toBeVisible();
  } finally {
    loginGate.release();
  }

  await click;
  await expect(page).not.toHaveURL(/\/login/, { timeout: 45_000 });
  await waitForContent(page);
}

test.describe('Hệ phản hồi loading thống nhất', () => {
  test('đăng nhập, chuyển module và route chờ dữ liệu đều có phản hồi', async ({ page }) => {
    const reportsGate = createRequestGate();

    await page.route('**/admin/reports**', async (route) => {
      // Không cho lượt prefetch làm bài kiểm vô nghĩa; điều hướng thật vẫn được
      // giữ chậm đúng một khoảng đủ để người dùng nhìn thấy phản hồi.
      if (isPrefetch(route)) {
        await route.abort();
        return;
      }

      await reportsGate.wait;
      await route.continue();
    });

    await signInWithVisiblePendingState(page);

    const reportsLink = page.locator('nav a[href="/admin/reports"]').filter({ visible: true });
    const click = reportsLink.click({ noWaitAfter: true });

    try {
      await expect(reportsLink.locator('[data-link-loading="true"]')).toBeVisible();
    } finally {
      reportsGate.release();
    }

    await click;
    await expect(page).toHaveURL(/\/admin\/reports/, { timeout: 20_000 });
    await waitForContent(page);
  });

  test('lọc báo cáo khóa nút và nói đúng việc đang làm', async ({ page }) => {
    await signIn(page, E2E_ADMIN_EMAIL);
    await page.goto('/admin/reports');
    await waitForContent(page);

    const filterGate = createRequestGate();
    await page.route('**/admin/reports?**', async (route) => {
      await filterGate.wait;
      await route.continue();
    });
    await page.locator('input[name="q"]').fill('Khang');

    const submit = page.locator('form button[type="submit"]');
    const click = submit.click({ noWaitAfter: true });

    const pendingSubmit = page.locator('form button[aria-busy="true"]');
    try {
      await expect(pendingSubmit).toBeDisabled();
      await expect(pendingSubmit).toContainText('Đang lọc báo cáo…');
      await expect(pendingSubmit.locator('[data-loading-spinner="true"]')).toBeVisible();
    } finally {
      filterGate.release();
    }

    await click;
    await expect(page).toHaveURL(/q=Khang/, { timeout: 20_000 });
    await waitForContent(page);
  });
});
