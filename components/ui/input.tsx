import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

type Props = ComponentProps<'input'> & {
  invalid?: boolean;
};

/**
 * Ràng buộc bắt buộc (AGENTS.md §10 — touch & input):
 *   • `min-h-13` = **52px** — PHASE 13 nâng từ 48px. Sales nhập ngoài thị
 *     trường, một tay, thường đang đi bộ; 4px thêm vào là chênh lệch thật giữa
 *     chạm trúng và chạm hụt (rule `touch-friendly-input`, `no-precision-required`).
 *   • `text-base` = 16px — dưới 16px iOS Safari tự phóng to trang khi focus.
 *   • Viền dùng `input-border` (#64748B, 4.76:1), KHÔNG dùng `border`
 *     (#E3E9F0, 1.22:1 — không đạt ngưỡng 3:1 của WCAG 1.4.11 cho control).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  PHASE 13 (DEC-053) — ô nhập có NỀN CHÌM
 * ─────────────────────────────────────────────────────────────────────────
 *  Bản cũ: nền trắng trên card trắng, phân biệt bằng đúng một đường viền. Ô
 *  nhập vì thế không "mời gõ" — nó trông y hệt một khối chữ chỉ đọc.
 *
 *  Nay nền ô là `background` (#F4F7FA) chìm hơn card một bậc, và **bật lên
 *  trắng khi focus** cùng vòng sáng thương hiệu. Người dùng thấy rõ mình đang
 *  đứng ở ô nào — quan trọng với form 5 trường trên màn hình 375px.
 *
 *  Trường số phải được truyền thêm `inputMode="numeric"` + `pattern="[0-9]*"`
 *  từ phía gọi — primitive không đoán kiểu bàn phím thay nghiệp vụ.
 */
export function Input({ invalid, className, ...props }: Props) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        'min-h-13 w-full rounded-md border bg-background px-3.5 text-base text-foreground',
        'placeholder:text-muted-foreground',
        'transition-[background-color,border-color,box-shadow] duration-200 ease-out-soft',
        'focus:bg-card focus:shadow-brand-sm',
        'disabled:cursor-not-allowed disabled:opacity-45',
        invalid ? 'border-destructive bg-status-missed-bg/40' : 'border-input-border/70',
        className,
      )}
      {...props}
    />
  );
}
