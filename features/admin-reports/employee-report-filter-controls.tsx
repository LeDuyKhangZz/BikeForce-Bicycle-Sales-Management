'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  ADMIN_REPORT_PARAMS,
  ADMIN_REPORTS_PATH,
  MAX_SEARCH_LENGTH,
} from '@/lib/reports/admin-filters';
import { REPORT_STATUS_LABEL } from '@/lib/reports/report-status';
import type { SalesOption } from '@/services/profiles';
import type { Database } from '@/types/database.types';

type ReportStatus = Database['public']['Enums']['report_status'];

type Props = {
  salesId: string;
  month: string;
  isCurrentMonth: boolean;
  status: ReportStatus | null;
  salesOptions: readonly SalesOption[];
};

const SELECT_CLASS =
  'min-h-12 w-full rounded-md border border-input-border/70 bg-background px-3.5 text-base text-foreground transition-[background-color,border-color,box-shadow] duration-200 focus:bg-card focus:shadow-brand-sm sm:w-48';

export function EmployeeReportFilterControls({
  salesId,
  month,
  isCurrentMonth,
  status,
  salesOptions,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState('');

  const buildUrl = (nextSalesId: string | null, nextStatus: string, nextSearch?: string) => {
    const params = new URLSearchParams();
    if (!isCurrentMonth) {
      params.set(ADMIN_REPORT_PARAMS.MONTH, month);
    }
    if (nextSalesId) {
      params.set(ADMIN_REPORT_PARAMS.SALES, nextSalesId);
    }
    if (nextStatus === 'MORNING_SUBMITTED' || nextStatus === 'COMPLETED') {
      params.set(ADMIN_REPORT_PARAMS.STATUS, nextStatus);
    }
    if (nextSearch) {
      params.set(ADMIN_REPORT_PARAMS.SEARCH, nextSearch);
    }
    const qs = params.toString();
    return qs === '' ? ADMIN_REPORTS_PATH : `${ADMIN_REPORTS_PATH}?${qs}`;
  };

  const handleStatusChange = (nextStatus: string) => {
    startTransition(() => {
      router.push(buildUrl(salesId, nextStatus));
    });
  };

  const applyEmployeeSearch = (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (trimmed === '') return;

    const normalized = trimmed.toLocaleLowerCase('vi-VN');
    const exactMatch = salesOptions.find(
      (option) =>
        option.full_name.toLocaleLowerCase('vi-VN') === normalized ||
        (option.employee_code !== null &&
          option.employee_code.toLocaleLowerCase('vi-VN') === normalized),
    );
    const partialMatch =
      exactMatch ??
      salesOptions.find((option) =>
        option.full_name.toLocaleLowerCase('vi-VN').includes(normalized),
      );

    startTransition(() => {
      if (partialMatch) {
        setQuery('');
        router.push(buildUrl(partialMatch.id, status ?? ''));
      } else {
        router.push(buildUrl(null, status ?? '', trimmed));
      }
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        applyEmployeeSearch(query);
      }}
      className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center"
    >
      <select
        aria-label="Lọc trạng thái báo cáo"
        value={status ?? ''}
        onChange={(event) => handleStatusChange(event.target.value)}
        className={SELECT_CLASS}
      >
        <option value="">Tất cả trạng thái</option>
        <option value="COMPLETED">{REPORT_STATUS_LABEL.COMPLETED}</option>
        <option value="MORNING_SUBMITTED">{REPORT_STATUS_LABEL.MORNING_SUBMITTED}</option>
      </select>

      <div className="relative sm:w-64">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          aria-label="Tìm kiếm nhân viên"
          list="admin-report-employee-options"
          value={query}
          onChange={(event) => {
            const nextValue = event.target.value;
            setQuery(nextValue);
            const exact = salesOptions.find(
              (option) => option.full_name === nextValue.trim(),
            );
            if (exact) {
              applyEmployeeSearch(exact.full_name);
            }
          }}
          maxLength={MAX_SEARCH_LENGTH}
          placeholder="Tìm kiếm nhân viên..."
          enterKeyHint="search"
          className="pl-10"
        />
        <datalist id="admin-report-employee-options">
          {salesOptions.map((option) => (
            <option key={option.id} value={option.full_name}>
              {option.employee_code ?? undefined}
            </option>
          ))}
        </datalist>
      </div>
    </form>
  );
}
