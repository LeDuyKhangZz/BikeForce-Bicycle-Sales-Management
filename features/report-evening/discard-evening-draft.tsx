'use client';

import { useEffect } from 'react';

import { eveningDraftKey } from '@/lib/reports/draft-keys';

type Props = {
  /** Ngày nghiệp vụ VN do server tính (BR-005). */
  today: string;
};

/**
 * Dọn draft cuối ngày sau khi báo cáo đã `COMPLETED` — FR-035.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO VIỆC NÀY KHÔNG NẰM TRONG `EveningReportForm`
 * ─────────────────────────────────────────────────────────────────────────
 *  Chỗ tự nhiên để xoá draft là `useEffect` bắt `state.ok` của form — và Phase 3
 *  làm đúng như vậy cho form đầu ngày. Với form cuối ngày thì **không chạy**:
 *  `saveEveningReport` kết thúc bằng `redirect()`, mà điều hướng do server phát
 *  ra làm form unmount trước khi effect kịp commit. Đã đo thật trên Chromium ở
 *  Phase 4 — draft còn nguyên trong localStorage sau khi lưu thành công.
 *
 *  Đặt việc dọn ở đây vừa deterministic vừa đúng nghĩa hơn: **báo cáo hôm nay đã
 *  hoàn tất ⇒ không còn bản nháp cuối ngày nào của hôm nay còn ý nghĩa.** Nó
 *  đúng cho cả trường hợp người dùng hoàn tất ở một tab khác, hay hoàn tất ở
 *  điện thoại rồi mở lại trên máy tính.
 *
 *  Component **không render gì** — nó chỉ có tác dụng phụ, và tác dụng phụ đó
 *  cần một client component vì `localStorage` không tồn tại ở server.
 */
export function DiscardEveningDraft({ today }: Props) {
  useEffect(() => {
    try {
      window.localStorage.removeItem(eveningDraftKey(today));
    } catch {
      // Safari chế độ riêng tư ném lỗi khi chạm localStorage. Không dọn được
      // draft là chuyện nhỏ; làm vỡ trang Hôm nay là chuyện lớn.
    }
  }, [today]);

  return null;
}
