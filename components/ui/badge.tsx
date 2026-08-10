import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * `tone` là từ vựng TRÌNH BÀY, cố ý không phải `AchievementStatus`.
 * Primitive không được biết nghiệp vụ (AGENTS.md §4), nên việc ánh xạ
 * `EXCEEDED | NEAR | MISSED | PENDING` → tone + icon + nhãn tiếng Việt nằm ở
 * `features/`, dựa trên `getAchievementStatus()` của `lib/kpi.ts` (BR-023).
 * Giao diện KHÔNG BAO GIỜ tự quyết ngưỡng 80% / 100%.
 */
type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

type Props = Omit<ComponentProps<'span'>, 'children'> & {
  tone?: Tone;
  /** Icon Lucide. KHÔNG dùng emoji làm icon (rule no-emoji-icons). */
  icon?: ReactNode;
  /** Nhãn chữ — BẮT BUỘC. Trạng thái không bao giờ chỉ truyền tải bằng màu. */
  children: ReactNode;
};

/**
 * Cặp nền/chữ đã ĐO contrast — docs/05 §4.4, DEC-046.
 *
 * ⚠ Mỗi dòng là MỘT CẶP. Đừng lấy `bg-` của dòng này ghép với `text-` của dòng
 * khác, và đừng ghép `text-primary` lên các nền này — phép ghép chéo đó đã làm
 * đỏ 9 lượt quét axe ở `desktop-1440` sau DEC-046 (xem `features/navigation/main-nav.tsx`).
 */
const TONE_CLASS: Record<Tone, string> = {
  success: 'bg-status-exceeded-bg text-status-exceeded-fg', // 6.49:1
  warning: 'bg-status-near-bg text-status-near-fg', // 6.37:1
  danger: 'bg-status-missed-bg text-status-missed-fg', // 6.80:1
  neutral: 'bg-status-pending-bg text-status-pending-fg', // 9.45:1
  info: 'bg-status-info-bg text-status-info-fg', // 7.99:1
};

export function Badge({ tone = 'neutral', icon, className, children, ...props }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium',
        TONE_CLASS[tone],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}
