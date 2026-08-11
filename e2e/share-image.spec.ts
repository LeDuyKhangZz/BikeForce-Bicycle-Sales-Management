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
 * Nút tải ảnh — từ **DEC-064** có ở **cả hai** thiết bị, cùng một nhãn.
 *
 * Trước đó điện thoại có nút "Lưu vào thư viện ảnh" chỉ hiện ảnh rồi bảo người
 * dùng nhấn giữ; người dùng bác vì người không rành máy không biết thao tác đó.
 */
const DOWNLOAD_BUTTON = 'Tải ảnh về máy';

/**
 * Nút 1 của **điện thoại**: mở bảng chia sẻ của hệ điều hành (DEC-062).
 *
 * Nhãn mang biến thể ảnh (DEC-058) — mọi bài ở đây dùng tài khoản đã `COMPLETED`
 * nên luôn là bản KẾT QUẢ. Bản sáng là "Gửi cam kết qua Zalo".
 */
const ZALO_BUTTON = 'Gửi kết quả qua Zalo';



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

    const button = page.getByRole('button', { name: DOWNLOAD_BUTTON });
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

    // Ảnh xem trước LUÔN có mặt từ DEC-064 — không phải bấm gì mới thấy.
    const preview = page.getByRole('img', { name: /^Ảnh báo cáo dọc 9:16/ });
    await expect(preview).toBeVisible({ timeout: 60_000 });
    await expect(preview).toHaveAttribute('src', /\/share-image\?view=1$/);
    // FR-019 vẫn được giữ: tên file đi theo ảnh.
    await expect(preview).toHaveAttribute('alt', /BikeForce_Report_.+_\d{4}-\d{2}-\d{2}\.png$/);

    await page.getByRole('button', { name: ZALO_BUTTON }).click();

    /*
     * ISSUE-003 — webview bị khoá (Zalo, Facebook…). Không có Web Share nghĩa là
     * cũng nhiều khả năng không tải được file và không có menu nhấn giữ. Nút phải
     * mở ra ĐƯỜNG VÒNG chứ không được kết thúc bằng một câu bất lực.
     */
    await expect(page.getByText('Bạn đang mở trong ứng dụng khác')).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText('Mở trong trình duyệt')).toBeVisible();

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
    await page.getByRole('button', { name: DOWNLOAD_BUTTON }).click();
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
  test('điện thoại có thêm nút Zalo; nút tải ảnh thì thiết bị nào cũng có', async ({
    page,
  }, testInfo) => {
    await signIn(page, E2E_DONE_SALES_EMAIL);

    const zalo = page.getByRole('button', { name: ZALO_BUTTON });

    // DEC-064 — nút tải ảnh có ở CẢ HAI thiết bị, cùng một nhãn. Trước đó điện
    // thoại có một nút khác hẳn ("Lưu vào thư viện ảnh") chỉ hiện ảnh ra.
    await expect(page.getByRole('button', { name: DOWNLOAD_BUTTON })).toBeVisible();

    if (testInfo.project.name === 'desktop-1440') {
      // Bảng chia sẻ của Windows không có Zalo (DEC-060) ⇒ không có nút này.
      await expect(zalo).toBeHidden();
      return;
    }

    await expect(zalo).toBeVisible();
  });

  /**
   * DEC-064 — **ảnh xem trước LUÔN có mặt**, không phải bấm gì mới thấy.
   *
   * Người dùng yêu cầu trực tiếp: *"cách hiển thị ảnh trước khi gửi cho người
   * dùng coi trước tôi rất thích"*. Nó cũng gánh luôn việc mà nhãn nút từng phải
   * gánh (DEC-058): cho biết đang cầm tấm CAM KẾT hay tấm KẾT QUẢ.
   */
  test('ảnh xem trước hiện sẵn ngay khi mở trang, mọi thiết bị', async ({ page }) => {
    await signIn(page, E2E_DONE_SALES_EMAIL);

    const preview = page.getByRole('img', { name: /^Ảnh báo cáo dọc 9:16/ });
    await expect(preview).toBeVisible({ timeout: 60_000 });
    await expect(preview).toHaveAttribute('src', /\/share-image\?view=1$/);

    // Không có chữ nào bảo người dùng nhấn giữ — DEC-064 đã bỏ hẳn lối đó.
    await expect(page.getByText('Nhấn giữ vào ảnh')).toHaveCount(0);
  });

  /**
   * Nút tải ảnh trên **điện thoại** — DEC-064.
   *
   * Đây là bài khoá lại yêu cầu "bấm một cái là tải được", thay cho thao tác
   * nhấn giữ mà người dùng đã bác.
   */
  test('điện thoại: bấm nút tải ảnh là tải THẬT, không phải nhấn giữ', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === 'desktop-1440',
      'Bài này nói về nút tải ảnh trên giao diện điện thoại.',
    );

    await stubWebShare(page, { supported: true });
    await signIn(page, E2E_DONE_SALES_EMAIL);

    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
    await page.getByRole('button', { name: DOWNLOAD_BUTTON }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^BikeForce_Report_.+_\d{4}-\d{2}-\d{2}\.png$/);
    await expect(page.getByText('Đã tải ảnh về máy')).toBeVisible();

    // Nút tải KHÔNG được mở bảng chia sẻ — đó là việc của nút Zalo.
    const probe = await page.evaluate(() => window.__shareProbe);
    expect(probe?.called, 'nút tải ảnh không được gọi share sheet').toBe(false);
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
