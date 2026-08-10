'use client';

import { useLinkStatus } from 'next/link';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Vòng xoay "đang mở trang" cho một `<Link>` — PHASE 13, nhóm A.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO CẦN
 * ─────────────────────────────────────────────────────────────────────────
 *  Người dùng nói "chưa có hiệu ứng loading". Dự án ĐÃ có `loading.tsx` cho mỗi
 *  route, nhưng `loading.tsx` chỉ hiện SAU khi Next bắt đầu render trang đích.
 *  Trên 4G ngoài thị trường, quãng từ lúc chạm tới lúc đó có thể vài trăm mili
 *  giây và màn hình **không nhúc nhích** — Sales sẽ bấm lại lần hai.
 *
 *  Bộ luật `ui-ux-pro-max` gọi đây là `tap-feedback-speed`: mọi thao tác phải có
 *  phản hồi thấy được trong < 100 ms. `useLinkStatus()` của Next cho đúng tín
 *  hiệu đó, và nó bật NGAY khi chạm chứ không đợi mạng.
 *
 *  ⚠ Hook này CHỈ chạy khi component nằm BÊN TRONG một `<Link>` — đó là hợp đồng
 *  của `useLinkStatus`. Đặt ra ngoài thì `pending` mãi mãi `false`, không có lỗi
 *  nào được ném ra, và bug sẽ rất khó thấy.
 *
 *  Chuyển động là `rotate` thuần (transform) nên không vi phạm luật "không thêm
 *  animation ngoài transform/opacity" của CLAUDE.md §11. `prefers-reduced-motion`
 *  được tôn trọng ở `globals.css`, không phải ở đây.
 */
export function LinkSpinner({ className }: { className?: string }) {
  const { pending } = useLinkStatus();

  if (!pending) return null;

  return (
    <Loader2
      aria-hidden="true"
      className={cn('size-4 shrink-0 animate-spin motion-reduce:animate-none', className)}
    />
  );
}
