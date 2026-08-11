import Link from 'next/link';
import { CalendarRange, History, SlidersHorizontal } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LinkSpinner } from '@/components/ui/link-spinner';
import {
  ADMIN_REPORT_PARAMS,
  adminReportsAllTimePath,
  countActiveAdminReportFilters,
  type AdminReportFilters,
} from '@/lib/reports/admin-filters';
import { REPORT_STATUS_LABEL } from '@/lib/reports/report-status';
import type { SalesOption } from '@/services/profiles';

type Props = {
  filters: AdminReportFilters;
  salesOptions: readonly SalesOption[];
};

const SELECT_CLASS =
  'min-h-13 w-full rounded-md border border-input-border/70 bg-background px-3.5 text-base text-foreground transition-[background-color,border-color,box-shadow] duration-200 focus:bg-card focus:shadow-brand-sm';

/** Trường ít dùng được thu gọn để mobile không phải cuộn qua cả form mỗi lần. */
export function AdvancedReportFilters({ filters, salesOptions }: Props) {
  const activeCount = countActiveAdminReportFilters(filters);

  return (
    <details className="group rounded-lg border border-border bg-background/70">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-heading transition-colors duration-150 hover:bg-status-info-bg [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal aria-hidden="true" className="size-5 shrink-0 text-primary" />
        <span className="flex-1">Bộ lọc nâng cao</span>
        {activeCount > 0 && (
          <span className="tabular rounded-pill bg-primary px-2.5 py-1 text-xs font-semibold text-white">
            {activeCount}
          </span>
        )}
        <span aria-hidden="true" className="text-muted-foreground group-open:hidden">
          Mở
        </span>
        <span aria-hidden="true" className="hidden text-muted-foreground group-open:inline">
          Đóng
        </span>
      </summary>

      <div className="flex flex-col gap-5 border-t border-border p-3 md:p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="salesId">Nhân viên</Label>
            <select
              id="salesId"
              name={ADMIN_REPORT_PARAMS.SALES}
              defaultValue={filters.salesId ?? ''}
              className={SELECT_CLASS}
            >
              <option value="">Tất cả nhân viên</option>
              {salesOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.full_name}
                  {option.is_active ? '' : ' (đã nghỉ)'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="status">Trạng thái</Label>
            <select
              id="status"
              name={ADMIN_REPORT_PARAMS.STATUS}
              defaultValue={filters.status ?? ''}
              className={SELECT_CLASS}
            >
              <option value="">Mọi trạng thái</option>
              <option value="MORNING_SUBMITTED">{REPORT_STATUS_LABEL.MORNING_SUBMITTED}</option>
              <option value="COMPLETED">{REPORT_STATUS_LABEL.COMPLETED}</option>
            </select>
          </div>
        </div>

        <fieldset className="flex flex-col gap-4">
          <legend className="flex items-center gap-2 pb-1 text-sm font-semibold text-heading">
            <CalendarRange aria-hidden="true" className="size-4 text-primary" />
            Chọn thời gian chính xác
          </legend>
          <p className="text-sm text-muted-foreground">
            Nếu nhập nhiều loại, hệ thống ưu tiên một ngày, rồi khoảng ngày, sau đó mới đến tháng.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Một ngày</Label>
              <Input
                id="date"
                name={ADMIN_REPORT_PARAMS.DATE}
                type="date"
                defaultValue={filters.raw.date ?? ''}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="from">Từ ngày</Label>
              <Input
                id="from"
                name={ADMIN_REPORT_PARAMS.FROM}
                type="date"
                defaultValue={filters.raw.from ?? ''}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="to">Đến ngày</Label>
              <Input
                id="to"
                name={ADMIN_REPORT_PARAMS.TO}
                type="date"
                defaultValue={filters.raw.to ?? ''}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,20rem)_auto] md:items-end">
            <div className="flex flex-col gap-2">
              <Label htmlFor="month">Hoặc chọn tháng</Label>
              <Input
                id="month"
                name={ADMIN_REPORT_PARAMS.MONTH}
                type="month"
                defaultValue={
                  filters.dateMode === 'MONTH' || filters.dateMode === 'CURRENT_MONTH'
                    ? (filters.raw.month ?? '')
                    : ''
                }
              />
            </div>
            <Link
              href={adminReportsAllTimePath(filters)}
              className={buttonClassName({ variant: 'secondary', className: 'w-full md:w-auto' })}
            >
              <History aria-hidden="true" className="size-4" />
              Tất cả thời gian
              <LinkSpinner label="Đang mở toàn bộ lịch sử…" />
            </Link>
          </div>
        </fieldset>
      </div>
    </details>
  );
}
