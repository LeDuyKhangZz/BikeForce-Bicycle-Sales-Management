'use client';

import { useEffect } from 'react';

import { morningDraftKey } from '@/lib/reports/draft-keys';

type Props = {
  /** Ngày nghiệp vụ VN do server tính (BR-005). */
  today: string;
};

/**
 * Dọn draft đầu ngày sau khi cam kết sáng đã được gửi — FR-035.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO VIỆC NÀY KHÔNG NẰM TRONG `MorningReportForm`
 * ─────────────────────────────────────────────────────────────────────────
 *  Tới hết PHASE 13 nó **có** nằm trong form: `useEffect` bắt `state.ok` rồi gọi
 *  `clearDraft()`. Cách đó chết cùng **DEC-055**, và bộ E2E bắt được ngay lượt
 *  chạy đầu: từ khi `/sales/today/morning` biết tự `redirect()`, lần render lại
 *  RSC sau Server Action làm form **unmount trước khi effect kịp commit**.
 *
 *  Đây đúng là ISSUE-014 lặp lại ở luồng sáng, nên lời giải cũng lặp lại:
 *  `saveMorningReport` tự `redirect()` (DEC-037), còn việc dọn draft chuyển sang
 *  đây — một chỗ chắc chắn chạy được.
 *
 *  Điều kiện dọn cũng đúng nghĩa hơn: **hôm nay đã có cam kết sáng ⇒ không còn
 *  bản nháp đầu ngày nào của hôm nay còn ý nghĩa.** Nó đúng cả khi Sales gửi cam
 *  kết ở một tab khác, hay gửi trên điện thoại rồi mở lại trên máy tính.
 *
 *  Component **không render gì** — nó chỉ có tác dụng phụ, và tác dụng phụ đó cần
 *  một client component vì `localStorage` không tồn tại ở server.
 *
 *  Anh em song sinh: `features/report-evening/discard-evening-draft.tsx`. Hai file
 *  cố ý tách riêng vì điều kiện kích hoạt khác nhau (đã cam kết / đã hoàn tất) và
 *  khoá localStorage cũng khác nhau (`lib/reports/draft-keys.ts` — DEC-035).
 */
export function DiscardMorningDraft({ today }: Props) {
  useEffect(() => {
    try {
      window.localStorage.removeItem(morningDraftKey(today));
    } catch {
      // Safari chế độ riêng tư ném lỗi khi chạm localStorage. Không dọn được
      // draft là chuyện nhỏ; làm vỡ trang Hôm nay là chuyện lớn.
    }
  }, [today]);

  return null;
}
