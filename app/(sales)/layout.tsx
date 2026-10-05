import type { ReactNode } from 'react';

import { requireRole } from '@/features/auth/queries';
import { MainNav } from '@/features/navigation/main-nav';
import { SALES_NAV_ITEMS } from '@/lib/navigation/nav-items';

/**
 * Guard server-side cho toàn bộ route Sales. Header tài khoản được bỏ theo
 * yêu cầu UI; thao tác đăng xuất nằm trong `/sales/account`.
 */
export default async function SalesLayout({ children }: { children: ReactNode }) {
  await requireRole('SALES');

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:pl-56">
      <main className="mx-auto w-full max-w-3xl flex-1 animate-rise-in px-4 py-5 pb-28">
        {children}
      </main>
      <MainNav items={SALES_NAV_ITEMS} label="Điều hướng Sales" />
    </div>
  );
}
