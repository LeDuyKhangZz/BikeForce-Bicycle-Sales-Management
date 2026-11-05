import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AccountRowDialog } from '@/features/admin-accounts/account-row-dialog';
import { requireRole } from '@/features/auth/queries';
import { createClient } from '@/lib/supabase/server';
import { listSystemAccounts } from '@/services/profiles';

export const metadata: Metadata = { title: 'Tất cả tài khoản · BikeForce' };

const PAGE_SIZE = 50;

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const admin = await requireRole('ADMIN');
  const params = await searchParams;
  const parsedPage = Number(params.page ?? '1');
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const supabase = await createClient();
  const result = await listSystemAccounts(supabase, page, PAGE_SIZE);

  if (!result) {
    return <p role="alert" className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">Không tải được danh sách tài khoản. Vui lòng thử lại.</p>;
  }

  const pageCount = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const shownPage = Math.min(page, pageCount);
  const previousHref = shownPage > 1 ? `/admin/accounts?page=${shownPage - 1}` : null;
  const nextHref = shownPage < pageCount ? `/admin/accounts?page=${shownPage + 1}` : null;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">Tất cả tài khoản</h1>
          <p className="mt-1 text-sm text-muted-foreground">Danh sách tài khoản Admin và nhân viên trong hệ thống.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
          <Users aria-hidden="true" className="size-4 text-primary" />
          <span>{result.total.toLocaleString('vi-VN')} tài khoản</span>
        </div>
      </header>

      <Card flush className="overflow-hidden">
        {result.rows.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Chưa có tài khoản nào trong hệ thống.</p>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(7rem,0.7fr)_minmax(7rem,0.7fr)_8rem] gap-4 bg-background px-5 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase md:grid">
              <span>Họ và tên</span><span>Email</span><span>Mã nhân viên</span><span>Vai trò</span><span>Trạng thái</span>
            </div>
            <ul className="divide-y divide-border">
              {result.rows.map((account) => (
                <li key={account.id}>
                  <AccountRowDialog
                    accountId={account.id}
                    accountName={account.full_name}
                    email={account.email}
                    employeeCode={account.employee_code}
                    role={account.role}
                    isActive={account.is_active}
                    isCurrentUser={account.id === admin.id}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <nav aria-label="Phân trang tài khoản" className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Trang {shownPage} / {pageCount}</p>
        <div className="flex gap-2">
          {previousHref ? <Link href={previousHref} className={buttonClassName({ variant: 'secondary' })}><ChevronLeft aria-hidden="true" className="size-4" />Trang trước</Link> : <span className={buttonClassName({ variant: 'secondary', className: 'pointer-events-none opacity-50' })}><ChevronLeft aria-hidden="true" className="size-4" />Trang trước</span>}
          {nextHref ? <Link href={nextHref} className={buttonClassName({ variant: 'secondary' })}>Trang sau<ChevronRight aria-hidden="true" className="size-4" /></Link> : <span className={buttonClassName({ variant: 'secondary', className: 'pointer-events-none opacity-50' })}>Trang sau<ChevronRight aria-hidden="true" className="size-4" /></span>}
        </div>
      </nav>
    </div>
  );
}
