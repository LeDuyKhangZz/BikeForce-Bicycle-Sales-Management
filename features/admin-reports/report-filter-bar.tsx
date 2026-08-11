import Link from 'next/link';
import Form from 'next/form';
import { FilterX, Search } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LinkSpinner } from '@/components/ui/link-spinner';
import { PendingSubmitButton } from '@/components/ui/pending-submit-button';
import {
  ADMIN_REPORT_PARAMS,
  ADMIN_REPORTS_PATH,
  hasActiveFilters,
  MAX_SEARCH_LENGTH,
  type AdminReportFilters,
} from '@/lib/reports/admin-filters';
import { REPORT_STATUS_LABEL } from '@/lib/reports/report-status';
import type { SalesOption } from '@/services/profiles';

/**
 * Bộ lọc của `/admin/reports` — FR-025, UC-13, AF-03.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  MỘT `<form method="get">`, KHÔNG PHẢI STATE CỦA REACT
 * ─────────────────────────────────────────────────────────────────────────
 *  Form GET tự đẩy mọi ô nhập lên query string, nên đây vẫn là **Server
 *  Component** — không `'use client'`, không `useState`, không `router.push`.
 *  Ba thứ có được miễn phí nhờ vậy:
 *    • bộ lọc **bookmark và chia sẻ được** (rule `deep-linking`);
 *    • quay lại từ màn hình chi tiết **giữ nguyên** bộ lọc (rule
 *      `state-preservation`) — vì nó nằm trên URL chứ không trong bộ nhớ tab;
 *    • lọc vẫn chạy khi JavaScript chưa kịp tải, điều rất hay gặp trên 3G ngoài
 *      thị trường.
 *
 *  `page` cố ý KHÔNG có ô ẩn: đổi bộ lọc thì phải quay về trang 1, và cách chắc
 *  chắn nhất là để tham số đó rụng khỏi URL.
 *
 * Giá trị hiển thị lấy từ `filters.raw` đã CHUẨN HOÁ, không phải chuỗi URL thô —
 * nhờ vậy `?date=abc` không quay lại ô nhập dưới dạng rác.
 */

type Props = {
  filters: AdminReportFilters;
  salesOptions: readonly SalesOption[];
};

/** Cùng chiều cao 48px với `Input` — rule `readable-font-size` + touch target. */
const SELECT_CLASS =
  'min-h-12 w-full rounded-lg border border-input-border bg-card px-3 text-base text-foreground';

export function ReportFilterBar({ filters, salesOptions }: Props) {
  return (
    <Card className="flex flex-col gap-4">
      <Form action={ADMIN_REPORTS_PATH} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="q">Tìm theo tên Sales</Label>
          <Input
            id="q"
            name={ADMIN_REPORT_PARAMS.SEARCH}
            type="search"
            defaultValue={filters.search ?? ''}
            maxLength={MAX_SEARCH_LENGTH}
            placeholder="Ví dụ: Khang"
            enterKeyHint="search"
            autoCapitalize="none"
          />
        </div>

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

        {/*
          Ba chiều ngày cùng nằm trong một form. Nếu Admin điền nhiều chiều thì
          `parseAdminReportFilters` chọn chiều HẸP NHẤT (ngày → khoảng → tháng)
          và có unit test khoá lại — component không tự quyết.
        */}
        <fieldset className="flex flex-col gap-4">
          <legend className="pb-2 text-sm font-medium text-foreground">Khoảng thời gian</legend>

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

          <div className="flex flex-col gap-2 md:max-w-xs">
            <Label htmlFor="month">Hoặc cả tháng</Label>
            <Input
              id="month"
              name={ADMIN_REPORT_PARAMS.MONTH}
              type="month"
              defaultValue={filters.raw.month ?? ''}
            />
          </div>
        </fieldset>

        <div className="flex flex-col gap-2 md:flex-row">
          <PendingSubmitButton pendingText="Đang lọc báo cáo…">
            <Search aria-hidden="true" className="size-5" />
            Áp dụng bộ lọc
          </PendingSubmitButton>

          {/* Chỉ hiện khi có gì để xoá — không bày control vô dụng. */}
          {hasActiveFilters(filters) && (
            <Link
              href={ADMIN_REPORTS_PATH}
              className={buttonClassName({ variant: 'secondary', size: 'lg' })}
            >
              <FilterX aria-hidden="true" className="size-5" />
              Xoá lọc
              <LinkSpinner label="Đang xoá bộ lọc…" />
            </Link>
          )}
        </div>
      </Form>
    </Card>
  );
}
