import Image from 'next/image';
import Link from 'next/link';
import { Eye, FileQuestion } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { LinkSpinner } from '@/components/ui/link-spinner';
import { shareImageViewPath, type ShareCardVariant } from '@/lib/reports/share-card';
import type { SalesDailyPreviewOption } from '@/services/profiles';
import type { SaleWorkReport } from '@/services/salework';

import { SalesPreviewSection } from './sales-preview-section';

type Props = {
  reportedToday: readonly SalesDailyPreviewOption[];
  otherSales: readonly SalesDailyPreviewOption[];
  saleWorkReports: readonly SaleWorkReport[];
  selectedDailyReportId: string | null;
  selectedDailyVariant: ShareCardVariant;
  selectedSaleWorkAccount: string | null;
};

export function EmployeePreviewList({
  reportedToday,
  otherSales,
  saleWorkReports,
  selectedDailyReportId,
  selectedDailyVariant,
  selectedSaleWorkAccount,
}: Props) {
  const selectedDaily = [...reportedToday, ...otherSales]
    .flatMap((employee) => employee.daily_reports)
    .find((report) => report.id === selectedDailyReportId);
  const selectedSaleWork = saleWorkReports.find(
    (report) => report.accountName === selectedSaleWorkAccount,
  );

  return (
    <div className="flex flex-col gap-6">
      <SalesPreviewSection
        employees={reportedToday}
        title="Sales đã báo cáo hôm nay"
        description="Ưu tiên"
        emptyText="Hôm nay chưa có Sales nào gửi báo cáo."
        sectionId="today-sales-preview-list-title"
      />

      <section aria-labelledby="salework-preview-list-title">
        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle id="salework-preview-list-title" className="text-base">
              Nhân viên telesale · SaleWork
            </CardTitle>
            <Link
              href="/admin/salework"
              className={buttonClassName({
                variant: 'ghost',
                className: 'shrink-0 lg:hidden',
              })}
            >
              Xem bảng SaleWork
              <LinkSpinner label="Đang mở bảng SaleWork…" />
            </Link>
          </div>

          {saleWorkReports.length === 0 ? (
            <EmptyMessage text="Chưa có dữ liệu SaleWork đã đồng bộ." />
          ) : (
            <ul className="divide-y divide-border" aria-label="Danh sách nhân viên telesale">
              {saleWorkReports.map((report) => (
                <li
                  key={report.accountName}
                  className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold break-words text-heading">{report.accountName}</p>
                    <p className="text-sm text-muted-foreground">Báo cáo tin nhắn và cuộc gọi</p>
                  </div>
                  <Link
                    href={`/admin/report-previews?salework=${encodeURIComponent(report.accountName)}#report-preview`}
                    className={buttonClassName({ variant: 'secondary', className: 'shrink-0' })}
                    aria-label={`Xem trước báo cáo SaleWork của ${report.accountName}`}
                  >
                    <Eye aria-hidden="true" className="size-4" />
                    Xem preview
                    <LinkSpinner label="Đang mở bản xem trước SaleWork…" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <SalesPreviewSection
        employees={otherSales}
        title="Sales chưa báo cáo hôm nay"
        description="Báo cáo ngày trước hoặc chưa có dữ liệu"
        emptyText="Tất cả Sales đã có báo cáo hôm nay."
        sectionId="other-sales-preview-list-title"
      />

      {(selectedDaily || selectedSaleWork) && (
        <section id="report-preview" aria-labelledby="report-preview-title" className="scroll-mt-24">
          <Card className="flex flex-col gap-3">
            <CardTitle id="report-preview-title" className="text-base">
              Bản xem trước
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedDaily
                ? selectedDailyVariant === 'MORNING'
                  ? 'Bản cam kết đầu ngày của nhân viên.'
                  : selectedDaily.status === 'COMPLETED'
                    ? 'Báo cáo cuối ngày đã hoàn tất.'
                    : 'Bản cuối ngày xem trước; số liệu chưa nhập sẽ hiển thị “—” hoặc trạng thái chờ.'
                : `Báo cáo SaleWork của ${selectedSaleWork?.accountName ?? 'nhân viên telesale'}.`}
            </p>
            <div className="mx-auto w-full max-w-[540px] overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              <Image
                src={
                  selectedDaily
                    ? shareImageViewPath(selectedDaily.id, selectedDailyVariant)
                    : `/api/salework/report-image?account=${encodeURIComponent(selectedSaleWork?.accountName ?? '')}`
                }
                alt={
                  selectedDaily
                    ? 'Bản xem trước báo cáo ngày của nhân viên'
                    : `Bản xem trước báo cáo SaleWork của ${selectedSaleWork?.accountName ?? 'nhân viên telesale'}`
                }
                width={selectedDaily ? 1080 : 960}
                height={selectedDaily ? 1920 : 1560}
                sizes="(min-width: 768px) 540px, calc(100vw - 64px)"
                unoptimized
                className="h-auto w-full"
              />
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <FileQuestion aria-hidden="true" className="size-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
