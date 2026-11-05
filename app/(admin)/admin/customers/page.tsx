import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactRound, Search, UsersRound } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { requireRole } from '@/features/auth/queries';
import { createClient } from '@/lib/supabase/server';
import { listOperationalCustomers } from '@/services/operational-customers';
import { parsePageParam } from '@/lib/reports/pagination';
import { formatCustomerCount } from '@/lib/operations/customer-directory';

export const metadata: Metadata = { title: 'Danh bạ CRM · BikeForce' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Props = { searchParams: SearchParams };

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pageHref(page: number, search: string): string {
  const params = new URLSearchParams();
  if (search) params.set('q', search);
  params.set('page', String(page));
  return `/admin/customers?${params.toString()}`;
}

export default async function AdminCustomersPage({ searchParams }: Props) {
  await requireRole('ADMIN');
  const params = await searchParams;
  const search = (firstValue(params.q) ?? '').trim().slice(0, 60);
  const page = parsePageParam(firstValue(params.page));
  const supabase = await createClient();
  const { rows, pageInfo } = await listOperationalCustomers(supabase, { page, search: search || null });

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-xl bg-status-info-bg text-primary">
            <ContactRound className="size-6" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-wide text-accent-text uppercase">AMIS CRM · Tất cả khách hàng</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-heading">Danh bạ khách hàng</h1>
            <p className="mt-1 text-sm text-muted-foreground">Danh sách đồng bộ riêng từ AMIS CRM, không phải Report 119.</p>
          </div>
        </div>
        <span className="inline-flex min-h-10 items-center rounded-full bg-status-exceeded-bg px-3 text-sm font-semibold text-status-exceeded-fg">
          {formatCustomerCount(pageInfo.total)} khách hàng
        </span>
      </header>

      <Card className="p-4">
        <form action="/admin/customers" method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="customer-search" className="mb-1.5 block text-sm font-medium">Tìm theo tên hoặc mã khách hàng</label>
            <input
              id="customer-search"
              name="q"
              type="search"
              defaultValue={search}
              maxLength={60}
              placeholder="Nhập tên hoặc mã khách hàng"
              className="min-h-12 w-full rounded-md border border-input-border bg-background px-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-4 text-base font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <Search aria-hidden="true" className="size-4" /> Tìm kiếm
          </button>
        </form>
      </Card>

      {rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <UsersRound aria-hidden="true" className="size-8 text-muted-foreground" />
          <p className="font-semibold text-heading">Không tìm thấy khách hàng</p>
          <p className="text-sm text-muted-foreground">Thử từ khóa khác hoặc xóa bộ lọc tìm kiếm.</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-3">
            {rows.map((customer) => (
              <Card key={customer.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.65fr)] sm:items-center">
                <div className="min-w-0">
                  <h2 className="break-words font-semibold text-heading">{customer.customer_name}</h2>
                  <p className="mt-1 break-all text-sm text-muted-foreground">Mã: {customer.customer_code ?? 'Chưa có mã'}</p>
                </div>
                <div className="min-w-0 text-sm sm:text-right">
                  <p className="break-words font-medium text-foreground">{customer.phone_raw ?? customer.phone ?? 'Chưa có điện thoại'}</p>
                  {customer.phone_raw !== null && customer.phone === null && (
                    <p className="mt-1 text-xs text-status-near-fg">Số gốc AMIS · chưa chuẩn hóa</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
          <nav aria-label="Phân trang danh bạ CRM" className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Hiển thị {formatCustomerCount(pageInfo.rangeStart)}–{formatCustomerCount(pageInfo.rangeEnd)} trong {formatCustomerCount(pageInfo.total)} khách hàng
            </p>
            <div className="flex items-center gap-2">
              {pageInfo.hasPrev && <Link href={pageHref(pageInfo.page - 1, search)} className="inline-flex min-h-11 items-center rounded-md border border-input-border px-4 text-sm font-medium">Trước</Link>}
              <span className="px-2 text-sm tabular-nums text-muted-foreground">{pageInfo.page}/{pageInfo.pageCount}</span>
              {pageInfo.hasNext && <Link href={pageHref(pageInfo.page + 1, search)} className="inline-flex min-h-11 items-center rounded-md border border-input-border px-4 text-sm font-medium">Sau</Link>}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
