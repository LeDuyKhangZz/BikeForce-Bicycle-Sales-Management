import { CircleCheck, CircleX, Clock3 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { formatVietnamDate } from '@/lib/date';
import type { MisaCustomer } from '@/types/misa-customer';

type Props = {
  review: MisaCustomer['careReview'];
};

export function CustomerCareReviewBadge({ review }: Props) {
  if (!review) return null;

  if (review.status === 'APPROVED') {
    return <Badge tone="success" icon={<CircleCheck aria-hidden="true" className="size-3.5" />}>Đã chăm sóc {formatVietnamDate(review.careDate)}</Badge>;
  }
  if (review.status === 'REJECTED') {
    return <Badge tone="danger" icon={<CircleX aria-hidden="true" className="size-3.5" />}>Bị từ chối</Badge>;
  }
  return <Badge tone="neutral" icon={<Clock3 aria-hidden="true" className="size-3.5" />}>Đang chờ duyệt</Badge>;
}
