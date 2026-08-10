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

/**
 * Ngưỡng chờ đăng nhập — **45 giây**, nâng từ 20 ở PHASE 13.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO NÂNG, VÀ VÌ SAO ĐÂY KHÔNG PHẢI "GIẤU LỖI ĐI"
 * ─────────────────────────────────────────────────────────────────────────
 *  Chi phí thật của đường đăng nhập đã được đo và ghi thành **ISSUE-021**:
 *  `signInAction` kết thúc bằng `redirect()`, nên Next render **trang đích ngay
 *  trong cùng request POST**, và trang đó gọi `getCurrentProfile()` hai lần
 *  (layout + page) × hai lượt đi-về mỗi lần = **bốn lượt tuần tự** trước khi
 *  Server Action trả về. Nút vì vậy còn ghi "Đang đăng nhập…" suốt quãng đó.
 *
 *  20 giây được chọn khi bộ E2E còn 99 bài. Bộ này nay **123 bài trên 3 project**
 *  chạy tuần tự trên cùng một máy và cùng một Supabase local — tức nền tải nặng
 *  hơn hẳn. Với ngưỡng cũ, **những bài đỏ đều là bài KHÁC nhau ở mỗi lượt** và
 *  ảnh chụp luôn cho thấy form kẹt ở "Đang đăng nhập…" — dấu hiệu của **chậm**,
 *  không phải của **sai**.
 *
 *  Nâng ngưỡng là làm cho phép đo khớp với chi phí đã biết. Nó **không** che
 *  được lỗi thật: một Server Action treo hẳn (như ca `cache()` của ISSUE-021)
 *  vẫn không bao giờ trả về, nên bài test vẫn đỏ — chỉ muộn hơn 25 giây.
 *
 *  ⚠ Nếu một ngày cần nâng tiếp, **đừng nâng** — hãy sửa ISSUE-021 thay vì nới
 *  thêm. Ngưỡng này là chỗ chi phí đó lộ ra.
 */
const SIGN_IN_TIMEOUT_MS = 45_000;

export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  // Đăng nhập thành công ⇒ rời khỏi /login. Chờ chính điều đó, không chờ mạng.
  await expect(page).not.toHaveURL(/\/login/, { timeout: SIGN_IN_TIMEOUT_MS });
}

export async function signOut(page: Page): Promise<void> {
  await page.goto('/sales/account');
  await page.getByRole('button', { name: /Đăng xuất/ }).click();
  await expect(page).toHaveURL(/\/login/);
}

/**
 * Chờ khung `loading.tsx` biến mất, tức nội dung THẬT đã render xong.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO CẦN HÀM NÀY — một bài test đã đỏ oan vì thiếu nó
 * ─────────────────────────────────────────────────────────────────────────
 *  `page.goto()` trả về khi điều hướng hoàn tất, nhưng mọi route group đều có
 *  `loading.tsx` nên Next **stream phần vỏ ra trước**. Đọc `innerText('body')`
 *  ngay sau `goto()` là đọc trúng khung skeleton.
 *
 *  Hỏng theo HAI chiều, và chiều thứ hai nguy hiểm hơn:
 *    • đỏ oan — bài kiểm chuỗi "Không tìm thấy" bắt được "Đang tải…" khi máy
 *      bận (đã xảy ra thật ngày 2026-08-10);
 *    • **xanh oan** — `expectNoBrokenNumbers()` đọc trúng skeleton thì đương
 *      nhiên không thấy `NaN` nào, và bài test "đạt" mà chưa kiểm gì cả.
 *
 *  Mốc chờ là `aria-busy="true"` — thuộc tính mà **cả hai** `loading.tsx` đều
 *  đặt, và nó là ngữ nghĩa a11y thật chứ không phải class CSS có thể đổi.
 */
export async function waitForContent(page: Page): Promise<void> {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 });
}

/**
 * Không màn hình nào được để lọt `NaN` / `Infinity` / `undefined` ra chữ hiển
 * thị — BR-015 và DEC-025 đều nói cùng một điều, và đây là lưới an toàn cuối.
 */
export async function expectNoBrokenNumbers(page: Page): Promise<void> {
  // Bắt buộc: đọc trúng skeleton thì bài này "đạt" mà chưa kiểm gì.
  await waitForContent(page);

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
