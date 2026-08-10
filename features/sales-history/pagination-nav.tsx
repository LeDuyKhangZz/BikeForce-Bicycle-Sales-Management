import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import type { PageInfo } from '@/lib/reports/pagination';
import { cn } from '@/lib/utils';

/**
 * Thanh phân trang — NFR-002 (phân trang thực hiện **server-side**).
 *
 * Nhận `PageInfo` đã tính sẵn từ `lib/reports/pagination.ts`: component không
 * cộng trừ số trang nào, kể cả `page + 1` (AGENTS.md §1.3). Nhờ vậy trường hợp
 * biên khó chịu nhất — `?page=9` còn sót lại sau khi đổi sang tháng chỉ có 1
 * trang — đã được kẹp từ tầng dưới và có unit test khoá lại.
 *
 * `buildHref` do nơi gọi truyền vào để component này dùng lại được cho
 * `/admin/reports` ở Phase 9 mà không cần biết đường dẫn nào.
 */

type Props = {
  pageInfo: PageInfo;
  buildHref: (page: number) => string;
};

export function PaginationNav({ pageInfo, buildHref }: Props) {
  // Một trang thì thanh này không mang thông tin gì — ẩn hẳn thay vì hiện hai
  // nút chết (rule: không bày control không dùng được).
  if (pageInfo.pageCount <= 1) return null;

  return (
    <nav
      aria-label="Phân trang danh sách báo cáo"
      className="flex items-center justify-between gap-3"
    >
      <PageLink
        href={pageInfo.hasPrev ? buildHref(pageInfo.page - 1) : null}
        icon={<ChevronLeft aria-hidden="true" className="size-4" />}
        label="Trang trước"
      />

      {/* `aria-live` để screen reader biết vị trí mới sau khi điều hướng. */}
      <p aria-live="polite" className="tabular text-sm text-muted-foreground">
        Trang {pageInfo.page}/{pageInfo.pageCount}
        <span className="sr-only">
          {' '}
          — đang xem báo cáo thứ {pageInfo.rangeStart} đến {pageInfo.rangeEnd} trên tổng{' '}
          {pageInfo.total}
        </span>
      </p>

      <PageLink
        href={pageInfo.hasNext ? buildHref(pageInfo.page + 1) : null}
        icon={<ChevronRight aria-hidden="true" className="size-4" />}
        label="Trang sau"
      />
    </nav>
  );
}

type PageLinkProps = {
  /** `null` = ở đầu/cuối danh sách. Render `<span>` chứ không phải link chết. */
  href: string | null;
  icon: React.ReactNode;
  label: string;
};

function PageLink({ href, icon, label }: PageLinkProps) {
  const className = buttonClassName({ variant: 'secondary' });

  if (href === null) {
    return (
      <span aria-disabled="true" className={cn(className, 'cursor-not-allowed opacity-45')}>
        {icon}
        {label}
      </span>
    );
  }

  return (
    <Link href={href} className={className}>
      {icon}
      {label}
    </Link>
  );
}
