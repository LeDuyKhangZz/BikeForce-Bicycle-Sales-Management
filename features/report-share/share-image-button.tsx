'use client';

import { useState } from 'react';
import { Image as ImageIcon, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { REPORT_MESSAGES } from '@/lib/reports/messages';
import { SHARE_IMAGE_LABEL, shareImagePath, type ShareCardVariant } from '@/lib/reports/share-card';

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
 *  **(c) Luôn có một lối thoát KHÔNG cần JavaScript.** Link "Mở ảnh trực tiếp"
 *  bên dưới là một thẻ `<a>` thuần trỏ vào chính route ảnh. Nếu mọi automation
 *  phía trên bị webview chặn, người dùng vẫn lấy được ảnh bằng một lần chạm.
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
 * Share sheet chỉ có nghĩa trên thiết bị cảm ứng.
 *
 * `pointer: coarse` = con trỏ chính là ngón tay. Đây là **feature detection**
 * đúng nghĩa, khác hẳn việc đọc `userAgent`: nó trả lời đúng câu ta cần hỏi —
 * "máy này có phải cái người dùng cầm trên tay và có Zalo cài sẵn không".
 *
 * Trên Chrome Windows, `navigator.canShare({files})` trả `true` nhưng share sheet
 * của Windows **không có Zalo** — người dùng đã báo đúng chuyện này.
 */
function prefersShareSheet(): boolean {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

export function ShareImageButton({ reportId, fileName, variant }: Props) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

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

  async function handleExport() {
    setIsBusy(true);
    setError(null);
    setHint(null);

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

        setError(message);
        return;
      }

      // Phòng thủ cho đúng lỗi đã xảy ra thật ở Phase 6 (ISSUE-015): nếu có lớp
      // nào đó redirect request này sang một trang HTML, `fetch` đi theo redirect
      // và `response.ok` vẫn là `true`. Không kiểm kiểu nội dung thì người dùng
      // nhận một file `.png` chứa HTML.
      if (!response.headers.get('content-type')?.startsWith(PNG_MIME)) {
        setError(REPORT_MESSAGES.IMAGE_FAILED);
        return;
      }

      const blob = await response.blob();

      /*
       * ── THIẾT BỊ CẢM ỨNG ────────────────────────────────────────────────
       * Thử share sheet trước (mục tiêu thật của tính năng là Zalo). Hỏng thì
       * **ĐIỀU HƯỚNG THẬT**, KHÔNG dùng `<a download>`.
       *
       * Vì sao không dùng `<a download>` ở đây: iOS Safari và nhiều webview
       * Android **bỏ qua** thuộc tính `download` với `blob:` mà không báo lỗi
       * gì — và `'download' in anchor` vẫn trả `true` nên không thể phát hiện
       * bằng feature detection. Đó đúng là cái bẫy đã làm người dùng bấm nút mà
       * "chả có chuyện gì xảy ra". Một điều hướng thật thì không thể im lặng:
       * server đã đặt `Content-Disposition: attachment` nên trình duyệt buộc
       * phải hoặc tải file, hoặc hiện bảng chọn của nó.
       */
      if (prefersShareSheet()) {
        const file = new File([blob], fileName, { type: PNG_MIME });

        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: fileName });
            return;
          } catch (shareError) {
            // Người dùng bấm huỷ share sheet — KHÔNG phải lỗi, không báo gì cả.
            if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
            // Mọi lỗi khác rơi xuống điều hướng bên dưới. Hay gặp nhất là
            // `NotAllowedError`: thao tác chạm đã hết hiệu lực trong lúc chờ
            // server dựng ảnh — iOS Safari đặc biệt nghiêm về điều này.
          }
        }

        window.location.href = shareImagePath(reportId);
        return;
      }

      /*
       * ── MÁY TÍNH CÓ CHUỘT ───────────────────────────────────────────────
       * Tải bằng blob đã có sẵn: không tốn thêm một lượt dựng ảnh, và giữ được
       * dòng xác nhận. Mọi trình duyệt máy tính đều tôn trọng `download`.
       */
      if (downloadBlob(blob)) {
        setHint(DOWNLOADED_HINT);
        return;
      }

      window.location.href = shareImagePath(reportId);
    } catch {
      // Mất mạng giữa chừng, hoặc trình duyệt chặn `fetch`.
      setError(REPORT_MESSAGES.IMAGE_FAILED);
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
      */}
      <Button variant="accent" size="lg" onClick={handleExport} disabled={isBusy} aria-busy={isBusy}>
        <ImageIcon aria-hidden="true" className="size-5" />
        {isBusy ? 'Đang tạo ảnh…' : SHARE_IMAGE_LABEL[variant]}
      </Button>

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
        Lối thoát KHÔNG cần JavaScript — nguyên tắc (c) của DEC-060.

        Một thẻ `<a>` thuần trỏ thẳng vào route ảnh. Nếu webview chặn hết mọi
        automation phía trên (đúng bối cảnh ISSUE-003 — Zalo in-app browser),
        đây vẫn là một đường lấy ảnh chạy được bằng một lần chạm. `min-h-11` để
        vùng chạm đạt 44px như mọi mục tiêu chạm khác (NFR-007).
      */}
      <a
        href={shareImagePath(reportId)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center justify-center gap-1.5 text-sm font-medium text-primary"
      >
        <ExternalLink aria-hidden="true" className="size-4" />
        Mở ảnh trực tiếp
      </a>

      <p className="text-center text-xs text-muted-foreground">
        Ảnh dọc 9:16, tải về hoặc gửi thẳng qua Zalo.
      </p>
    </div>
  );
}
