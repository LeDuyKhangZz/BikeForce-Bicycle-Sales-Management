import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarPlus, CheckCircle2, Clock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonClassName } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { LinkSpinner } from '@/components/ui/link-spinner';
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
      <div className="flex flex-col gap-0.5">
        <h1 className="text-3xl font-bold tracking-tight text-heading">Hôm nay</h1>
        {/* BR-005 — ngày nghiệp vụ theo Asia/Ho_Chi_Minh, do server tính. */}
        <p className="tabular text-sm font-medium text-muted-foreground">
          {formatVietnamDate(today)}
        </p>
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

      {/*
        PHASE 13 (DEC-053) — thẻ trạng thái thành KHỐI DẪN của trang.

        Đây là thứ Sales nhìn đầu tiên mỗi sáng, nên nó phải trả lời "hôm nay tôi
        đang ở đâu" trong một cái liếc. Bản cũ là một card trắng y hệt ba card
        bên dưới — không có gì nói rằng nó quan trọng hơn.

        Nền chuyển sắc xanh thương hiệu + icon lớn trong vòng tròn tạo phân cấp
        bằng ĐỘ NỔI, không bằng cách phóng to chữ. Chữ vẫn nằm trên nền sáng nên
        mọi tỉ lệ tương phản của DEC-046 giữ nguyên hiệu lực.
      */}
      <Card className="relative overflow-hidden border-primary/15 bg-linear-135 from-status-info-bg via-card to-card">
        <div className="flex items-start gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-md bg-card text-primary shadow-sm">
            <StateIcon aria-hidden="true" className="size-6" />
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">{profile.full_name}</CardTitle>
              {/*
                Trạng thái không bao giờ chỉ bằng màu. Ở đây icon đã được nâng
                lên khối tròn 48px bên trái — to hơn và dễ thấy hơn hẳn icon
                16px nhét trong badge — nên badge chỉ còn giữ phần CHỮ. Cả hai
                lớp (icon + chữ) vẫn đủ, đúng `color-not-only`.
              */}
              <Badge tone={view.statusTone}>{view.statusLabel}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{view.statusDescription}</p>
          </div>
        </div>
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
            PHASE 13 — "Tuyến và ghi chú" đứng TRƯỚC "Cam kết và thực đạt".
            Người dùng yêu cầu trực tiếp (ảnh 3, `PROJECT_CHECKLIST.md §13c`), và
            nó cũng đúng thứ tự công việc thật: buổi sáng Sales cần thấy ngay
            mình định đi đâu, còn bảng số chỉ có nghĩa sau khi đã ra thị trường.

            ⚠ `/sales/reports/[id]` PHẢI giữ đúng thứ tự này — hai màn hình cùng
            trình bày một báo cáo, lệch thứ tự là bắt người dùng học hai bố cục.

            Phase 5 — ở trạng thái `MORNING_SUBMITTED`, cột "Thực đạt" là `'—'`
            và badge là "Chờ số liệu" (`docs/05 §7.3` dòng 1) — đó là hành vi
            đúng, không phải dữ liệu thiếu.
          */}
          <ReportNotes report={report} />
          <AchievementTable report={report} />
        </>
      )}

      {/* FR-035 — không render gì, chỉ dọn draft cuối ngày đã hết ý nghĩa. */}
      {view.state === 'COMPLETED' && <DiscardEveningDraft today={today} />}

      <div className="flex flex-col gap-3">
        {/*
          PHASE 13 — `LinkSpinner` cho phản hồi < 100 ms khi chạm (nhóm A).
          `loading.tsx` chỉ hiện SAU khi Next bắt đầu render trang đích; quãng
          trước đó trên 4G là khoảng lặng khiến người dùng bấm lại lần hai.
        */}
        <Link href={view.primaryCta.href} className={buttonClassName({ size: 'lg' })}>
          {view.primaryCta.label}
          <LinkSpinner />
        </Link>

        {view.secondaryCta && (
          <Link
            href={view.secondaryCta.href}
            className={buttonClassName({ variant: 'secondary', size: 'lg' })}
          >
            {view.secondaryCta.label}
            <LinkSpinner />
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
        {/* Nút Xuất ảnh dùng biến thể `accent` (cam logo) — xem lý do ở
            `components/ui/button.tsx`: đây là hành động "khoe kết quả", cố ý
            khác màu với CTA chính để không tranh chỗ với nó. */}
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
