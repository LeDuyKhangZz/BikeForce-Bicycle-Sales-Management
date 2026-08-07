import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = {
  /** Trùng `id` của control bên trong — nếu lệch thì `<label for>` vô nghĩa. */
  id: string;
  label: string;
  required?: boolean;
  /** Luôn hiển thị, không nhét vào placeholder (rule input-helper-text). */
  helperText?: string;
  error?: string;
  /** Bộ đếm ký tự, chỉ hiện khi sắp chạm giới hạn. */
  counter?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Bố cục chuẩn của một ô nhập: label trên, control giữa, helper + lỗi dưới.
 *
 * Gom lại một chỗ để không có màn hình nào "quên" đặt lỗi ngay dưới field
 * (`error-placement`) hay quên `role="alert"` (`aria-live-errors`).
 *
 * Primitive này KHÔNG biết nghiệp vụ: nó không biết field nào bắt buộc, giới hạn
 * bao nhiêu ký tự, hay thông báo lỗi nói gì (AGENTS.md §4).
 *
 * Quy ước id dùng chung với `features/`:
 *   • lỗi   → `${id}-error`
 *   • helper → `${id}-helper`
 * Nơi gọi ghép hai chuỗi đó vào `aria-describedby` của control.
 */
export function FormField({
  id,
  label,
  required,
  helperText,
  error,
  counter,
  children,
  className,
}: Props) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>

      {children}

      {(helperText || counter) && (
        <div className="flex items-start justify-between gap-3">
          {helperText ? (
            <p id={`${id}-helper`} className="text-xs text-muted-foreground">
              {helperText}
            </p>
          ) : (
            <span />
          )}
          {counter && <p className="tabular shrink-0 text-xs text-muted-foreground">{counter}</p>}
        </div>
      )}

      {/* Trạng thái lỗi không bao giờ chỉ bằng màu — luôn kèm icon + chữ. */}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-sm text-destructive"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
