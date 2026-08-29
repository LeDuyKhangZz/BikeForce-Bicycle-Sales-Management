import type { Metadata } from 'next';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/features/auth/queries';
import { getSaleWorkReport } from '@/services/salework';

import { AccountExportButton, ExportReportButton } from './export-report-button';

export const metadata: Metadata = {
  title: 'SaleWork · BikeForce',
};

export default async function SaleWorkPage() {
  await requireRole('ADMIN');
  // ✅ Đã sửa: getSaleWorkReport() giờ là async (đọc từ Supabase) nên cần await.
  const reports = await getSaleWorkReport();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold tracking-wide text-accent-text uppercase">Module</p>
        <h1 className="text-2xl font-bold tracking-tight text-heading">SaleWork</h1>
        <p className="max-w-prose text-sm text-muted-foreground">Tổng hợp hoạt động Zalo theo tài khoản.</p>
      </div>

      <section aria-labelledby="salework-report-title">
        <Card flush>
          <CardHeader className="border-b border-border/70 p-4">
            <div>
              <CardTitle id="salework-report-title">Báo cáo tin nhắn và cuộc gọi</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {reports.length > 0 ? 'Dữ liệu đã đồng bộ từ SaleWork' : 'Chưa có dữ liệu đồng bộ'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ExportReportButton reports={reports} />
              <span className="rounded-full bg-status-warning-bg px-3 py-1 text-xs font-semibold text-status-warning-fg">
                {reports.length > 0 ? 'Đã đồng bộ' : 'Chờ đồng bộ'}
              </span>
            </div>
          </CardHeader>

          <div className="p-4">
            {reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chạy <code>npm run salework:sync</code> để đồng bộ dữ liệu.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <caption className="sr-only">Báo cáo hoạt động SaleWork theo tài khoản</caption>
                  <thead className="border-b border-border/70 text-muted-foreground">
                    <tr>
                      {[
                        'Tên tài khoản',
                        'Hội thoại',
                        'Tin đã gửi',
                        'Đã nhận',
                        'Cuộc gọi',
                        'Thời lượng',
                        'Xuất báo cáo',
                      ].map((heading) => (
                        <th key={heading} scope="col" className="px-3 py-3 font-semibold">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.accountName} className="border-b border-border/70 last:border-0">
                        <th scope="row" className="px-3 py-4 font-semibold text-heading">
                          {report.accountName}
                        </th>
                        <td className="px-3 py-4 tabular-nums">{report.conversations}</td>
                        <td className="px-3 py-4 tabular-nums">{report.sentMessages}</td>
                        <td className="px-3 py-4 tabular-nums">{report.receivedMessages}</td>
                        <td className="px-3 py-4 tabular-nums">
                          {report.incomingCalls} đến · {report.outgoingCalls} đi · {report.missedCalls} nhỡ
                        </td>
                        <td className="px-3 py-4 tabular-nums">{report.callDuration}</td>
                        <td className="px-3 py-4">
                          <AccountExportButton report={report} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}