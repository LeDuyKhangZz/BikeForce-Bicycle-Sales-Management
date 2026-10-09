import { CircleCheck, CircleX, Clock3 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { formatVietnamShortDate } from '@/lib/date';
import type { MisaCustomer } from '@/types/misa-customer';

type Props = {
  review: MisaCustomer['careReview'];
  fullWidth?: boolean;
};

export function CustomerCareReviewBadge({ review, fullWidth = false }: Props) {
  if (!review) return null;
  const className = fullWidth ? 'w-full justify-center whitespace-nowrap text-xs' : undefined;

  if (review.status === 'APPROVED') {
    return <Badge tone="warning" className={className} icon={<CircleCheck aria-hidden="true" className="size-3.5 shrink-0" />}>Đã chăm sóc {formatVietnamShortDate(review.careDate)}</Badge>;
  }
  if (review.status === 'REJECTED') {
    return <Badge tone="danger" className={className} icon={<CircleX aria-hidden="true" className="size-3.5 shrink-0" />}>Bị từ chối</Badge>;
  }
  if (review.status === 'REVOKED') {
    return <span className="block"><Badge tone="danger" className={className} icon={<CircleX aria-hidden="true" className="size-3.5 shrink-0" />}>Đã thu hồi phê duyệt</Badge><span className="mt-1 block break-words text-xs text-status-missed-fg">Lý do: {review.revocationReason || 'Không có thông tin'}</span></span>;
  }
  return <Badge tone="neutral" className={className} icon={<Clock3 aria-hidden="true" className="size-3.5 shrink-0" />}>Đang chờ duyệt</Badge>;
}
