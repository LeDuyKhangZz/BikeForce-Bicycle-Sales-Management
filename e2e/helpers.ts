import { expect, type Locator, type Page } from '@playwright/test';

import { E2E_PASSWORD } from './env';

/**
 * Tiện ích dùng chung của bộ E2E.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  HAI BÀI HỌC ĐÃ TRẢ GIÁ, ĐƯỢC MÃ HOÁ THÀNH CODE Ở ĐÂY
 * ─────────────────────────────────────────────────────────────────────────
 *  1. **Chờ PHẦN TỬ THẬT, không chờ mạng.** `waitForLoadState('networkidle')`
 *     bắn *trước khi* React render xong và đã gây một vòng chẩn đoán sai ở
 *     Phase 5 (27/36 FAIL trong khi code hoàn toàn đúng). Mọi hàm dưới đây kết
 *     thúc bằng một `expect(locator)` cụ thể.
 *  2. **Không đọc chuỗi cấm bằng `textContent('body')`** — nó gộp cả RSC flight
 *     payload của Next, mà payload đó **luôn** chứa `$undefined`. Dùng
 *     `innerText`, và `expectNoBrokenNumbers()` dưới đây làm đúng vậy.
 */

export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  // Đăng nhập thành công ⇒ rời khỏi /login. Chờ chính điều đó, không chờ mạng.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}

export async function signOut(page: Page): Promise<void> {
  await page.goto('/sales/account');
  await page.getByRole('button', { name: /Đăng xuất/ }).click();
  await expect(page).toHaveURL(/\/login/);
}

/**
 * Không màn hình nào được để lọt `NaN` / `Infinity` / `undefined` ra chữ hiển
 * thị — BR-015 và DEC-025 đều nói cùng một điều, và đây là lưới an toàn cuối.
 */
export async function expectNoBrokenNumbers(page: Page): Promise<void> {
  const text = await page.innerText('body');

  for (const forbidden of ['NaN', 'Infinity', '∞', 'undefined', '[object Object]']) {
    expect(text, `Trang chứa chuỗi cấm "${forbidden}"`).not.toContain(forbidden);
  }
}

/**
 * NFR-003 — không màn hình nào được cuộn ngang ở bất kỳ bề rộng nào.
 *
 * So `scrollWidth` với `clientWidth` của `documentElement`. Cho phép lệch 1px:
 * làm tròn subpixel của trình duyệt ở tỉ lệ thu phóng lẻ có thể sinh ra 0,5px
 * mà mắt không thấy và ngón tay không cuộn được.
 */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });

  expect(overflow, 'Trang bị cuộn ngang').toBeLessThanOrEqual(1);
}

/** Điền một ô theo `name`, dùng cho mọi form của dự án (id trùng name). */
export async function fillField(page: Page, name: string, value: string): Promise<void> {
  await page.locator(`[name="${name}"]`).fill(value);
}

/**
 * Chuỗi chữ ĐANG HIỂN THỊ — bắt buộc dùng thay cho `getByText(...).first()`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO `.first()` LÀ CÁI BẪY CỦA CHÍNH DỰ ÁN NÀY
 * ─────────────────────────────────────────────────────────────────────────
 *  DEC-019 quy định mọi bảng đều render **hai nhánh cùng lúc trong DOM**: card
 *  cho `< 768px` (`md:hidden`) và `<table>` thật từ `768px` (`hidden md:table`).
 *  Nghĩa là mỗi con số xuất hiện **hai lần**, và ở 1440px thì bản card — bản
 *  đứng TRƯỚC trong DOM — chính là bản bị ẩn. `.first()` vì thế luôn bắt trúng
 *  phần tử ẩn và bài test đỏ ở đúng project `desktop-1440`, dù giao diện hoàn
 *  toàn đúng. Đã xảy ra thật, 4 bài cùng lúc.
 *
 *  `filter({ visible: true })` chọn theo thứ người dùng THẬT SỰ nhìn thấy, nên
 *  cùng một dòng assert chạy đúng ở cả ba project.
 */
export function visibleText(page: Page, text: string | RegExp): Locator {
  return page.getByText(text).filter({ visible: true }).first();
}
