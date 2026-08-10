import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatVietnamMonth, shiftVietnamMonth } from '@/lib/date';
import { salesHistoryPath } from '@/lib/reports/history-url';
import { cn } from '@/lib/utils';

/**
 * Bộ lọc tháng của `/sales/history` — FR-021.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO LÀ HAI LINK CHỨ KHÔNG PHẢI MỘT `<select>` 12 THÁNG
 * ─────────────────────────────────────────────────────────────────────────
 *  Sales xem lịch sử chủ yếu để đối chiếu tháng này với tháng trước — thao tác
 *  thật gần như luôn là "lùi một tháng". Hai nút mũi tên là **một chạm**, còn
 *  `<select>` trên điện thoại là ba (mở, cuộn, chọn). Và vì chúng là `<a>` thật
 *  nên back stack giữ nguyên, bookmark được, không cần một dòng JavaScript nào.
 *
 *  Component là Server Component: không state, không handler. Toàn bộ "tháng
 *  nào" nằm trên URL (`docs/05 §11` — `deep-linking`, `state-preservation`).
 *
 * Không có nút "về tháng hiện tại" riêng: khi đang ở tháng khác, nút **Tháng
 * sau** đưa về đúng đó, còn tab Lịch sử ở bottom nav luôn trỏ về mặc định.
 */

type Props = {
  /** `'YYYY-MM'` — đã được page chuẩn hoá, luôn hợp lệ tới đây. */
  month: string;
  /** Tháng nghiệp vụ hiện tại; dùng để chặn đi tới tương lai. */
  currentMonth: string;
};

export function MonthFilter({ month, currentMonth }: Props) {
  const previousMonth = shiftVietnamMonth(month, -1);
  const nextMonth = shiftVietnamMonth(month, 1);

  // BR-021 — không có báo cáo nào của tương lai, nên không cho đi tới đó. Vượt
  // quá tháng hiện tại chỉ dẫn tới một trang rỗng gây hoang mang.
  const canGoNext = nextMonth !== null && nextMonth <= currentMonth;

  return (
    <Card className="flex items-center justify-between gap-2 py-2">
      <MonthNavLink
        href={previousMonth === null ? null : salesHistoryPath({ month: previousMonth })}
        label="Tháng trước"
        icon={<ChevronLeft aria-hidden="true" className="size-5" />}
      />

      {/* `aria-live` để screen reader đọc tháng mới sau khi điều hướng. */}
      <p aria-live="polite" className="tabular text-base font-semibold text-heading">
        {formatVietnamMonth(month)}
      </p>

      <MonthNavLink
        href={canGoNext && nextMonth !== null ? salesHistoryPath({ month: nextMonth }) : null}
        label="Tháng sau"
        icon={<ChevronRight aria-hidden="true" className="size-5" />}
      />
    </Card>
  );
}

type MonthNavLinkProps = {
  /** `null` = không đi được. Render thành `<span>` thay vì link chết. */
  href: string | null;
  label: string;
  icon: React.ReactNode;
};

/**
 * Không export — chỉ dùng trong file này (AGENTS.md §4).
 *
 * Khi không đi được thì render `<span aria-disabled>` chứ **không** phải một
 * `<a>` không có `href`: một link không href vẫn nhận focus ở vài trình duyệt
 * và screen reader đọc nó như link bấm được.
 */
function MonthNavLink({ href, label, icon }: MonthNavLinkProps) {
  const className = cn(buttonClassName({ variant: 'ghost' }), 'min-w-11');

  if (href === null) {
    return (
      <span aria-disabled="true" className={cn(className, 'cursor-not-allowed opacity-45')}>
        {icon}
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <Link href={href} className={className}>
      {icon}
      {/* Nhãn chữ cho screen reader — icon một mình không nói được gì. */}
      <span className="sr-only">{label}</span>
    </Link>
  );
}
