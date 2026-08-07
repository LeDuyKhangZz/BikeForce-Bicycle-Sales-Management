import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarPlus, CheckCircle2, Clock, FileText, Image as ImageIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button, buttonClassName } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/features/auth/queries';
import { AchievementTable } from '@/features/report-comparison/achievement-table';
import { ReportNotes } from '@/features/report-comparison/report-notes';
import { DiscardEveningDraft } from '@/features/report-evening/discard-evening-draft';
import { formatVietnamDate, getVietnamToday } from '@/lib/date';
import { messageForSavedParam } from '@/lib/reports/messages';
import { getTodayView, type TodayCtaKey } from '@/lib/reports/today-cta';
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

/**
 * Route đích của CTA chưa được dựng trong bản hiện tại.
 *
 * `VIEW_REPORT` trỏ tới `/sales/reports/[id]` — FR-022, **Phase 7**. Nút vẫn
 * hiện (để trạng thái COMPLETED không cụt lủn) nhưng ở dạng disabled kèm câu
 * giải thích, thay vì một link dẫn tới 404.
 *
 * 👉 Xoá `VIEW_REPORT` khỏi tập này ngay khi Phase 7 dựng xong route đó.
 */
const CTA_ROUTES_NOT_READY: ReadonlySet<TodayCtaKey> = new Set<TodayCtaKey>(['VIEW_REPORT']);

/** FR-018 — sinh ảnh PNG 1080×1920 là **Phase 6**. Xoá cờ này khi làm xong. */
const EXPORT_IMAGE_NOT_READY = true;

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
        {CTA_ROUTES_NOT_READY.has(view.primaryCta.key) ? (
          <div className="flex flex-col gap-2">
            <Button size="lg" disabled>
              <FileText aria-hidden="true" className="size-5" />
              {view.primaryCta.label}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Màn hình chi tiết báo cáo sẽ có ở bản cập nhật tiếp theo.
            </p>
          </div>
        ) : (
          <Link href={view.primaryCta.href} className={buttonClassName({ size: 'lg' })}>
            {view.primaryCta.label}
          </Link>
        )}

        {view.secondaryCta && (
          <Link
            href={view.secondaryCta.href}
            className={buttonClassName({ variant: 'secondary', size: 'lg' })}
          >
            {view.secondaryCta.label}
          </Link>
        )}

        {/*
          BR-002 / FR-017 — nút Xuất ảnh CHỈ được bật khi báo cáo đã persist với
          `status = 'COMPLETED'`, không bao giờ suy ra từ trạng thái form.
          Ở bản hiện tại nút luôn disabled vì bản thân chức năng sinh ảnh là
          FR-018 — Phase 6. Điều kiện BR-002 vẫn được giữ nguyên trong biểu thức
          để Phase 6 chỉ việc xoá `EXPORT_IMAGE_NOT_READY`.
        */}
        <div className="flex flex-col gap-2">
          <Button variant="secondary" size="lg" disabled={!view.canExportImage || EXPORT_IMAGE_NOT_READY}>
            <ImageIcon aria-hidden="true" className="size-5" />
            Xuất ảnh báo cáo
          </Button>
          {view.canExportImage && (
            <p className="text-center text-xs text-muted-foreground">
              Chức năng xuất ảnh 9:16 sẽ có ở bản cập nhật tiếp theo.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
