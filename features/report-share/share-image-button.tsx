'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, Download, ExternalLink, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { REPORT_MESSAGES } from '@/lib/reports/messages';
import {
  DOWNLOAD_IMAGE_LABEL,
  SEND_TO_ZALO_LABEL,
  shareImagePath,
  shareImageViewPath,
  type ShareCardVariant,
} from '@/lib/reports/share-card';

/**
 * Nút xuất ảnh 9:16 — FR-017, FR-020, UC-08, DEC-011.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  ⚠ VIẾT LẠI Ở PHASE 14 — DEC-060. HAI LỖI THẬT NGƯỜI DÙNG BÁO
 * ─────────────────────────────────────────────────────────────────────────
 *  1. **Trên điện thoại bấm nút KHÔNG có gì xảy ra.** Bản cũ đặt "mở tab mới"
 *     trong `catch` của `anchor.click()` — nhưng `click()` **không bao giờ ném
 *     lỗi**. Khi trình duyệt lặng lẽ bỏ qua thuộc tính `download` (iOS Safari với
 *     `blob:`, webview Zalo, một số webview Android), lệnh vẫn "thành công" và
 *     người dùng không nhận được gì: không ảnh, không lỗi, không hướng dẫn.
 *  2. **Trên máy tính hiện share sheet của Windows, trong đó không có Zalo.**
 *     `navigator.canShare({files})` trả `true` trên Chrome Windows, nên bản cũ
 *     ưu tiên share sheet ở đúng nơi nó vô dụng nhất.
 *
 *  Ba nguyên tắc rút ra, và toàn bộ file này là hệ quả của chúng:
 *
 *  **(a) Share sheet CHỈ cho thiết bị cảm ứng.** Điều kiện là `pointer: coarse` —
 *  vẫn là feature detection (kiểu con trỏ), **không** sniff userAgent. Máy tính
 *  có chuột đi thẳng đường tải về, đúng thứ người dùng yêu cầu.
 *
 *  **(b) KHÔNG bao giờ kết thúc trong im lặng.** Mọi nhánh đều để lại một thứ
 *  nhìn thấy được: share sheet mở ra, hoặc dòng xác nhận đã tải, hoặc câu lỗi.
 *
 *  **(c) Luôn có một lối thoát KHÔNG cần JavaScript.** Link bên dưới là một thẻ
 *  `<a>` thuần trỏ vào chính route ảnh. Nếu mọi automation phía trên bị webview
 *  chặn, người dùng vẫn lấy được ảnh bằng một lần chạm.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  ⚠ BỔ SUNG NGUYÊN TẮC THỨ TƯ — DEC-061 (ISSUE-029, 2026-08-11)
 * ─────────────────────────────────────────────────────────────────────────
 *  DEC-060 đã làm nút không còn im lặng, nhưng người dùng báo tiếp: ảnh **không
 *  vào Thư viện ảnh**, nó "tự lưu ở đâu đó" — thư mục Tải xuống — và họ không
 *  tìm ra. Ba nguyên tắc trên không sai, chúng chỉ dừng ở "đã có file".
 *
 *  **(d) "Đã tải về" CHƯA PHẢI là xong. Đích đến là Thư viện ảnh.** Và trang web
 *  **không có API nào** ghi vào đó — Android lẫn iOS đều không cho. Chỉ còn hai
 *  đường, cả hai đều cần một thao tác tay của con người:
 *
 *    1. Bảng chia sẻ của hệ điều hành → "Lưu ảnh"  ⟵ `navigator.share()`
 *    2. Nhấn giữ vào ảnh **đang hiển thị** → "Lưu ảnh"  ⟵ `?view=1` + `<img>`
 *
 *  Vì vậy mọi nhánh của file này kết thúc bằng một trong hai đường đó, kèm một
 *  câu chỉ đúng thao tác tiếp theo. Không nhánh nào còn kết thúc bằng "file đã
 *  nằm đâu đó trong máy bạn".
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO BỘ TEST KHÔNG BẮT ĐƯỢC HAI LỖI TRÊN — ghi lại để không lặp lại
 * ─────────────────────────────────────────────────────────────────────────
 *  E2E chỉ kiểm nút **có hiện** không (`toBeVisible`), còn ảnh thì gọi thẳng
 *  route bằng `page.request.get()`. Không bài nào **bấm** nút, nên toàn bộ hàm
 *  `handleExport()` — nhánh share, nhánh tải, nhánh dự phòng — chưa từng chạy
 *  một lần trong CI. Nay đã có bài E2E bấm thật và bắt sự kiện `download`.
 *
 * Component này **không** quyết định có được xuất ảnh hay không, và cũng không
 * quyết định xuất ảnh NÀO. Cả hai suy ra từ `status` đã persist ở server —
 * `getTodayView().shareImageVariant` — và route handler đọc lại `status` một lần
 * nữa khi dựng ảnh. Ẩn/hiện nút không phải bảo mật (AGENTS.md §7).
 */

type Props = {
  reportId: string;
  /** Tên file tải về — do server dựng bằng `shareImageFileName()` (FR-019). */
  fileName: string;
  /**
   * Bản sáng hay bản chiều (DEC-058). Chỉ dùng để chọn NHÃN nút: nội dung ảnh do
   * route handler quyết định từ dữ liệu, client không gửi biến thể lên server.
   */
  variant: ShareCardVariant;
};

type BusyAction = 'share' | 'download' | 'copy' | null;

const PNG_MIME = 'image/png';

/** Câu xác nhận sau khi đã kích hoạt tải về — nguyên tắc (b). */
const DOWNLOADED_HINT = 'Đã tải ảnh về máy. Kiểm tra thư mục Tải xuống.';

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  PHASE 14 — DEC-061: "TẢI VỀ" KHÔNG PHẢI LÀ "LƯU VÀO THƯ VIỆN"
 * ─────────────────────────────────────────────────────────────────────────
 *  Người dùng báo ngày 2026-08-11 (**ISSUE-029**): bấm nút trên điện thoại thì
 *  ảnh "tự lưu ở đâu đó" và họ không tìm ra. Nó nằm trong thư mục **Tải xuống**,
 *  không nằm trong Thư viện ảnh — và điều đó là **không tránh được bằng code**:
 *  trang web không có API nào ghi vào Thư viện ảnh Android / app Ảnh iOS.
 *
 *  Nên ba câu dưới đây không phải là "thông báo cho đẹp". Chúng là **giao diện
 *  của một giới hạn hệ điều hành**: mỗi câu chỉ đúng một thao tác tay mà chỉ con
 *  người mới làm được, và nếu thiếu chúng thì người dùng lại đi tìm file lần nữa.
 */

/** Sau khi bảng chia sẻ của hệ điều hành đã mở. */
const SHARED_HINT = 'Chọn Zalo trong bảng vừa mở để gửi, hoặc “Lưu ảnh” để cất vào Thư viện.';

/*
 * ⚠ `LONG_PRESS_HINT` ("nhấn giữ vào ảnh rồi chọn Lưu ảnh") **đã bị xoá ở
 * DEC-064** — đừng thêm lại. Người dùng bác thẳng cách đó: bắt nhấn giữ là bắt
 * người không rành máy học một thao tác ẩn. Mọi việc nay làm bằng NÚT.
 *
 * Nhấn giữ vẫn chạy được trên trình duyệt thật, nhưng nó là **thứ có sẵn của
 * trình duyệt**, không phải một bước trong hướng dẫn của sản phẩm.
 */

/**
 * Khi máy không mở được bảng chia sẻ — hay gặp nhất trong webview của Zalo.
 *
 * ⚠ **DEC-064 đã viết lại câu này.** Bản trước nói "nhấn giữ vào ảnh bên dưới để
 * lưu, rồi mở Zalo và gửi ảnh đó" — tức là dạy một thao tác ẩn, đúng thứ người
 * dùng bác. Nay nó chỉ **trỏ xuống khối nút** ngay bên dưới; mọi việc ở đó đều
 * làm bằng một cú bấm.
 */
const ZALO_MANUAL_HINT = 'Máy không mở được bảng chia sẻ. Dùng một trong hai cách bên dưới.';

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  ISSUE-003 — TRÌNH DUYỆT **TRONG** ZALO LÀ MỘT MÔI TRƯỜNG KHÁC HẲN
 * ─────────────────────────────────────────────────────────────────────────
 *  Người dùng báo ngày 2026-08-11, sau khi DEC-061/062 đã lên production:
 *
 *  > *"các trình duyệt khác thì bình thường nhưng nếu mở link ngay trong zalo
 *  > sẽ không thể tải ảnh hay chuyển ảnh qua zalo"*
 *
 *  Đây **không** phải lỗi của trang. Trình duyệt trong Zalo là một **WebView**
 *  nhúng, và ứng dụng chủ quyết định nó được làm gì. Ba thứ ta vẫn dựa vào đều
 *  có thể bị cắt cùng lúc, và trong Zalo thì đúng là bị cắt:
 *
 *  | Cơ chế | Vì sao chết trong WebView |
 *  |---|---|
 *  | `navigator.share()` | WKWebView (iOS) không phơi Web Share ra; Android WebView cũng vậy trừ khi app chủ bật |
 *  | Tải file (`attachment`, `<a download>`) | Android WebView **bỏ qua hoàn toàn** nếu app chủ không cài `DownloadListener` |
 *  | Nhấn giữ ảnh → "Lưu ảnh" | Menu ngữ cảnh là của app chủ; nhiều in-app browser tắt hẳn |
 *
 *  Không có API nào của web bật lại được ba thứ đó. Nên cách sửa **không phải**
 *  tìm mẹo mới, mà là mở hai đường vòng có thật:
 *
 *    1. **Sao chép ảnh vào clipboard** → người dùng dán thẳng vào khung chat Zalo.
 *       Đường này giữ họ **ở trong Zalo**, không phải đi đâu cả — nên nó đứng trước.
 *    2. **Mở bằng trình duyệt hệ thống** → mọi thứ chạy lại bình thường, đúng như
 *       người dùng đã xác nhận ("các trình duyệt khác thì bình thường").
 */

/** Đã chép xong — nói rõ việc tiếp theo, đừng chỉ báo "đã sao chép". */
const COPIED_HINT = 'Đã sao chép ảnh. Mở khung chat Zalo rồi nhấn giữ ô nhập → “Dán” để gửi.';

/** Clipboard bị từ chối — vẫn còn đường mở bằng trình duyệt bên dưới. */
const COPY_FAILED_HINT =
  'Trình duyệt này không cho sao chép ảnh. Hãy dùng cách “Mở bằng trình duyệt” bên dưới.';

/** Ảnh không tải nổi trong webview ⇒ mọi đường trong trang đều tắc. */
const PREVIEW_BLOCKED_HINT =
  'Trình duyệt này chặn cả việc hiển thị ảnh. Hãy mở trang bằng trình duyệt của máy.';

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  ĐIỆN THOẠI VÀ MÁY TÍNH ĐƯỢC TÁCH BẰNG **CSS**, KHÔNG BẰNG JAVASCRIPT
 * ─────────────────────────────────────────────────────────────────────────
 *  `pointer-coarse:` là biến thể media query của Tailwind v4 — con trỏ chính là
 *  ngón tay. Vẫn là **feature detection** đúng nghĩa (kiểu con trỏ), khác hẳn
 *  việc đọc `userAgent`, và nó trả lời đúng câu cần hỏi: "máy này có phải cái
 *  người dùng cầm trên tay và có Zalo cài sẵn không". Chạy y hệt trên **Android
 *  lẫn iOS** vì cả hai đều báo `pointer: coarse` cho màn hình cảm ứng.
 *
 *  Vì sao CSS chứ không phải một hook đọc `matchMedia`: một hook chỉ biết kết quả
 *  **sau khi hydrate**, nên HTML của server luôn là bản máy tính và điện thoại sẽ
 *  thấy nhãn "Xuất ảnh báo cáo" nhấp nháy một nhịp rồi mới đổi thành "Gửi qua
 *  Zalo". CSS thì đúng ngay từ khung hình đầu tiên, kể cả trước khi JS chạy.
 *
 *  Hệ quả: mỗi nút làm **đúng một việc** và không nút nào phải tự hỏi mình đang
 *  ở thiết bị nào. Nút của máy tính không bao giờ gọi share sheet — đó chính là
 *  điều DEC-060 yêu cầu, nay được bảo đảm bằng cấu trúc chứ không bằng một câu
 *  `if` có thể bị viết lại nhầm.
 *
 *  ⚠ Hai class này đặt lên **thẻ bọc**, không đặt thẳng lên `<Button>`. Lý do:
 *  `cn()` của dự án cố ý KHÔNG có `tailwind-merge` (`lib/utils.ts`), nên
 *  `hidden` gặp `inline-flex` sẵn có trong class nền của Button là một xung đột
 *  do thứ tự CSS quyết định — thứ không nên đem ra cược. Thẻ `<div>` trần không
 *  có utility `display` nào nên `hidden` + `pointer-coarse:flex` là khuôn mẫu
 *  quen thuộc, chạy chắc chắn.
 */
const TOUCH_ONLY = 'hidden flex-col gap-2 pointer-coarse:flex';
const MOUSE_ONLY = 'pointer-coarse:hidden';

/** Media query của cùng một luật trên, dùng cho quyết định KHÔNG ảnh hưởng render. */
const COARSE_POINTER = '(pointer: coarse)';

/**
 * Máy này có phải một **webview bị khoá** không — ISSUE-003.
 *
 * Vẫn là capability detection, KHÔNG đọc `userAgent`: câu hỏi thật sự là "trình
 * duyệt này có Web Share không", chứ không phải "đây có phải Zalo không". Chrome
 * trên Android và Safari trên iOS đều **có** `navigator.share`; thiếu nó trên
 * một máy cảm ứng gần như chắc chắn nghĩa là đang ở trong một in-app browser.
 *
 * Sniff `userAgent` sẽ hỏng theo hai chiều: Zalo đổi UA là ta mù, còn Facebook /
 * Instagram / TikTok cũng khoá y hệt mà ta lại không nhận ra.
 */
function lacksSystemShare(): boolean {
  return typeof navigator.share !== 'function';
}

/** Trình duyệt có cho ghi ảnh vào clipboard không (đường vòng số 1 của ISSUE-003). */
function canCopyImage(): boolean {
  return typeof ClipboardItem === 'function' && typeof navigator.clipboard?.write === 'function';
}

/**
 * Kết quả lấy ảnh — union thay vì exception, vì Promise này được nạp trước và
 * có thể không ai `await` nó (xem `fetchShareImage`).
 */
type ImageFetchResult = { readonly ok: true; readonly blob: Blob } | {
  readonly ok: false;
  readonly message: string;
};

/**
 * Lấy ảnh về dạng `Blob`, **KHÔNG bao giờ ném lỗi**.
 *
 * Ở module scope chứ không trong component: nó chỉ cần `reportId`, và nhờ vậy
 * `useEffect` nạp trước bên dưới không phải khai nó trong mảng phụ thuộc.
 */
async function fetchShareImage(reportId: string): Promise<ImageFetchResult> {
  try {
    const response = await fetch(shareImagePath(reportId));

    if (!response.ok) {
      // Route trả `{ code, message }` với message đã là tiếng Việt an toàn —
      // client KHÔNG tự suy ra câu thông báo (cùng lý do với DEC-034).
      const body: unknown = await response.json().catch(() => null);
      const message =
        typeof body === 'object' && body !== null && 'message' in body
          ? String((body as { message: unknown }).message)
          : REPORT_MESSAGES.IMAGE_FAILED;

      return { ok: false, message };
    }

    // Phòng thủ cho đúng lỗi đã xảy ra thật ở Phase 6 (ISSUE-015): nếu có lớp
    // nào đó redirect request này sang một trang HTML, `fetch` đi theo redirect
    // và `response.ok` vẫn là `true`. Không kiểm kiểu nội dung thì người dùng
    // nhận một file `.png` chứa HTML.
    if (!response.headers.get('content-type')?.startsWith(PNG_MIME)) {
      return { ok: false, message: REPORT_MESSAGES.IMAGE_FAILED };
    }

    return { ok: true, blob: await response.blob() };
  } catch {
    // Mất mạng giữa chừng, hoặc trình duyệt chặn `fetch`.
    return { ok: false, message: REPORT_MESSAGES.IMAGE_FAILED };
  }
}

export function ShareImageButton({ reportId, fileName, variant }: Props) {
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const isBusy = busyAction !== null;
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  /**
   * Đang ở trong một webview bị khoá (Zalo, Facebook, TikTok…) — ISSUE-003.
   *
   * Chỉ bật sau một cú chạm, nên khối hướng dẫn nó điều khiển **không tồn tại**
   * trong HTML của server. Nhờ vậy chỗ đó được phép hỏi thẳng trình duyệt xem có
   * `ClipboardItem` hay không mà không sợ lệch hydrate.
   */
  const [isRestrictedBrowser, setIsRestrictedBrowser] = useState(false);

  /** Ảnh đã nạp (hoặc đang nạp). `null` = chưa nạp lần nào, hoặc lần trước hỏng. */
  const imagePromiseRef = useRef<Promise<ImageFetchResult> | null>(null);

  /**
   * NẠP TRƯỚC tấm ảnh trên thiết bị cảm ứng — điều kiện sống còn của iOS.
   *
   * Chỉ chạy khi `pointer: coarse`. Máy tính không cần: ở đó nút chỉ tải file,
   * và `<a download>` không đòi "quyền hạn từ cú chạm" như `navigator.share()`.
   * Giới hạn như vậy để không bắt mỗi lượt xem trang trên máy tính phải trả giá
   * một lượt dựng ảnh 1080×1920 (DEC-021 — ảnh không được cache ở đâu cả).
   *
   * Đây là ghi vào `ref`, KHÔNG phải `setState`, nên không vướng luật
   * `react-hooks/set-state-in-effect` mà React Compiler đang bật (xem
   * `lib/hooks/use-report-draft.ts` để biết luật đó đã chặn cách viết nào).
   */
  useEffect(() => {
    if (!window.matchMedia?.(COARSE_POINTER).matches) return;

    imagePromiseRef.current ??= fetchShareImage(reportId);
  }, [reportId]);

  /**
   * Tải blob về máy. Trả về `true` nếu **chắc chắn** đã kích hoạt được một hành
   * động tải; `false` khi trình duyệt không hỗ trợ thuộc tính `download` — lúc
   * đó tầng gọi phải chuyển sang mở ảnh trực tiếp.
   *
   * ⚠ KHÔNG bọc `anchor.click()` trong `try/catch` rồi coi "không ném lỗi" là
   * "đã tải được" — đó chính là lỗi của bản cũ.
   */
  function downloadBlob(blob: Blob): boolean {
    const anchor = document.createElement('a');

    // Trình duyệt nào không hiểu thuộc tính này sẽ lặng lẽ điều hướng sang blob
    // thay vì tải file — phải phát hiện TRƯỚC, không phải sau.
    if (!('download' in anchor)) return false;

    const objectUrl = URL.createObjectURL(blob);

    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();

    // Nhả bộ nhớ của blob, hoãn một nhịp để trình duyệt kịp bắt đầu tải.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);

    return true;
  }

  /**
   * Ảnh đã nạp trước, hoặc nạp ngay bây giờ nếu lần nạp trước hỏng.
   *
   * ⚠ **ĐÂY LÀ CHỖ QUYẾT ĐỊNH iOS CÓ MỞ ĐƯỢC BẢNG CHIA SẺ HAY KHÔNG.** Safari
   * chỉ cho gọi `navigator.share()` khi **quyền hạn từ cú chạm còn hiệu lực**.
   * Nếu giữa cú chạm và lời gọi có một vòng mạng thật (dựng ảnh 1080×1920 mất
   * vài trăm ms tới vài giây), quyền đó hết hạn và Safari ném `NotAllowedError`
   * — nút "không làm gì cả" đúng như người dùng từng báo ở DEC-060.
   *
   * Nạp trước từ lúc màn hình hiện ra thì tới lúc chạm, `await` này giải quyết
   * trong **một microtask** — cùng một task của sự kiện chạm, quyền còn nguyên.
   * Android không khắt khe bằng nhưng hưởng lợi y hệt: bấm là mở ngay, không có
   * quãng "Đang tạo ảnh…".
   */
  async function takeShareImage(): Promise<ImageFetchResult> {
    imagePromiseRef.current ??= fetchShareImage(reportId);

    const result = await imagePromiseRef.current;

    // Hỏng thì bỏ bộ nhớ đệm đi, để lần chạm sau thử lại thật chứ không phát lại
    // một lỗi cũ mãi mãi.
    if (!result.ok) imagePromiseRef.current = null;

    return result;
  }

  /**
   * ── ĐIỆN THOẠI, NÚT 1: GỬI QUA ZALO ──────────────────────────────────────
   *
   * `navigator.share({ files })` mở **bảng chia sẻ của hệ điều hành**, nơi Zalo
   * nằm sẵn cạnh các ứng dụng khác. Đây là con đường DUY NHẤT đưa được một file
   * từ trình duyệt sang ứng dụng Zalo — trên **cả Android lẫn iOS**. Không có
   * deep link nào của Zalo nhận file, và trang web thì không với tới ứng dụng
   * khác. Đừng thay bằng `zalo://`, `sharer.zalo.me` hay `intent://`: nhóm đó
   * chỉ chia sẻ được **đường dẫn**, mà đường dẫn ảnh của ta thì đòi đăng nhập
   * nên người nhận mở ra chỉ thấy màn hình đăng nhập.
   */
  async function handleSendToZalo() {
    setBusyAction('share');
    setError(null);
    setHint(null);

    try {
      const result = await takeShareImage();

      if (!result.ok) {
        setError(result.message);
        return;
      }

      const file = new File([result.blob], fileName, { type: PNG_MIME });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: fileName });
          setHint(SHARED_HINT);
          return;
        } catch (shareError) {
          // Người dùng bấm huỷ bảng chia sẻ — KHÔNG phải lỗi, không báo gì cả.
          if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
          // Mọi lỗi khác rơi xuống đường thủ công bên dưới.
        }
      }

      // Webview không có Web Share — đúng bối cảnh ISSUE-003. Vẫn phải kết thúc
      // bằng một thứ dùng được, không phải im lặng. Ảnh đã hiện sẵn từ DEC-064
      // nên ở đây chỉ cần mở khối đường vòng.
      setIsRestrictedBrowser(true);
      setHint(ZALO_MANUAL_HINT);
    } finally {
      setBusyAction(null);
    }
  }

  /**
   * ── ĐƯỜNG VÒNG SỐ 1 CỦA ISSUE-003: SAO CHÉP ẢNH ─────────────────────────
   *
   * Đây là đường **duy nhất** đưa được tấm ảnh vào một cuộc trò chuyện Zalo mà
   * người dùng **không phải rời khỏi Zalo**: chép ảnh vào clipboard, rồi họ dán
   * vào khung chat. Không cần tải file (WebView chặn), không cần bảng chia sẻ
   * (WebView không có), không cần nhấn giữ (menu ngữ cảnh là của app chủ).
   *
   * ⚠ Dùng lại blob đã nạp trước — cùng lý do với `navigator.share()`: quyền
   * ghi clipboard cũng đòi thao tác chạm còn hiệu lực. Safari còn khắt khe hơn
   * ở đây, nên nếu đường này hỏng thì khối hướng dẫn "mở bằng trình duyệt" bên
   * dưới vẫn còn nguyên, không có nhánh nào cụt.
   */
  async function handleCopyImage() {
    setBusyAction('copy');
    setError(null);
    setHint(null);

    try {
      const result = await takeShareImage();

      if (!result.ok) {
        setError(result.message);
        return;
      }

      await navigator.clipboard.write([new ClipboardItem({ [PNG_MIME]: result.blob })]);
      setHint(COPIED_HINT);
    } catch {
      // Trình duyệt từ chối quyền, hoặc không nhận kiểu `image/png`.
      setError(COPY_FAILED_HINT);
    } finally {
      setBusyAction(null);
    }
  }

  /**
   * ── NÚT TẢI ẢNH — CÓ Ở CẢ HAI THIẾT BỊ (DEC-064) ────────────────────────
   *
   * ⚠ **Trước DEC-064 nút này chỉ có trên máy tính**, còn điện thoại được đưa
   * một nút "Lưu vào thư viện ảnh" mà thực chất chỉ hiện ảnh ra rồi bảo người
   * dùng **nhấn giữ**. Người dùng bác thẳng thiết kế đó:
   *
   * > *"tôi không thích cách phải giữ ảnh mới tải xuống hay chuyển ảnh đi được,
   * > vì nếu làm vậy những người 'mù công nghệ' sẽ không biết làm"*
   *
   * Họ đúng. `<a download>` với `blob:` **chạy thật** trên Chrome Android và
   * trên Safari iOS 13+ — không cần nhấn giữ, không cần dạy ai điều gì. Cái nó
   * không làm được là ghi vào **Thư viện ảnh** (không API nào làm được —
   * DEC-061); file vào thư mục Tải xuống, và dòng xác nhận nói đúng chỗ đó.
   *
   * Muốn ảnh nằm trong Thư viện thì đi đường nút Zalo → "Lưu ảnh" trong bảng
   * chia sẻ. Đó là lý do hai nút cùng tồn tại chứ không phải một nút gánh cả hai.
   *
   * Máy tính vẫn **không bao giờ** gọi share sheet: trên Chrome Windows nó mở
   * một bảng không hề có Zalo (DEC-060).
   */
  async function handleDownload() {
    setBusyAction('download');
    setError(null);
    setHint(null);

    try {
      const result = await takeShareImage();

      if (!result.ok) {
        setError(result.message);
        return;
      }

      if (!downloadBlob(result.blob)) {
        window.location.href = shareImagePath(reportId);
        return;
      }

      setHint(DOWNLOADED_HINT);

      /*
       * ⚠ `anchor.click()` KHÔNG BAO GIỜ ném lỗi, kể cả khi webview bỏ qua hoàn
       * toàn thuộc tính `download` (bài học DEC-060). Nên trong một webview bị
       * khoá, ta **không thể biết** lệnh tải có chạy hay không.
       *
       * Không đoán, và cũng không im lặng: mở sẵn khối đường vòng kèm câu "nếu
       * không thấy ảnh tải về…". Người dùng ở trình duyệt bình thường thấy dòng
       * xác nhận là đủ và bỏ qua khối này; người trong Zalo có ngay lối khác mà
       * không phải quay lại hỏi.
       */
      if (lacksSystemShare()) setIsRestrictedBrowser(true);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/*
        ── ẢNH XEM TRƯỚC, LUÔN HIỆN — DEC-064 ────────────────────────────────

        Người dùng yêu cầu trực tiếp: *"cách hiển thị ảnh trước khi gửi cho người
        dùng coi trước tôi rất thích"*. Nó không chỉ dễ chịu mà còn sửa một lỗi
        thật của bản trước: nhãn nút phải gánh việc nói "đây là tấm nào" (DEC-058),
        còn nay tấm ảnh tự nói. Nút quay về mô tả **hành động**.

        Ảnh trỏ vào `?view=1` (route trả `inline`) chứ KHÔNG dùng `blob:` đã nạp
        trước — cố ý. `blob:` phải chờ `fetch` xong mới có, tức là khối này sẽ
        nhảy vào giữa trang sau một quãng; còn `<img>` với URL thật thì trình
        duyệt tự lo, giữ đúng chỗ nhờ `aspect-9/16`. Đổi lại là **hai lượt dựng
        ảnh** mỗi lượt xem trang (một cho `<img>`, một cho blob của nút Zalo) —
        cái giá đã cân nhắc và chấp nhận, xem DEC-064.
      */}
      <figure className="flex flex-col items-center gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- `next/image`
            sẽ đẩy ảnh qua bộ tối ưu `/_next/image`, tức là để một tấm ảnh
            `private, no-store` của MỘT người đi qua một lớp cache dùng chung
            (DEC-021). Ảnh này cũng đã đúng kích thước nên không có gì để tối ưu. */}
        <img
          src={shareImageViewPath(reportId)}
          alt={`Ảnh báo cáo dọc 9:16 — ${fileName}`}
          width={1080}
          height={1920}
          className="aspect-9/16 w-full max-w-56 rounded-lg border border-border/70 bg-card object-contain shadow-sm"
          // Webview có thể chặn cả việc hiển thị. Không bắt được lỗi thì người
          // dùng nhìn một ô vỡ và không hiểu vì sao (ISSUE-003).
          onError={() => {
            setIsRestrictedBrowser(true);
            setError(PREVIEW_BLOCKED_HINT);
          }}
        />
        <figcaption className="text-center text-xs text-muted-foreground">
          Ảnh sẽ gửi đi — xem lại trước khi bấm nút bên dưới.
        </figcaption>
      </figure>

      {/*
        PHASE 13 (DEC-053) — biến thể `accent` (cam logo, chữ TỐI 8,17:1).

        Đây là nơi DUY NHẤT trong sản phẩm dùng màu cam làm nền nút, và có lý do:
        xuất ảnh là hành động "khoe kết quả sau khi đã xong việc", khác hẳn về
        bản chất với CTA điều hướng. Luật `primary-action` chỉ cho MỘT CTA chính
        mỗi màn hình — cam ở đây không tranh chỗ với nút xanh, nó nói một câu
        khác. Chữ trắng trên cam chỉ 2,19:1 nên BỊ CẤM (DEC-046).

        PHASE 14 (DEC-062 + DEC-064) — điện thoại có HAI nút cho HAI đích đến
        khác nhau, và **cả hai đều bấm-một-cái-là-xong**:

          • Gửi qua Zalo → bảng chia sẻ của máy, chọn Zalo / Messenger / Telegram…
          • Tải ảnh về máy → file vào thư mục Tải xuống

        Không nút nào bắt người dùng nhấn giữ hay học một thao tác mới — đó là
        điều người dùng yêu cầu thẳng ở DEC-064.
      */}
      <div className={TOUCH_ONLY}>
        <Button
          variant="accent"
          size="lg"
          onClick={handleSendToZalo}
          disabled={isBusy}
          loading={busyAction === 'share'}
          loadingText="Đang chuẩn bị ảnh để gửi…"
        >
          <Send aria-hidden="true" className="size-5" />
          {SEND_TO_ZALO_LABEL[variant]}
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={handleDownload}
          disabled={isBusy}
          loading={busyAction === 'download'}
          loadingText="Đang tải ảnh về máy…"
        >
          <Download aria-hidden="true" className="size-5" />
          {DOWNLOAD_IMAGE_LABEL}
        </Button>
      </div>

      <div className={MOUSE_ONLY}>
        <Button
          variant="accent"
          size="lg"
          onClick={handleDownload}
          disabled={isBusy}
          loading={busyAction === 'download'}
          loadingText="Đang tạo tệp ảnh…"
        >
          <Download aria-hidden="true" className="size-5" />
          {DOWNLOAD_IMAGE_LABEL}
        </Button>
      </div>

      {error !== null && (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      )}

      {hint !== null && (
        <p role="status" className="text-center text-sm text-muted-foreground">
          {hint}
        </p>
      )}

      {/*
        ── KHỐI ĐƯỜNG VÒNG CHO WEBVIEW BỊ KHOÁ — ISSUE-003 ───────────────────

        Chỉ hiện khi trình duyệt **thiếu Web Share** trên một máy cảm ứng, tức
        gần như chắc chắn đang ở trong một in-app browser (Zalo, Facebook…).
        Trên trình duyệt bình thường khối này không bao giờ xuất hiện, nên nó
        không làm rối màn hình của đa số người dùng.

        Thứ tự hai đường là cố ý: **sao chép trước**, vì nó giữ người dùng ở
        trong Zalo — họ đang ở đó và việc họ muốn là gửi cho khách ngay. "Mở
        bằng trình duyệt" là đường chắc chắn chạy nhưng bắt họ rời ứng dụng.
      */}
      {isRestrictedBrowser && (
        <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-status-info-bg p-3">
          <p className="text-sm font-semibold text-heading">
            Bạn đang mở trong ứng dụng khác (Zalo, Facebook…)
          </p>
          <p className="text-sm text-foreground">
            Trình duyệt trong ứng dụng chặn tải ảnh và chia sẻ. Hai cách dưới đây vẫn dùng được.
          </p>

          {canCopyImage() && (
            <Button
              variant="primary"
              size="lg"
              onClick={handleCopyImage}
              disabled={isBusy}
              loading={busyAction === 'copy'}
              loadingText="Đang sao chép ảnh…"
            >
              <Copy aria-hidden="true" className="size-5" />
              Sao chép ảnh để dán vào Zalo
            </Button>
          )}

          <p className="text-sm text-foreground">
            Hoặc bấm{' '}
            <span className="font-semibold" aria-hidden="true">
              ⋮
            </span>{' '}
            /{' '}
            <span className="font-semibold" aria-hidden="true">
              •••
            </span>{' '}
            <span className="sr-only">nút thực đơn</span> ở góc trên màn hình rồi chọn{' '}
            <span className="font-semibold">“Mở trong trình duyệt”</span> (Android) hoặc{' '}
            <span className="font-semibold">“Mở trong Safari”</span> (iPhone) — ở đó mọi thứ chạy
            bình thường.
          </p>
        </div>
      )}

      {/*
        Lối thoát KHÔNG cần JavaScript — nguyên tắc (c) của DEC-060, nay trỏ vào
        chế độ XEM (DEC-061).

        Trước đây link này trỏ vào chế độ tải: mở ra một tab trắng rồi file rơi
        vào thư mục Tải xuống — đúng cái bẫy của ISSUE-029, và nó làm hỏng luôn
        ý nghĩa của một "lối thoát". Nay nó HIỆN ảnh, nên vẫn chạy được cả khi
        webview chặn hết automation (ISSUE-003 — trình duyệt trong Zalo) mà lại
        dẫn thẳng tới thao tác nhấn giữ để lưu. `min-h-11` để vùng chạm đạt 44px
        như mọi mục tiêu chạm khác (NFR-007).

        ⚠ Nhãn cố ý nói về **tab mới** — đó là điều khác biệt duy nhất so với hai
        nút bên trên, và nói đúng điều khác biệt thì người dùng không phải đoán.
      */}
      <a
        href={shareImageViewPath(reportId)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center justify-center gap-1.5 text-sm font-medium text-primary"
      >
        <ExternalLink aria-hidden="true" className="size-4" />
        Mở ảnh ở tab mới
      </a>

      {/*
        Câu này nói **hai nút khác nhau ở đâu**, không dạy thao tác nào cả —
        DEC-064. Bản trước bảo người dùng "nhấn giữ vào ảnh rồi chọn Lưu ảnh", và
        đó đúng là thứ họ bác: một thao tác ẩn mà người không rành máy không biết.

        Nói "Tải xuống" và "Thư viện ảnh" là hai chỗ khác nhau vẫn cần thiết —
        đó chính là hiểu lầm đã sinh ra ISSUE-029.
      */}
      <p className="text-center text-xs text-muted-foreground">
        Ảnh dọc 9:16. “Tải ảnh” cất file vào thư mục Tải xuống của máy; muốn ảnh nằm trong Thư viện
        ảnh thì bấm “Gửi qua Zalo” rồi chọn “Lưu ảnh” trong bảng hiện ra.
      </p>
    </div>
  );
}
