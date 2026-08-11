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

/**
 * Nút của **máy tính** — tải file (DEC-062). Trên điện thoại nút này bị ẩn bằng
 * CSS và thay bằng hai nút bên dưới.
 */
const EXPORT_BUTTON = 'Xuất ảnh báo cáo';

/**
 * Nút 1 của **điện thoại**: mở bảng chia sẻ của hệ điều hành (DEC-062).
 *
 * Nhãn mang biến thể ảnh (DEC-058) — mọi bài ở đây dùng tài khoản đã `COMPLETED`
 * nên luôn là bản KẾT QUẢ. Bản sáng là "Gửi cam kết qua Zalo".
 */
const ZALO_BUTTON = 'Gửi kết quả qua Zalo';

/** Nút 2 của **điện thoại**: hiện ảnh ra để nhấn giữ lưu (DEC-061 + DEC-062). */
const GALLERY_BUTTON = 'Lưu vào thư viện ảnh';

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
  test('máy tính: bấm nút → tải về một file PNG có đúng tên FR-019', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop-1440',
      'Từ DEC-061, điện thoại KHÔNG còn tải file — nó hiện ảnh ra. Xem bài kế tiếp.',
    );

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

    // Nguyên tắc (b) của DEC-060 — không nhánh nào im lặng.
    await expect(page.getByText('Đã tải ảnh về máy')).toBeVisible();
  });

  /**
   * ⚠ BÀI NÀY KHOÁ LẠI **ISSUE-029** — DEC-061.
   *
   * Lỗi thật người dùng báo: trên điện thoại, nút "lưu hình" đẩy file vào thư
   * mục Tải xuống rồi thôi. Không vào Thư viện ảnh, và họ không tìm ra file.
   *
   * Trang web **không ghi được vào Thư viện ảnh** — không có API nào. Nên phép
   * kiểm ở đây không phải "ảnh đã vào thư viện chưa" (không kiểm được, và cũng
   * không đúng chỗ), mà là: **điện thoại có được đưa tới đúng thao tác tay dẫn
   * vào thư viện hay không** — tức ảnh phải HIỆN RA để nhấn giữ.
   */
  test('điện thoại không có share sheet → HIỆN ảnh ra, KHÔNG tải file ngầm', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === 'desktop-1440',
      'Bài này nói về `pointer: coarse` — chỉ có nghĩa trên project cảm ứng.',
    );

    await stubWebShare(page, { supported: false });
    await signIn(page, E2E_DONE_SALES_EMAIL);

    const urlBeforeClick = page.url();

    await page.getByRole('button', { name: ZALO_BUTTON }).click();

    // Ảnh thật hiện ngay trong trang, trỏ vào chế độ XEM của route (`inline`).
    const preview = page.getByRole('img', { name: /^Ảnh báo cáo dọc 9:16/ });
    await expect(preview).toBeVisible({ timeout: 60_000 });
    await expect(preview).toHaveAttribute('src', /\/share-image\?view=1$/);

    // FR-019 vẫn được giữ: tên file đi theo ảnh để lần "Lưu ảnh" đặt đúng tên.
    await expect(preview).toHaveAttribute(
      'alt',
      /BikeForce_Report_.+_\d{4}-\d{2}-\d{2}\.png$/,
    );

    // Và phải nói cho người dùng biết thao tác tiếp theo, nếu không họ lại đi
    // tìm file như đúng lần đã báo lỗi.
    await expect(page.getByText('Nhấn giữ vào ảnh bên dưới')).toBeVisible();

    // Không rời trang: bản DEC-060 điều hướng thật, và đó chính là lúc file rơi
    // vào thư mục Tải xuống mà không ai thấy.
    expect(page.url()).toBe(urlBeforeClick);
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

    await page.getByRole('button', { name: ZALO_BUTTON }).click();

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

    // DEC-061: mở được bảng chia sẻ vẫn CHƯA phải là ảnh đã vào thư viện — phải
    // chỉ đúng mục cần bấm trong bảng đó.
    await expect(page.getByText('Chọn Zalo trong bảng vừa mở')).toBeVisible();
  });

  /**
   * DEC-062 — bố cục nút do **CSS** quyết định, không do JavaScript.
   *
   * Bài này khoá lại đúng điều đó: cùng một HTML, hai thiết bị thấy hai bộ nút
   * khác nhau ngay từ khung hình đầu tiên. Nếu ai đó đổi sang một hook đọc
   * `matchMedia` thì điện thoại sẽ nhấp nháy nhãn máy tính một nhịp — bài này
   * không bắt được cái nhấp nháy, nhưng bắt được việc nút hiện sai thiết bị.
   */
  test('điện thoại thấy hai nút Zalo + thư viện, máy tính chỉ thấy nút tải file', async ({
    page,
  }, testInfo) => {
    await signIn(page, E2E_DONE_SALES_EMAIL);

    const isDesktop = testInfo.project.name === 'desktop-1440';

    const zalo = page.getByRole('button', { name: ZALO_BUTTON });
    const gallery = page.getByRole('button', { name: GALLERY_BUTTON });
    const download = page.getByRole('button', { name: EXPORT_BUTTON });

    if (isDesktop) {
      await expect(download).toBeVisible();
      await expect(zalo).toBeHidden();
      await expect(gallery).toBeHidden();
      return;
    }

    await expect(zalo).toBeVisible();
    await expect(gallery).toBeVisible();
    await expect(download).toBeHidden();
  });

  /**
   * Nút "Lưu vào thư viện ảnh" — DEC-062.
   *
   * Nút này KHÔNG chờ mạng: nó chỉ hiện thẻ `<img>` trỏ vào `?view=1`. Người
   * dùng ở ngoài thị trường, mạng yếu, mà việc họ muốn chỉ là nhìn thấy ảnh để
   * nhấn giữ — bắt họ chờ dựng blob là thừa.
   */
  test('điện thoại: nút thư viện hiện ảnh ngay, không cần bảng chia sẻ', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === 'desktop-1440',
      'Nút này chỉ tồn tại trên giao diện điện thoại.',
    );

    await signIn(page, E2E_DONE_SALES_EMAIL);

    await page.getByRole('button', { name: GALLERY_BUTTON }).click();

    const preview = page.getByRole('img', { name: /^Ảnh báo cáo dọc 9:16/ });
    await expect(preview).toBeVisible({ timeout: 60_000 });
    await expect(preview).toHaveAttribute('src', /\/share-image\?view=1$/);
    await expect(page.getByText('Nhấn giữ vào ảnh bên dưới')).toBeVisible();
  });

  test('luôn có lối lấy ảnh KHÔNG cần JavaScript, và nó DẪN VÀO THƯ VIỆN', async ({ page }) => {
    await signIn(page, E2E_DONE_SALES_EMAIL);

    // Nguyên tắc (c) của DEC-060: nếu webview chặn hết automation (ISSUE-003 —
    // trình duyệt trong Zalo), đây vẫn là một đường lấy ảnh chạy được.
    const link = page.getByRole('link', { name: 'Mở ảnh ở tab mới' });

    await expect(link).toBeVisible();

    /*
     * `?view=1` chứ KHÔNG phải route trần — DEC-061.
     *
     * Route trần trả `attachment`: link mở ra một tab trắng rồi file rơi vào thư
     * mục Tải xuống. Đó đúng là ISSUE-029, và nó làm một "lối thoát" mất hết ý
     * nghĩa. `?view=1` trả `inline` ⇒ ảnh hiện ra ⇒ nhấn giữ được ⇒ lưu được vào
     * Thư viện ảnh.
     */
    await expect(link).toHaveAttribute(
      'href',
      /\/api\/reports\/[0-9a-f-]{36}\/share-image\?view=1$/,
    );
  });

  /**
   * Hai chế độ của route ảnh — DEC-061. Đây là phép kiểm ở tầng HTTP, độc lập
   * với mọi hành vi client, vì cả hai câu chuyện trên đều dựa vào đúng một chữ
   * trong header này.
   */
  test('route ảnh: mặc định TẢI, có ?view=1 thì HIỆN', async ({ page }) => {
    await signIn(page, E2E_DONE_SALES_EMAIL);

    const href = await page
      .getByRole('link', { name: 'Mở ảnh ở tab mới' })
      .getAttribute('href');

    expect(href).not.toBeNull();
    if (href === null) return;

    const viewResponse = await page.request.get(href, { maxRedirects: 0 });
    expect(viewResponse.status()).toBe(200);
    expect(viewResponse.headers()['content-type']).toBe('image/png');
    expect(viewResponse.headers()['content-disposition']).toMatch(/^inline; filename="BikeForce_/);

    const downloadResponse = await page.request.get(href.replace('?view=1', ''), {
      maxRedirects: 0,
    });
    expect(downloadResponse.status()).toBe(200);
    expect(downloadResponse.headers()['content-disposition']).toMatch(
      /^attachment; filename="BikeForce_/,
    );
  });
});
