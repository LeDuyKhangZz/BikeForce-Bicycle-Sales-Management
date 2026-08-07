import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost';
type Size = 'md' | 'lg';

type Props = ComponentProps<'button'> & {
  variant?: Variant;
  size?: Size;
};

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'bg-card text-foreground border border-input-border hover:bg-background',
  destructive: 'bg-destructive text-white hover:opacity-90',
  ghost: 'bg-transparent text-primary hover:bg-background',
};

/**
 * Touch target tối thiểu 44×44px (rule touch-target-size).
 * `lg` là chiều cao của sticky action bar full-width (docs/05).
 */
const SIZE_CLASS: Record<Size, string> = {
  md: 'min-h-11 px-4 text-sm', // 44px
  lg: 'min-h-12 px-6 text-base w-full', // 48px
};

/**
 * Primitive KHÔNG biết nghiệp vụ (AGENTS.md §4): không import `services/`,
 * không nhận row của DB làm prop, chỉ nhận props nguyên thuỷ và `children`.
 *
 * Trạng thái theo docs/05 §: hover đổi màu trong 150ms · active scale(0.98)
 * (không đổi layout bounds) · focus-visible ring 2px offset 2px (đặt global
 * trong globals.css) · disabled opacity 0.45 + cursor-not-allowed + thuộc tính
 * `disabled` thật.
 */
/**
 * Lớp CSS của nút, tách riêng để **link điều hướng** dùng chung được.
 *
 * Một CTA đưa người dùng sang trang khác phải là `<a>` thật (giữ được mở tab
 * mới, giữ được back stack, đọc đúng bằng screen reader), nhưng nó vẫn phải
 * trông và chạm giống hệt nút. Trả về chuỗi class thay vì dựng cơ chế `asChild`
 * — dự án không dùng Radix, và một hàm thuần thì không tốn runtime nào.
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
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
    'transition-[transform,background-color,opacity] duration-150',
    'active:scale-[0.98]',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45',
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
