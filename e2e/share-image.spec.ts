import { expect, test } from '@playwright/test';

import { E2E_DONE_SALES_EMAIL } from './accounts';
import { signIn } from './helpers';

/**
 * E2E — **BẤM THẬT** vào nút xuất ảnh (DEC-060).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO BỘ NÀY RA ĐỜI MUỘN, VÀ CÁI GIÁ ĐÃ TRẢ
 * ─────────────────────────────────────────────────────────────────────────
 *  Tới hết PHASE 14, bộ E2E chỉ kiểm nút **có hiện** không (`toBeVisible`), còn
 *  ảnh thì gọi thẳng route bằng `page.request.get()`. Không bài nào **bấm** nút,
 *  nên toàn bộ `handleExport()` phía client chưa từng chạy một lần trong CI.
 *
 *  Người dùng phát hiện ra hai lỗi mà lẽ ra bộ test phải bắt:
 *    1. Trên điện thoại bấm nút **không có gì xảy ra** — `<a download>` bị webview
 *       bỏ qua, mà `click()` thì không ném lỗi nên nhánh dự phòng không chạy.
 *    2. Trên máy tính hiện **share sheet của Windows**, nơi không có Zalo.
 *
 *  Bài học: `toBeVisible()` trên một nút chỉ chứng minh nút tồn tại. Nó **không**
 *  chứng minh nút làm được việc. Với mọi nút gọi Web API của trình duyệt
 *  (`navigator.share`, `download`, clipboard, camera…), phải có một bài bấm thật.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO PHẢI GIẢ LẬP `navigator.share`
 * ─────────────────────────────────────────────────────────────────────────
 *  Web Share API mở một hộp thoại **của hệ điều hành**. Playwright không điều
 *  khiển được nó, và trên máy CI nó có thể treo. Ta không kiểm bản thân Web Share
 *  API — đó là việc của trình duyệt — mà kiểm **quyết định rẽ nhánh của mình**:
 *  gọi share ở đâu, tải về ở đâu. Vì vậy `navigator.share` được thay bằng một
 *  hàm ghi lại lời gọi.
 */

/** Nút xuất ảnh của một báo cáo đã hoàn tất (bản KẾT QUẢ — DEC-058). */
const EXPORT_BUTTON = 'Xuất ảnh báo cáo';

type ShareProbe = {
  called: boolean;
  title: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number;
};

declare global {
  interface Window {
    __shareProbe?: ShareProbe;
  }
}

/**
 * Cài `navigator.share` giả **trước khi** trang chạy script nào.
 *
 * `supported = false` mô phỏng đúng máy tính không có share sheet dùng được, để
 * kiểm nhánh tải về trên mọi project.
 */
async function stubWebShare(
  page: import('@playwright/test').Page,
  { supported }: { supported: boolean },
) {
  await page.addInitScript((isSupported: boolean) => {
    window.__shareProbe = {
      called: false,
      title: null,
      fileName: null,
      fileType: null,
      fileSize: 0,
    };

    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
      share?: (data?: ShareData) => Promise<void>;
    };

    Object.defineProperty(nav, 'canShare', {
      configurable: true,
      value: () => isSupported,
    });

    Object.defineProperty(nav, 'share', {
      configurable: true,
      value: (data?: ShareData) => {
        const file = data?.files?.[0];
        window.__shareProbe = {
          called: true,
          title: data?.title ?? null,
          fileName: file?.name ?? null,
          fileType: file?.type ?? null,
          fileSize: file?.size ?? 0,
        };
        return Promise.resolve();
      },
    });
  }, supported);
}

test.describe('UC-08 / FR-020 — nút xuất ảnh phải THỰC SỰ làm được việc', () => {
  test('bấm nút → tải về một file PNG có đúng tên FR-019', async ({ page }, testInfo) => {
    // Không có share sheet dùng được ⇒ mọi project đều đi đường tải về.
    await stubWebShare(page, { supported: false });
    await signIn(page, E2E_DONE_SALES_EMAIL);

    const button = page.getByRole('button', { name: EXPORT_BUTTON });
    await expect(button).toBeVisible();

    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
    await button.click();
    const download = await downloadPromise;

    // FR-019 — tên file đã bỏ dấu, có ngày, đuôi .png. `BikeForce_Report_` là
    // biến thể KẾT QUẢ; bản sáng dùng `BikeForce_CamKet_` (DEC-058).
    expect(download.suggestedFilename()).toMatch(/^BikeForce_Report_.+_\d{4}-\d{2}-\d{2}\.png$/);

    /*
     * Máy tính đi đường blob nên hiện được dòng xác nhận. Thiết bị cảm ứng đi
     * đường ĐIỀU HƯỚNG THẬT (`location.href`) — ở đó chính trình duyệt hiện
     * giao diện tải của nó, và trang đã rời đi nên không còn chỗ cho dòng chữ.
     * Cả hai đều thoả nguyên tắc (b) của DEC-060: không nhánh nào im lặng.
     */
    if (testInfo.project.name === 'desktop-1440') {
      await expect(page.getByText('Đã tải ảnh về máy')).toBeVisible();
    }
  });

  test('KHÔNG bao giờ dùng share sheet trên máy tính có chuột', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop-1440',
      'Bài này nói về `pointer: fine` — chỉ có nghĩa trên project máy tính.',
    );

    // Share sheet CÓ sẵn và CÓ nhận file — đúng tình huống Chrome trên Windows.
    // Người dùng đã báo: nó mở ra một bảng chia sẻ không hề có Zalo.
    await stubWebShare(page, { supported: true });
    await signIn(page, E2E_DONE_SALES_EMAIL);

    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
    await page.getByRole('button', { name: EXPORT_BUTTON }).click();
    await downloadPromise;

    const probe = await page.evaluate(() => window.__shareProbe);
    expect(probe?.called, 'máy tính phải tải thẳng file, KHÔNG mở share sheet').toBe(false);
  });

  test('thiết bị cảm ứng thì gửi thẳng file PNG vào share sheet', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === 'desktop-1440',
      'Bài này nói về `pointer: coarse` — chỉ có nghĩa trên project cảm ứng.',
    );

    await stubWebShare(page, { supported: true });
    await signIn(page, E2E_DONE_SALES_EMAIL);

    await page.getByRole('button', { name: EXPORT_BUTTON }).click();

    await expect
      .poll(async () => (await page.evaluate(() => window.__shareProbe))?.called, {
        timeout: 60_000,
      })
      .toBe(true);

    const probe = await page.evaluate(() => window.__shareProbe);

    expect(probe?.fileType).toBe('image/png');
    expect(probe?.fileName).toMatch(/^BikeForce_Report_.+\.png$/);
    // File rỗng nghĩa là blob hỏng — share sheet vẫn mở nhưng Zalo nhận ảnh lỗi.
    expect(probe?.fileSize ?? 0).toBeGreaterThan(1000);
  });

  test('luôn có lối lấy ảnh KHÔNG cần JavaScript', async ({ page }) => {
    await signIn(page, E2E_DONE_SALES_EMAIL);

    // Nguyên tắc (c) của DEC-060: nếu webview chặn hết automation (ISSUE-003 —
    // trình duyệt trong Zalo), đây vẫn là một đường lấy ảnh chạy được.
    const link = page.getByRole('link', { name: 'Mở ảnh trực tiếp' });

    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /\/api\/reports\/[0-9a-f-]{36}\/share-image$/);
  });
});
