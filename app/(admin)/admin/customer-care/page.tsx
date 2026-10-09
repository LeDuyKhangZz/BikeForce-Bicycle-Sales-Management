import type { Metadata } from 'next';
import { CheckCircle2, Clock3, ImageIcon } from 'lucide-react';

import { Card, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/features/auth/queries';
import { ReviewCareForm } from '@/features/customer-care/review-form';
import { cloudinaryEvidenceUrl } from '@/lib/cloudinary';
import { formatVietnamDate, formatVietnamDateTime } from '@/lib/date';
import { createClient } from '@/lib/supabase/server';
import { listCareSubmissions } from '@/services/customer-care';

export const metadata: Metadata = { title: 'Duyệt chăm sóc · BikeForce' };

export default async function AdminCustomerCarePage() {
  await requireRole('ADMIN');
  const submissions = await listCareSubmissions(await createClient(), 'PENDING');
  return (
    <div className="flex flex-col gap-5">
      <header><h1 className="text-2xl font-bold text-heading">Phê duyệt chăm sóc</h1><p className="mt-1 text-sm text-muted-foreground">{submissions.length} yêu cầu đang chờ xử lý</p></header>
      {submissions.length === 0 ? <Card className="flex flex-col items-center gap-3 p-8 text-center"><CheckCircle2 aria-hidden="true" className="size-10 text-success" /><CardTitle>Không có yêu cầu chờ duyệt</CardTitle></Card> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {submissions.map((submission) => (
            <Card key={submission.id} className="flex flex-col gap-4 p-4">
              <div><CardTitle>{submission.customer_name}</CardTitle><p className="text-sm text-muted-foreground">{submission.customer_code || 'Không có mã'} · chăm sóc {formatVietnamDate(submission.care_date)}</p></div>
              {submission.note && <p className="rounded-lg bg-background p-3 text-sm">{submission.note}</p>}
              <div className="grid grid-cols-2 gap-2">
                {submission.evidence.map((item) => <a key={item.id} href={cloudinaryEvidenceUrl(item.cloudinary_public_id)} target="_blank" rel="noreferrer" className="flex min-h-24 items-center justify-center rounded-lg border border-input-border/60 bg-background"><ImageIcon aria-hidden="true" className="size-6" /><span className="sr-only">Mở ảnh minh chứng</span></a>)}
              </div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 aria-hidden="true" className="size-4" />Gửi lúc {formatVietnamDateTime(submission.created_at)}</p>
              <ReviewCareForm submissionId={submission.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
