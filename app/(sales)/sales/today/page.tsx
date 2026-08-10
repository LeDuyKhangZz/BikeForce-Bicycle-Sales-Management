import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarPlus, CheckCircle2, Clock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonClassName } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/features/auth/queries';
import { AchievementTable } from '@/features/report-comparison/achievement-table';
import { ReportNotes } from '@/features/report-comparison/report-notes';
import { DiscardEveningDraft } from '@/features/report-evening/discard-evening-draft';
import { ShareImageButton } from '@/features/report-share/share-image-button';
import { formatVietnamDate, getVietnamToday } from '@/lib/date';
import { messageForSavedParam } from '@/lib/reports/messages';
import { shareImageFileName } from '@/lib/reports/share-card';
import { getTodayView } from '@/lib/reports/today-cta';
import { createClient } from '@/lib/supabase/server';
import { getTodayReport } from '@/services/reports';

export const metadata: Metadata = {
  title: 'Hôm nay · BikeForce',
};

/**
 * `/sales/today` — UC-03, FR-007. ĐÍCH ĐẾN sau khi Sales đăng nhập.
 *
 * Toàn bộ quyết định "trạng thái nào thì hiện CTA nào" nằm ở
 * `lib/reports/today-cta.ts` và có unit test riêng (AGENTS.md §1.3). Trang này
 * chỉ RENDER kết quả đó — không có một câu `if (status === …)` nào về nghiệp vụ.
 */

/*
 * PHASE 7 — `CTA_ROUTES_NOT_READY` đã bị XOÁ.
 *
 * Tập đó từng giữ `VIEW_REPORT` vì `/sales/reports/[id]` chưa tồn tại, nên CTA
 * "Xem báo cáo hôm nay" render disabled. Route đó nay đã có (FR-022, UC-10) và
 * `EXPORT_IMAGE_NOT_READY` đã bỏ từ Phase 6 ⇒ file này không còn cờ tạm nào.
 * Mọi CTA của `getTodayView()` giờ đều là link thật.
 */

const STATE_ICON = {
  NO_REPORT: CalendarPlus,
  MORNING_SUBMITTED: Clock,
  COMPLETED: CheckCircle2,
} as const;

type Props = {
  searchParams: Promise<{ saved?: string }>;
};

export default async function SalesTodayPage({ searchParams }: Props) {
  const profile = await requireRole('SALES');

  const supabase = await createClient();
  const today = getVietnamToday();
  const report = await getTodayReport(supabase, profile.id, today);

  const view = getTodayView(report);
  const savedMessage = messageForSavedParam((await searchParams).saved);
  const StateIcon = STATE_ICON[view.state];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-heading">Hôm nay</h1>
        {/* BR-005 — ngày nghiệp vụ theo Asia/Ho_Chi_Minh, do server tính. */}
        <p className="tabular text-sm text-muted-foreground">{formatVietnamDate(today)}</p>
      </div>

      {savedMessage && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-border bg-status-exceeded-bg px-3 py-3 text-sm text-status-exceeded-fg"
        >
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{savedMessage}</span>
        </p>
      )}

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{profile.full_name}</CardTitle>
          {/* Trạng thái không bao giờ chỉ bằng màu — luôn icon + chữ. */}
          <Badge tone={view.statusTone} icon={<StateIcon aria-hidden="true" className="size-4" />}>
            {view.statusLabel}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{view.statusDescription}</p>
      </Card>

      {report === null ? (
        // Empty state: icon + câu hướng dẫn + đúng một CTA (rule empty-states).
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <CalendarPlus aria-hidden="true" className="size-12 text-muted-foreground" />
          <p className="text-base font-medium text-foreground">Chưa có báo cáo hôm nay</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Hãy cam kết chỉ tiêu đầu ngày trước khi ra thị trường. Cuối ngày bạn quay lại nhập kết
            quả thực đạt.
          </p>
        </Card>
      ) : (
        <>
          {/*
            Phase 5 — bảng đối chiếu thay cho danh sách cam kết một cột của
            Phase 3. Ở trạng thái `MORNING_SUBMITTED`, cột "Thực đạt" là `'—'`
            và badge là "Chờ số liệu" (`docs/05 §7.3` dòng 1) — đó là hành vi
            đúng, không phải dữ liệu thiếu.
          */}
          <AchievementTable report={report} />
          <ReportNotes report={report} />
        </>
      )}

      {/* FR-035 — không render gì, chỉ dọn draft cuối ngày đã hết ý nghĩa. */}
      {view.state === 'COMPLETED' && <DiscardEveningDraft today={today} />}

      <div className="flex flex-col gap-3">
        <Link href={view.primaryCta.href} className={buttonClassName({ size: 'lg' })}>
          {view.primaryCta.label}
        </Link>

        {view.secondaryCta && (
          <Link
            href={view.secondaryCta.href}
            className={buttonClassName({ variant: 'secondary', size: 'lg' })}
          >
            {view.secondaryCta.label}
          </Link>
        )}

        {/*
          BR-002 / FR-017 — nút Xuất ảnh CHỈ xuất hiện khi báo cáo đã persist với
          `status = 'COMPLETED'`; `canExportImage` đọc từ dữ liệu đã lưu, không
          bao giờ suy ra từ trạng thái form. Route handler kiểm lại lần nữa
          (`docs/07 §4.1`) — ẩn nút không phải là bảo mật.

          `report !== null` là điều kiện thừa về mặt nghiệp vụ (`canExportImage`
          chỉ bật ở nhánh COMPLETED, mà nhánh đó luôn có báo cáo) nhưng TypeScript
          cần nó để thu hẹp kiểu — và nó rẻ hơn một dấu `!`.
        */}
        {report !== null && view.canExportImage && (
          <ShareImageButton
            reportId={report.id}
            fileName={shareImageFileName(profile.full_name, report.report_date)}
          />
        )}
      </div>
    </div>
  );
}
