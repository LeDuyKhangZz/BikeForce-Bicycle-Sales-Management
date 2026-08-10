import { Clock, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

import { Badge } from '@/components/ui/badge';
import { achievementLabel, type AchievementResult, type AchievementStatus } from '@/lib/kpi';

/**
 * Badge trạng thái của một chỉ tiêu — BR-023.
 *
 * Chia trách nhiệm đúng như chú thích đầu `components/ui/badge.tsx`:
 *   • NGƯỠNG và NHÃN là nghiệp vụ → `lib/kpi.ts` (`getAchievementStatus`,
 *     `achievementLabel`). Component này KHÔNG có một câu `if (pct >= 80)` nào.
 *   • MÀU và ICON là trình bày → ánh xạ ở đây, trong `features/`.
 *
 * Trạng thái KHÔNG BAO GIỜ chỉ truyền tải bằng màu: luôn icon + chữ
 * (rule no-color-only-status, NFR-013). Không dùng emoji làm icon.
 */

type Tone = 'success' | 'warning' | 'danger' | 'neutral';

/**
 * Ánh xạ trạng thái → tone. **Export** từ PHASE 13 để `ProgressBar` tô cùng
 * một màu với badge đứng ngay cạnh nó — hai thứ nói về cùng một chỉ tiêu mà
 * lệch màu thì người dùng sẽ tưởng đó là hai thông tin khác nhau.
 */
export const STATUS_TONE: Record<AchievementStatus, Tone> = {
  EXCEEDED: 'success',
  NEAR: 'warning',
  MISSED: 'danger',
  PENDING: 'neutral',
};

const STATUS_ICON: Record<AchievementStatus, ComponentType<SVGProps<SVGSVGElement>>> = {
  EXCEEDED: TrendingUp,
  NEAR: Minus,
  MISSED: TrendingDown,
  PENDING: Clock,
};

type Props = {
  result: AchievementResult;
};

export function AchievementBadge({ result }: Props) {
  const Icon = STATUS_ICON[result.status];
  const label = achievementLabel(result);

  return (
    <Badge tone={STATUS_TONE[result.status]} icon={<Icon aria-hidden="true" className="size-4" />}>
      {/*
        Khi PENDING, `display` là '—' và cột "Thực đạt" đã hiện đúng dấu đó rồi;
        lặp lại thành "— · Chờ số liệu" chỉ thêm nhiễu. Các trạng thái còn lại
        đều mang một con số đáng đọc ('125,0%', '+3 xe') nên hiện cả hai.
      */}
      {result.status !== 'PENDING' && (
        <span className="tabular font-semibold">{result.display}</span>
      )}
      <span>{label}</span>
    </Badge>
  );
}
