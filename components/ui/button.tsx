import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'accent';
type Size = 'md' | 'lg';

type Props = ComponentProps<'button'> & {
  variant?: Variant;
  size?: Size;
};

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  PHASE 13 (DEC-053) — vì sao nút được vẽ lại
 * ─────────────────────────────────────────────────────────────────────────
 *  Bản cũ: nền phẳng một màu, không bóng, không đổi gì khi nhấn ngoài
 *  `scale(0.98)`. Trên điện thoại nó đọc ra như một mảng màu, không ra "vật
 *  bấm được". Luật `state-clarity` và `press-feedback` đòi các trạng thái phải
 *  **phân biệt được bằng mắt**, không chỉ tồn tại trong CSS.
 *
 *  Bản mới thêm ba thứ, tất cả đều rẻ và đều chỉ chạm `transform`/`box-shadow`:
 *    • chuyển sắc rất nhẹ (2 bậc của cùng một màu) ⇒ mặt nút có khối;
 *    • **bóng mang màu thương hiệu** cho nút chính ⇒ CTA nổi hẳn khỏi mặt giấy
 *      và mắt tìm thấy nó ngay, kể cả khi lướt nhanh;
 *    • khi nhấn thì bóng **xẹp xuống** cùng lúc với `scale` ⇒ cảm giác bị ấn
 *      thật, chứ không phải chỉ nhỏ lại.
 *
 *  `--color-accent` (cam logo) nay có biến thể nút riêng. Luật `primary-action`
 *  chỉ cho MỘT CTA chính mỗi màn hình, nên `accent` KHÔNG được dùng thay
 *  `primary` — nó dành cho hành động mang tính "thưởng" (xuất ảnh để khoe kết
 *  quả). Chữ trên nền cam là chữ TỐI (8,17:1); chữ trắng chỉ 2,19:1 và bị CẤM.
 */
const VARIANT_CLASS: Record<Variant, string> = {
  primary: cn(
    'bg-primary bg-linear-to-b from-white/12 to-transparent text-white',
    'shadow-brand-sm hover:bg-primary-hover hover:shadow-brand',
    'active:shadow-brand-sm',
  ),
  accent: cn(
    'bg-accent bg-linear-to-b from-white/25 to-transparent text-foreground',
    'shadow-sm hover:bg-accent-hover hover:shadow-md',
  ),
  secondary: cn(
    'border border-input-border/60 bg-card text-foreground',
    'shadow-xs hover:border-input-border hover:bg-background hover:shadow-sm',
  ),
  destructive: 'bg-destructive text-white shadow-sm hover:opacity-90 hover:shadow-md',
  ghost: 'bg-transparent text-primary hover:bg-status-info-bg',
};

/**
 * Touch target tối thiểu 44×44px (rule touch-target-size).
 * `lg` là chiều cao của sticky action bar full-width (docs/05).
 */
const SIZE_CLASS: Record<Size, string> = {
  md: 'min-h-11 rounded-md px-4 text-sm', // 44px
  lg: 'min-h-13 w-full rounded-lg px-6 text-base', // 52px — PHASE 13: 48 → 52
};

/**
 * Primitive KHÔNG biết nghiệp vụ (AGENTS.md §4): không import `services/`,
 * không nhận row của DB làm prop, chỉ nhận props nguyên thuỷ và `children`.
 *
 * Lớp CSS tách riêng để **link điều hướng** dùng chung được: một CTA đưa người
 * dùng sang trang khác phải là `<a>` thật (giữ được mở tab mới, giữ back stack,
 * đọc đúng bằng screen reader) nhưng vẫn phải trông và chạm giống hệt nút.
 */
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}): string {
  return cn(
    'relative inline-flex items-center justify-center gap-2 font-semibold',
    'transition-[transform,box-shadow,background-color,opacity] duration-200 ease-out-soft',
    'active:scale-[0.97]',
    'motion-reduce:transform-none motion-reduce:transition-none',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none',
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    className,
  );
}

export function Button({ variant = 'primary', size = 'md', className, type, ...props }: Props) {
  return (
    <button
      // Mặc định `type="button"`: quên `type` trong <form> sẽ vô tình submit.
      type={type ?? 'button'}
      className={buttonClassName({ variant, size, className })}
      {...props}
    />
  );
}
