import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * Bề mặt trắng trên nền `background` (#F4F7FA).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  PHASE 13 — vì sao đổi từ "viền mảnh" sang "bóng mềm" (DEC-053)
 * ─────────────────────────────────────────────────────────────────────────
 *  Bản cũ tách lớp bằng `border` #E3E9F0 — tỉ lệ tương phản so với nền chỉ
 *  **1,22:1**. Nghĩa là trên điện thoại ngoài nắng, ranh giới card gần như
 *  KHÔNG nhìn thấy, và toàn trang đọc ra một mảng trắng phẳng lì. Đó chính là
 *  thứ người dùng gọi là "xấu".
 *
 *  Bóng mềm hai lớp giải quyết đúng vấn đề đó mà không cần thêm một đường kẻ
 *  đậm nào: mắt nhận ra "khối nổi lên" bằng độ sáng, không bằng đường viền —
 *  và nó hoạt động cả ngoài nắng. Viền được giữ lại nhưng chỉ còn là lớp phụ.
 */
type CardProps = ComponentProps<'div'> & {
  /** Thêm phản hồi nâng nhẹ khi trỏ/chạm. CHỈ dùng cho card thật sự bấm được. */
  interactive?: boolean;
  /** Bỏ padding mặc định khi bên trong tự quản lý khoảng cách (ví dụ bảng). */
  flush?: boolean;
};

export function Card({ interactive, flush, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border/70 bg-card shadow-sm',
        flush ? '' : 'p-4',
        interactive &&
          'cursor-pointer transition-[box-shadow,transform] duration-200 ease-out-soft hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm motion-reduce:transform-none motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Tiêu đề card. `tracking-tight` là chi tiết nhỏ nhưng thấy được: Inter ở cỡ
 * lớn với letter-spacing mặc định đọc ra hơi rời rạc.
 */
export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('text-lg font-semibold tracking-tight text-heading', className)}
      {...props}
    />
  );
}

/**
 * Đầu card có VẠCH MÀU dẫn mắt — dùng cho các khối cần phân biệt nhanh khi
 * lướt. Vạch 3px thay cho việc tô nền cả tiêu đề: nó đủ để mắt bám vào mà
 * không thêm một cặp nền×chữ mới nào phải đo tương phản (bài học ISSUE-018).
 */
export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-wrap items-center justify-between gap-2', className)}
      {...props}
    />
  );
}
