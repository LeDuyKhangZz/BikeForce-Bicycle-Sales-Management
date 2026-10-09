import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Clock3 } from 'lucide-react';

import { Card, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/features/auth/queries';
import { EvidenceImageViewer } from '@/features/customer-care/evidence-image-viewer';
import { ReviewCareForm } from '@/features/customer-care/review-form';
import { RevokeCareForm } from '@/features/customer-care/revoke-care-form';
import { cloudinaryEvidenceUrl } from '@/lib/cloudinary';
import { formatVietnamDate, formatVietnamDateTime } from '@/lib/date';
import { createClient } from '@/lib/supabase/server';
import { listApprovedCareSubmissions, listCareSubmissions, type CareSubmissionWithEvidence } from '@/services/customer-care';

export const metadata: Metadata = { title: 'Duyệt chăm sóc · BikeForce' };

type Props = { searchParams: Promise<{ approvedPage?: string }> };

function CareSubmissionCard({ submission, approved = false }: { submission: CareSubmissionWithEvidence; approved?: boolean }) {
  return (
    <Card id={`care-${submission.id}`} className="flex scroll-mt-24 flex-col gap-4 p-4">
      <div><CardTitle>{submission.customer_name}</CardTitle><p className="text-sm text-muted-foreground">{submission.customer_code || 'Không có mã'} · chăm sóc {formatVietnamDate(submission.care_date)}</p></div>
      {submission.note && <p className="rounded-lg bg-background p-3 text-sm">{submission.note}</p>}
      <div className="grid grid-cols-2 gap-2">
        {submission.evidence.map((item, index) => (
          <EvidenceImageViewer key={item.id} src={cloudinaryEvidenceUrl(item.cloudinary_public_id)} alt={`Ảnh chăm sóc ${index + 1} của ${submission.customer_name}`} />
        ))}
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 aria-hidden="true" className="size-4" />Gửi lúc {formatVietnamDateTime(submission.created_at)}</p>
      {approved ? <RevokeCareForm submissionId={submission.id} /> : <ReviewCareForm submissionId={submission.id} />}
    </Card>
  );
}

export default async function AdminCustomerCarePage({ searchParams }: Props) {
  await requireRole('ADMIN');
  const rawPage = (await searchParams).approvedPage;
  const parsedPage = Number(rawPage);
  const approvedPage = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const supabase = await createClient();
  const [submissions, approved] = await Promise.all([
    listCareSubmissions(supabase, 'PENDING'),
    listApprovedCareSubmissions(supabase, approvedPage),
  ]);
  const approvedPages = Math.max(1, Math.ceil(approved.total / 20));
  return (
    <div className="flex flex-col gap-5">
      <header><h1 className="text-2xl font-bold text-heading">Phê duyệt chăm sóc</h1><p className="mt-1 text-sm text-muted-foreground">{submissions.length} yêu cầu đang chờ xử lý</p></header>
      {submissions.length === 0 ? <Card className="flex flex-col items-center gap-3 p-8 text-center"><CheckCircle2 aria-hidden="true" className="size-10 text-success" /><CardTitle>Không có yêu cầu chờ duyệt</CardTitle></Card> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {submissions.map((submission) => <CareSubmissionCard key={submission.id} submission={submission} />)}
        </div>
      )}
      <section id="approved-care" className="scroll-mt-24 space-y-4 border-t border-border pt-6">
        <div><h2 className="text-xl font-bold text-heading">Đã phê duyệt · có thể thu hồi</h2><p className="text-sm text-muted-foreground">{approved.total} phiếu đã duyệt. Thu hồi phải ghi lý do.</p></div>
        {approved.rows.length === 0 ? <Card className="p-6 text-sm text-muted-foreground">Chưa có phiếu đã duyệt.</Card> : (
          <div className="grid gap-4 lg:grid-cols-2">{approved.rows.map((submission) => <CareSubmissionCard key={submission.id} submission={submission} approved />)}</div>
        )}
        {approvedPages > 1 && (
          <nav aria-label="Trang phiếu đã duyệt" className="flex items-center justify-center gap-4 text-sm">
            {approvedPage > 1 && <Link className="min-h-11 px-3 py-3 font-semibold text-primary underline" href={`/admin/customer-care?approvedPage=${approvedPage - 1}#approved-care`}>Trang trước</Link>}
            <span>Trang {approvedPage}/{approvedPages}</span>
            {approvedPage < approvedPages && <Link className="min-h-11 px-3 py-3 font-semibold text-primary underline" href={`/admin/customer-care?approvedPage=${approvedPage + 1}#approved-care`}>Trang sau</Link>}
          </nav>
        )}
      </section>
    </div>
  );
}
