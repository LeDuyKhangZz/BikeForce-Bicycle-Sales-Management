import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Nút quay lại của trang con — rule `back-behavior` + `back-stack-integrity`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO LÀ `<Link href>` CHỨ KHÔNG PHẢI `router.back()`
 * ─────────────────────────────────────────────────────────────────────────
 *  `router.back()` phụ thuộc vào lịch sử trình duyệt, mà lịch sử thì không phải
 *  lúc nào cũng có: mở `/sales/reports/<id>` từ một link Zalo là vào thẳng, tab
 *  chưa có mục nào trước đó nên "quay lại" rơi ra ngoài ứng dụng. Một `href`
 *  tường minh luôn tới đúng chỗ, mở được tab mới, và screen reader đọc ra đích
 *  đến thật.
 *
 *  Đích đến nhận qua prop kèm `label` để câu chữ nói rõ sẽ đi đâu ("Về danh
 *  sách lịch sử") thay vì một chữ "Quay lại" trống nghĩa.
 *
 * Primitive này KHÔNG biết nghiệp vụ (AGENTS.md §4): nó chỉ nhận `href` và
 * `children`, không biết `/sales/history` là cái gì.
 */

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export function BackLink({ href, children, className }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        // `min-h-11` = 44px vùng chạm (rule touch-target-size), `self-start` để
        // vùng chạm không kéo dài hết chiều ngang và nuốt cú chạm của phần tử
        // bên cạnh.
        'inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium text-primary',
        className,
      )}
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {children}
    </Link>
  );
}
