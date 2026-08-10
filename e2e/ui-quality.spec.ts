import { expect, test, type Page } from '@playwright/test';

import { E2E_ADMIN_EMAIL, E2E_DONE_SALES_EMAIL, toE2eProject, uiSalesEmail } from './accounts';
import { signIn, waitForContent } from './helpers';

/**
 * Hàng rào tự động cho bốn luật CRITICAL/HIGH của `ui-ux-pro-max` — PHASE 13.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO BÀI NÀY ĐƯỢC COMMIT, KHÁC MỌI BỘ SOÁT TRƯỚC ĐÓ
 * ─────────────────────────────────────────────────────────────────────────
 *  Phase 2–6 soát giao diện bằng script dùng-một-lần rồi xoá. Cách đó đủ khi chỉ
 *  cần trả lời "hôm nay có đạt không". Nhưng DEC-053 vừa đưa vào **độ mờ, chuyển
 *  sắc và bóng đổ** trên gần như mọi bề mặt — đúng loại thay đổi làm tỉ lệ tương
 *  phản trôi đi mà không ai nhận ra, vì `bg-card/85` trông y hệt `bg-card` cho
 *  tới khi đo.
 *
 *  Bộ soát dùng-một-lần **đã bắt được một lỗi thật** (bảng tràn ngang 116px) mà
 *  cả `npm test` lẫn 30 lượt quét axe đều không thấy. Xoá một công cụ như vậy đi
 *  là tự nguyện mù lại. Nên nó ở lại đây.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  ĐO TRÊN DOM ĐÃ RENDER, KHÔNG ĐỌC CODE ĐOÁN
 * ─────────────────────────────────────────────────────────────────────────
 *  `color-contrast` đo **cặp thực tế chồng nhau**: leo cây tổ tiên tới màu nền
 *  đầu tiên không trong suốt, tức đúng cặp mắt người nhìn thấy. Đo token so với
 *  `card`/`background` là chưa đủ — bài học **ISSUE-018**, nơi `text-primary`
 *  trên `bg-status-info-bg` cho 4,32:1 mà không bảng token nào bắt được.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  BỐN CÁI BẪY ĐÃ SẬP MỘT LẦN — ĐỪNG GỠ BẤT KỲ DÒNG NÀO CHỐNG CHÚNG
 * ─────────────────────────────────────────────────────────────────────────
 *  1. **Mở mọi `<details>` trước khi đo.** Nội dung gập lại không tham gia
 *     layout; lượt đo đầu tiên báo "0 vi phạm" trong khi có bảng tràn 116px.
 *  2. **Phải đi vào nhánh CÓ DỮ LIỆU** (`?month=` của tháng có fixture), không
 *     thì chỉ đo đúng empty state.
 *  3. **Phải dùng tài khoản VÀO ĐƯỢC màn hình cần đo.** Tài khoản đã
 *     `COMPLETED` bị BR-019 đá khỏi cả hai form nhập.
 *  4. **Phải xuất BỘ ĐẾM.** "0 vi phạm" chỉ có nghĩa khi biết mẫu số — một
 *     selector gõ sai cũng cho 0 vi phạm, và đó là "xanh oan".
 */

type Finding = { route: string; rule: string; detail: string };
type Measured = { findings: Finding[]; interactive: number; pairs: number; minRatio: number };

async function measure(page: Page, route: string): Promise<Measured> {
  return page.evaluate((currentRoute) => {
    const findings: { route: string; rule: string; detail: string }[] = [];
    const push = (rule: string, detail: string) =>
      findings.push({ route: currentRoute, rule, detail });

    const describe = (el: Element): string => {
      const cls = (el.getAttribute('class') ?? '').slice(0, 70);
      const txt = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
      return `<${el.tagName.toLowerCase()}> "${txt}" [${cls}]`;
    };

    /* ── horizontal-scroll (CRITICAL) — và CHỈ ĐÍCH DANH thủ phạm ────────── */
    const root = document.documentElement;
    const overflow = root.scrollWidth - root.clientWidth;
    if (overflow > 1) {
      push('horizontal-scroll', `document tràn ${overflow}px`);
      const limit = root.clientWidth + 1;
      for (const el of Array.from(document.querySelectorAll('*'))) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > limit || r.left < -1) {
          push('horizontal-scroll', `THỦ PHẠM right=${Math.round(r.right)} ${describe(el)}`);
        }
      }
    }

    /* ── touch-target-size (CRITICAL) ────────────────────────────────────── */
    const interactive = document.querySelectorAll(
      'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"]',
    );
    for (const el of Array.from(interactive)) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.height < 44 || r.width < 24) {
        push('touch-target-size', `${Math.round(r.width)}×${Math.round(r.height)} ${describe(el)}`);
      }
    }

    /* ── readable-font-size ──────────────────────────────────────────────── */
    for (const el of Array.from(document.querySelectorAll('input, select, textarea'))) {
      const size = parseFloat(getComputedStyle(el).fontSize);
      // < 16px làm iOS Safari tự phóng to trang khi focus ⇒ layout nhảy.
      if (size < 16) push('readable-font-size', `input ${size}px ${describe(el)}`);
    }

    /* ── color-contrast trên CẶP THỰC TẾ chồng nhau ──────────────────────── */
    const parse = (value: string): [number, number, number] | null => {
      const m = value.match(/rgba?\(([^)]+)\)/);
      if (!m || m[1] === undefined) return null;
      const parts = m[1].split(',').map((p) => parseFloat(p));
      if (parts.length >= 4 && parts[3] === 0) return null;
      const [r, g, b] = parts;
      if (r === undefined || g === undefined || b === undefined) return null;
      return [r, g, b];
    };
    const lum = ([r, g, b]: [number, number, number]): number => {
      const f = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a: [number, number, number], b: [number, number, number]): number => {
      const [l1, l2] = [lum(a), lum(b)];
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    /** Leo cây tổ tiên tới màu nền đầu tiên KHÔNG trong suốt — bài học ISSUE-018. */
    const effectiveBg = (el: Element): [number, number, number] => {
      let node: Element | null = el;
      while (node) {
        const c = parse(getComputedStyle(node).backgroundColor);
        if (c) return c;
        node = node.parentElement;
      }
      return [255, 255, 255];
    };

    let pairs = 0;
    let minRatio = 21;
    const seen = new Set<string>();

    for (const el of Array.from(document.querySelectorAll('*'))) {
      const hasOwnText = Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim().length > 0,
      );
      if (!hasOwnText) continue;

      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') {
        continue;
      }
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;

      const fg = parse(style.color);
      if (!fg) continue;

      const size = parseFloat(style.fontSize);
      if (size < 12) push('readable-font-size', `chữ ${size}px ${describe(el)}`);

      const weight = parseInt(style.fontWeight, 10) || 400;
      const isLarge = size >= 24 || (size >= 18.66 && weight >= 700);
      const need = isLarge ? 3 : 4.5;
      const got = ratio(fg, effectiveBg(el));

      pairs += 1;
      if (got < minRatio) minRatio = got;

      if (got < need) {
        const key = `${style.color}|${describe(el)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        push('color-contrast', `${got.toFixed(2)}:1 (cần ${need}) ${describe(el)}`);
      }
    }

    return { findings, interactive: interactive.length, pairs, minRatio };
  }, route);
}

async function auditRoute(page: Page, route: string): Promise<Measured> {
  await page.goto(route);
  await waitForContent(page);
  // Bẫy 1 — nội dung trong `<details>` đóng không tham gia layout.
  await page.evaluate(() =>
    document.querySelectorAll('details').forEach((d) => d.setAttribute('open', '')),
  );
  await page.waitForTimeout(300);
  return measure(page, route);
}

/** Gộp kết quả nhiều route rồi assert MỘT lần — báo lỗi đọc được cả cụm. */
function assertClean(results: readonly Measured[]): void {
  const findings = results.flatMap((r) => r.findings);
  const pairs = results.reduce((sum, r) => sum + r.pairs, 0);
  const interactive = results.reduce((sum, r) => sum + r.interactive, 0);

  // Bẫy 4 — chứng minh phép đo CÓ chạy. Một selector gõ sai cũng cho 0 vi phạm.
  expect(pairs, 'không đo được cặp màu nào — phép đo hỏng, không phải giao diện sạch').toBeGreaterThan(50);
  expect(interactive, 'không thấy phần tử tương tác nào — phép đo hỏng').toBeGreaterThan(10);

  expect(findings.map((f) => `[${f.rule}] ${f.route} — ${f.detail}`)).toEqual([]);
}

const previousMonth = (() => {
  const now = new Date();
  const p = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${p.getUTCFullYear()}-${String(p.getUTCMonth() + 1).padStart(2, '0')}`;
})();

test.describe('DEC-053 — hàng rào chất lượng giao diện', () => {
  /*
    KHÔNG chạy ở `zalo-like`, và đây không phải cắt xén cho nhanh.

    `zalo-like` có **đúng cùng viewport 375×812** với `mobile-375`; nó khác duy
    nhất ở `userAgent`. Bốn luật bài này đo — tương phản, cỡ chạm, tràn ngang,
    cỡ chữ — đều là hàm của **bề rộng và CSS**, không hàm của UA. Chạy thêm ở
    `zalo-like` vì vậy đo lại **y hệt** một lần nữa: không thêm một bit thông tin
    nào, mà tốn gấp rưỡi thời gian.

    Chi phí đó không vô hại. Phép đo này nặng (quét cả cây DOM, `getComputedStyle`
    từng phần tử), và khi nó chiếm máy thì đường xác thực vốn đã tốn 4 lượt
    đi-về tuần tự (**ISSUE-021**) bị đẩy vượt ngưỡng chờ của `signIn` — đã làm
    đỏ oan hai bài KHÁC trong `sales-flow` và `security`.

    Giá trị riêng của `zalo-like` nằm ở hành vi suy theo UA (Web Share API,
    tải file) — `security.spec.ts` và `sales-flow.spec.ts` vẫn chạy đủ ở đó.
  */
  test.skip(
    () => test.info().project.name === 'zalo-like',
    'Cùng viewport với mobile-375 nên đo lại y hệt — xem chú thích ở đầu describe.',
  );

  test('khu vực Sales: không tràn ngang, chạm ≥ 44px, tương phản AA', async ({ page }) => {
    test.setTimeout(240_000);
    await signIn(page, E2E_DONE_SALES_EMAIL);

    const results = [];
    for (const route of ['/sales/today', '/sales/history', '/sales/account']) {
      results.push(await auditRoute(page, route));
    }

    // Trang chi tiết cần một `id` thật — lấy từ liên kết đầu của lịch sử.
    await page.goto('/sales/history');
    await waitForContent(page);
    const href = await page.locator('a[href^="/sales/reports/"]').first().getAttribute('href');
    if (href) results.push(await auditRoute(page, href));

    assertClean(results);
  });

  test('hai FORM NHẬP của Sales — màn hình quan trọng nhất', async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    /*
      Bẫy 3 — hai lớp, và lớp thứ hai chỉ lộ ra khi chạy TOÀN BỘ bộ E2E:
        (a) tài khoản đã `COMPLETED` bị BR-019 đá khỏi cả hai form nhập;
        (b) **tài khoản phải là của RIÊNG spec này.** Bản đầu dùng chung
            `flowSalesEmail` với `sales-flow.spec.ts` — xanh khi chạy riêng, đỏ ở
            cả 3 project khi chạy đầy đủ, vì spec kia chạy trước và đã đưa tài
            khoản lên `COMPLETED`. BR-001 + BR-019 nghĩa là mỗi spec CÓ GHI báo
            cáo phải có Sales riêng.
    */
    await signIn(page, uiSalesEmail(toE2eProject(testInfo.project.name)));

    const results = [await auditRoute(page, '/sales/today'), await auditRoute(page, '/sales/today/morning')];

    await page.locator('[name="planned_route"]').fill('Quận 1 → Quận 3');
    await page.locator('[name="target_visit_points"]').fill('12');
    await page.locator('[name="target_sales_amount"]').fill('80000000');
    await page.locator('[name="target_revenue"]').fill('100000000');
    await page.locator('[name="target_customer_visits"]').fill('12');
    await page.getByRole('button', { name: 'Lưu báo cáo đầu ngày' }).click();
    await page.waitForURL(/\/sales\/today(\?|$)/, { timeout: 20_000 });

    results.push(await auditRoute(page, '/sales/today/evening'));
    assertClean(results);
  });

  /*
    Khu vực Admin tách làm HAI bài thay vì một.

    Bản đầu duyệt cả 8 route trong một bài và **hết giờ ở 180 giây tại
    `desktop-1440`** — không phải vì giao diện sai, mà vì phép đo tự nó nặng:
    mỗi route quét toàn bộ cây DOM và gọi `getComputedStyle` cho từng phần tử,
    và ở 1440px thì DEC-019 render **cả hai** nhánh (thẻ + `<table>`) nên số
    phần tử gần gấp đôi bản mobile.

    Chia đôi giữ mỗi bài trong ngân sách, và khi đỏ thì cũng khoanh vùng nhanh
    hơn hẳn — biết ngay là nhóm "danh sách" hay nhóm "phân tích tháng".
  */
  test('Admin — tổng quan, báo cáo, quản lý tài khoản', async ({ page }) => {
    test.setTimeout(240_000);
    await signIn(page, E2E_ADMIN_EMAIL);

    const results = [];
    for (const route of ['/admin', '/admin/reports', '/admin/sales', '/admin/sales/new', '/admin/account']) {
      results.push(await auditRoute(page, route));
    }

    assertClean(results);
  });

  test('Admin — phân tích tháng, gồm cả nhánh CÓ dữ liệu', async ({ page }) => {
    test.setTimeout(240_000);
    await signIn(page, E2E_ADMIN_EMAIL);

    const results = [];
    for (const route of [
      '/admin/analytics',
      // Bẫy 2 — không có `?month=` thì chỉ đo đúng empty state, tức bỏ sót đúng
      // phần dễ tràn nhất: bảng số liệu và biểu đồ khi CÓ dữ liệu.
      `/admin/analytics?month=${previousMonth}`,
      `/admin/analytics?month=${previousMonth}&metric=SALES_AMOUNT`,
      `/admin/analytics?month=${previousMonth}&metric=REVENUE`,
    ]) {
      results.push(await auditRoute(page, route));
    }

    assertClean(results);
  });

  test('cỡ chữ hệ thống lớn nhất (dynamic-type) không làm vỡ bố cục', async ({ page }) => {
    test.setTimeout(240_000);
    await signIn(page, E2E_DONE_SALES_EMAIL);

    const results = [];
    for (const route of ['/sales/today', '/sales/history', '/sales/account']) {
      await page.goto(route);
      await waitForContent(page);
      // Toàn bộ type scale của dự án tính bằng `rem`, nên phóng `font-size` gốc
      // lên 150% là phép mô phỏng trung thực cho Dynamic Type của hệ điều hành.
      await page.addStyleTag({ content: 'html { font-size: 24px !important; }' });
      await page.waitForTimeout(300);
      results.push(await measure(page, `${route} @150%`));
    }

    assertClean(results);
  });
});
