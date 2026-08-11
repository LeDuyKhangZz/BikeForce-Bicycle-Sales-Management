'use client';

import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { REPORT_MESSAGES } from '@/lib/reports/messages';
import { SHARE_IMAGE_LABEL, shareImagePath, type ShareCardVariant } from '@/lib/reports/share-card';

/**
 * Nút xuất ảnh 9:16 — FR-017, FR-020, UC-08, DEC-011.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  BA ĐƯỜNG RA, THEO ĐÚNG THỨ TỰ ƯU TIÊN — DEC-011 + ISSUE-003
 * ─────────────────────────────────────────────────────────────────────────
 *  1. **Web Share API** khi `navigator.canShare({ files })` trả `true`. Mục
 *     tiêu thật của tính năng là "gửi lên Zalo": share sheet của hệ điều hành có
 *     sẵn Zalo, một chạm là xong.
 *  2. **`<a download>`** khi không hỗ trợ — desktop và phần lớn webview.
 *  3. **Mở ảnh ở tab mới** kèm câu hướng dẫn "nhấn giữ để lưu", khi cả hai
 *     đường trên đều bị chặn (ISSUE-003 biện pháp 2). Đây là hành vi người dùng
 *     Việt Nam đã quen và nó không phụ thuộc API nào.
 *
 *  **Feature detection, không sniff userAgent**: `canShare({ files })` là câu hỏi
 *  duy nhất trả lời đúng được "trình duyệt này có chia sẻ FILE được không" —
 *  nhiều webview có `navigator.share` nhưng từ chối `files`.
 *
 * Component này **không** quyết định có được xuất ảnh hay không, và cũng không
 * quyết định xuất ảnh NÀO. Cả hai đều suy ra từ `status` đã persist ở server —
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

/** Câu hướng dẫn của đường ra thứ ba — ISSUE-003. */
const LONG_PRESS_HINT = 'Đã mở ảnh ở tab mới. Nhấn giữ vào ảnh để lưu về máy.';

export function ShareImageButton({ reportId, fileName, variant }: Props) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

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
      const file = new File([blob], fileName, { type: PNG_MIME });

      // ── Đường 1: share sheet của hệ điều hành ────────────────────────────
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: fileName });
          return;
        } catch (shareError) {
          // Người dùng bấm huỷ share sheet — KHÔNG phải lỗi, không báo gì cả.
          if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
          // Mọi lỗi khác: rơi xuống đường 2 thay vì bỏ cuộc.
        }
      }

      // ── Đường 2: tải về ──────────────────────────────────────────────────
      const objectUrl = URL.createObjectURL(blob);

      try {
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = fileName;
        anchor.rel = 'noopener';
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
      } catch {
        // ── Đường 3: mở tab mới, hướng dẫn nhấn giữ ────────────────────────
        window.open(objectUrl, '_blank', 'noopener');
        setHint(LONG_PRESS_HINT);
      }

      // Nhả bộ nhớ của blob. Hoãn một nhịp vì tab vừa mở ở đường 3 cần URL còn
      // sống lúc nó bắt đầu tải.
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
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

      <p className="text-center text-xs text-muted-foreground">
        Ảnh dọc 9:16, tải về hoặc gửi thẳng qua Zalo.
      </p>
    </div>
  );
}
