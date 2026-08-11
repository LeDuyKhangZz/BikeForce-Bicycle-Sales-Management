'use client';

import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, ExternalLink, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { REPORT_MESSAGES } from '@/lib/reports/messages';
import {
  SAVE_TO_GALLERY_LABEL,
  SEND_TO_ZALO_LABEL,
  SHARE_IMAGE_LABEL,
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

/** Khi không có bảng chia sẻ ⇒ ta hiện thẳng ảnh ra trong trang. */
const LONG_PRESS_HINT = 'Nhấn giữ vào ảnh bên dưới rồi chọn “Lưu ảnh” để lưu vào Thư viện.';

/**
 * Khi máy không mở được bảng chia sẻ — hay gặp nhất trong webview của Zalo.
 *
 * Câu này phải nói đủ **cả ba bước**, vì đây là lúc người dùng mất phương hướng
 * nhất: lưu ảnh ⇢ mở Zalo ⇢ gửi ảnh vừa lưu. Nói mỗi "không gửi được" là đẩy họ
 * về đúng chỗ đã sinh ra ISSUE-029.
 */
const ZALO_MANUAL_HINT =
  'Máy không mở được bảng chia sẻ. Nhấn giữ vào ảnh bên dưới để lưu, rồi mở Zalo và gửi ảnh đó.';

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
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  /**
   * Hiện tấm ảnh thật ngay trong trang — DEC-061.
   *
   * Không hiện sẵn từ đầu. Thẻ `<img>` trỏ vào `?view=1` nên nó là **một lượt
   * dựng Satori nữa**, tách hẳn với blob đã nạp trước cho bảng chia sẻ — cố ý,
   * vì thao tác "Lưu ảnh" khi nhấn giữ cần một URL http thật (xem chú thích tại
   * chỗ render). Phần lớn lượt bấm đi thẳng vào bảng chia sẻ và không cần tới
   * nó, nên chỉ dựng khi người dùng chủ động xin, hoặc khi đó là đường duy nhất
   * còn lại.
   */
  const [isPreviewShown, setIsPreviewShown] = useState(false);

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
    setIsBusy(true);
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

      // Webview không có Web Share (hay gặp: trình duyệt trong Zalo, Firefox
      // Android). Vẫn phải kết thúc bằng một thứ dùng được, không phải im lặng.
      setIsPreviewShown(true);
      setHint(ZALO_MANUAL_HINT);
    } finally {
      setIsBusy(false);
    }
  }

  /**
   * ── ĐIỆN THOẠI, NÚT 2: LƯU VÀO THƯ VIỆN ẢNH ─────────────────────────────
   *
   * Không `fetch`, không chờ, không blob: chỉ hiện thẻ `<img>` trỏ vào `?view=1`
   * rồi nói người dùng nhấn giữ. Trang web **không ghi được vào Thư viện ảnh**
   * (DEC-061), nên "lưu" ở đây thật sự là "đưa bạn tới đúng thao tác lưu" —
   * thao tác đó có trên cả Android ("Tải ảnh xuống") lẫn iOS ("Thêm vào Ảnh").
   */
  function handleSaveToGallery() {
    setError(null);
    setHint(LONG_PRESS_HINT);
    setIsPreviewShown(true);
  }

  /**
   * ── MÁY TÍNH CÓ CHUỘT: TẢI FILE ─────────────────────────────────────────
   *
   * Không bao giờ gọi share sheet — trên Chrome Windows nó mở một bảng **không
   * hề có Zalo** (DEC-060). Máy tính cũng không có "thư viện ảnh", nên ở đây chỉ
   * còn đúng một việc: tải file về.
   */
  async function handleDownload() {
    setIsBusy(true);
    setError(null);
    setHint(null);

    try {
      const result = await takeShareImage();

      if (!result.ok) {
        setError(result.message);
        return;
      }

      if (downloadBlob(result.blob)) {
        setHint(DOWNLOADED_HINT);
        return;
      }

      window.location.href = shareImagePath(reportId);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/*
        PHASE 13 (DEC-053) — biến thể `accent` (cam logo, chữ TỐI 8,17:1).

        Đây là nơi DUY NHẤT trong sản phẩm dùng màu cam làm nền nút, và có lý do:
        xuất ảnh là hành động "khoe kết quả sau khi đã xong việc", khác hẳn về
        bản chất với CTA điều hướng. Luật `primary-action` chỉ cho MỘT CTA chính
        mỗi màn hình — cam ở đây không tranh chỗ với nút xanh, nó nói một câu
        khác. Chữ trắng trên cam chỉ 2,19:1 nên BỊ CẤM (DEC-046).

        PHASE 14 (DEC-062) — trên điện thoại chỗ này là HAI nút. Việc "gửi cho
        người khác" và việc "cất lại cho mình" là hai ý định khác nhau, và mỗi
        cái đi một đường kỹ thuật hoàn toàn khác. Gộp làm một nút thì người dùng
        phải đoán, mà đoán sai thì đúng bằng ISSUE-029. Chỉ nút Zalo giữ màu cam:
        nó vẫn là một CTA duy nhất, nút còn lại là `secondary`.
      */}
      <div className={TOUCH_ONLY}>
        <Button
          variant="accent"
          size="lg"
          onClick={handleSendToZalo}
          disabled={isBusy}
          aria-busy={isBusy}
        >
          <Send aria-hidden="true" className="size-5" />
          {isBusy ? 'Đang tạo ảnh…' : SEND_TO_ZALO_LABEL[variant]}
        </Button>

        <Button variant="secondary" size="lg" onClick={handleSaveToGallery}>
          <ImageIcon aria-hidden="true" className="size-5" />
          {SAVE_TO_GALLERY_LABEL}
        </Button>
      </div>

      <div className={MOUSE_ONLY}>
        <Button
          variant="accent"
          size="lg"
          onClick={handleDownload}
          disabled={isBusy}
          aria-busy={isBusy}
        >
          <ImageIcon aria-hidden="true" className="size-5" />
          {isBusy ? 'Đang tạo ảnh…' : SHARE_IMAGE_LABEL[variant]}
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
        ẢNH THẬT NGAY TRONG TRANG — DEC-061.

        Đây là đường vào Thư viện ảnh khi bảng chia sẻ không dùng được. Không có
        cách nào khác: `<a download>`, `Content-Disposition: attachment` và mọi
        biến thể của chúng đều chỉ đẩy file vào thư mục Tải xuống.

        Ảnh trỏ vào `?view=1` (route trả `inline`) chứ KHÔNG dùng `blob:` của
        lượt `fetch` vừa rồi — cố ý. Thao tác "Lưu ảnh" khi nhấn giữ chạy ổn
        định với URL http thật trên cả Chrome Android lẫn Safari iOS, còn với
        `blob:` thì tuỳ phiên bản, và đây đúng là chỗ không được phép "tuỳ".
      */}
      {isPreviewShown && (
        <figure className="flex flex-col items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- `next/image`
              sẽ đẩy ảnh qua bộ tối ưu `/_next/image`, tức là để một tấm ảnh
              `private, no-store` của MỘT người đi qua một lớp cache dùng chung
              (DEC-021). Ảnh này cũng đã đúng kích thước và chỉ hiện sau một lần
              chạm, nên không có gì để `next/image` tối ưu. */}
          <img
            src={shareImageViewPath(reportId)}
            alt={`Ảnh báo cáo dọc 9:16 — ${fileName}`}
            width={1080}
            height={1920}
            className="w-full max-w-60 rounded-lg border border-border/70 shadow-sm"
          />
          <figcaption className="text-center text-xs text-muted-foreground">
            Ảnh thật 1080×1920 — nhấn giữ vào ảnh để lưu.
          </figcaption>
        </figure>
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

        ⚠ Nhãn cố ý nói về **tab mới**, không nói về thư viện — nút "Lưu vào thư
        viện ảnh" ngay trên đã nhận câu đó rồi. Hai nhãn gần trùng nghĩa đứng
        cạnh nhau buộc người dùng phải đoán xem chúng khác gì nhau, và đây là
        chỗ họ đang bối rối sẵn (ISSUE-029). Nhãn này trả lời đúng điều khác
        biệt duy nhất: nó rời khỏi trang.
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
        Câu này nói thẳng giới hạn của nền tảng thay vì để người dùng tự khám phá
        ra bằng cách đi tìm file — đó chính là ISSUE-029. Nó đúng cho cả Android
        lẫn iOS, nên không tách hai câu theo hệ điều hành.

        Giữ MỘT câu: phần "Gửi qua Zalo mở bảng chia sẻ" đã nằm ở `SHARED_HINT`,
        hiện ra đúng lúc người dùng vừa bấm — nói trước ở đây nữa thành ra một
        khối chữ bốn dòng mà không ai đọc.
      */}
      <p className="text-center text-xs text-muted-foreground">
        Ảnh dọc 9:16. Trình duyệt không tự cất ảnh vào Thư viện được — muốn lưu thì nhấn giữ vào ảnh
        rồi chọn “Lưu ảnh”.
      </p>
    </div>
  );
}
