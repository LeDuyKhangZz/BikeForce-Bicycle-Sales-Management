import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, SearchX } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AdminReportTable } from '@/features/admin-reports/admin-report-table';
import { ReportFilterBar } from '@/features/admin-reports/report-filter-bar';
import { requireRole } from '@/features/auth/queries';
import { PaginationNav } from '@/features/sales-history/pagination-nav';
import {
  adminReportsPath,
  buildAdminReportQuery,
  hasActiveFilters,
  parseAdminReportFilters,
  type AdminReportSearchParams,
} from '@/lib/reports/admin-filters';
import { parsePageParam } from '@/lib/reports/pagination';
import { createClient } from '@/lib/supabase/server';
import { listSalesOptions } from '@/services/profiles';
import { CSV_EXPORT_MAX_ROWS, getAdminReports } from '@/services/reports';

export const metadata: Metadata = {
  title: 'Báo cáo toàn đội · BikeForce',
};

/**
 * `/admin/reports` — UC-13, FR-025, FR-026, AF-03.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  LỌC VÀ PHÂN TRANG CHẠY HOÀN TOÀN Ở SERVER
 * ─────────────────────────────────────────────────────────────────────────
 *  Năm chiều lọc đi qua `parseAdminReportFilters()` — hàm thuần, đã có 43 unit
 *  test cho mọi tổ hợp rác. Kết quả đi thẳng vào `gte/lte/eq/ilike` của
 *  `getAdminReports()`, và truy vấn chỉ lấy **đúng 20 dòng** của trang đang
 *  xem. Không có bước nào tải cả bảng rồi lọc bằng JavaScript (FR-026, NFR-002).
 *
 *  Ba lời gọi độc lập chạy song song bằng `Promise.all` — dropdown Sales không
 *  phụ thuộc kết quả lọc, chờ nối tiếp là cộng dồn thời gian vô ích.
 */

type Props = {
  searchParams: Promise<AdminReportSearchParams & { page?: string }>;
};

export default async function AdminReportsPage({ searchParams }: Props) {
  await requireRole('ADMIN');

  const params = await searchParams;
  const filters = parseAdminReportFilters(params);
  const page = parsePageParam(params.page);

  const supabase = await createClient();
  const [{ rows, pageInfo }, salesOptions] = await Promise.all([
    getAdminReports(supabase, filters, page),
    listSalesOptions(supabase),
  ]);

  // Link CSV mang ĐÚNG bộ lọc đang hiển thị (FR-034: "đúng tập dữ liệu đang
  // filter, không phải toàn bảng"). Cùng một `buildAdminReportQuery` với thanh
  // phân trang nên hai bên không thể lệch.
  const exportQuery = buildAdminReportQuery(filters).toString();
  const exportHref =
    exportQuery === ''
      ? '/api/admin/reports/export'
      : `/api/admin/reports/export?${exportQuery}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-heading">Báo cáo toàn đội</h1>
        <p className="tabular text-sm text-muted-foreground">
          {pageInfo.total === 0
            ? 'Không có báo cáo nào khớp bộ lọc.'
            : `${pageInfo.total} báo cáo khớp bộ lọc.`}
        </p>
      </div>

      <ReportFilterBar filters={filters} salesOptions={salesOptions} />

      {rows.length === 0 ? (
        <EmptyState hasFilters={hasActiveFilters(filters)} />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {/*
              `<a>` thật chứ không phải `fetch` + Blob: trình duyệt tự xử lý
              `Content-Disposition`, và link này bookmark được. Không cần
              `download` — header của server đã nói tên file (FR-034).
            */}
            <Link
              href={exportHref}
              prefetch={false}
              className={buttonClassName({ variant: 'secondary' })}
            >
              <Download aria-hidden="true" className="size-4" />
              Tải CSV theo bộ lọc
            </Link>

            {pageInfo.total > CSV_EXPORT_MAX_ROWS && (
              <p className="text-xs text-muted-foreground">
                Bộ lọc đang có {pageInfo.total} báo cáo. File CSV chỉ chứa{' '}
                {CSV_EXPORT_MAX_ROWS} dòng mới nhất — hãy thu hẹp khoảng thời gian nếu cần đủ.
              </p>
            )}
          </div>

          <AdminReportTable reports={rows} buildHref={(id) => `/admin/reports/${id}`} />

          <PaginationNav
            pageInfo={pageInfo}
            buildHref={(nextPage) => adminReportsPath(filters, { page: nextPage })}
          />
        </>
      )}
    </div>
  );
}

/** Empty state — icon + hướng dẫn + CTA xoá lọc (`docs/05 §9`). */
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-8 text-center">
      <SearchX aria-hidden="true" className="size-12 text-muted-foreground" />
      <p className="text-base font-medium text-foreground">
        {hasFilters ? 'Không có báo cáo nào khớp bộ lọc' : 'Chưa có báo cáo nào'}
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? 'Thử mở rộng khoảng thời gian, bỏ bớt điều kiện, hoặc xoá toàn bộ bộ lọc.'
          : 'Khi Sales gửi cam kết đầu ngày, báo cáo sẽ xuất hiện ở đây.'}
      </p>

      {hasFilters && (
        <Link href="/admin/reports" className={buttonClassName({ variant: 'secondary' })}>
          Xoá lọc
        </Link>
      )}
    </Card>
  );
}
