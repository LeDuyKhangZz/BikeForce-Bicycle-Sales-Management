import type { ReactNode } from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';

import { BrandMark } from '@/components/ui/brand-mark';
import { buttonClassName } from '@/components/ui/button';
import { MainNav } from '@/features/navigation/main-nav';
import { requireRole } from '@/features/auth/queries';
import { CustomerCareNotificationButton } from '@/features/customer-care/customer-care-notification-button';
import { ADMIN_NAV_ITEMS, ADMIN_SIDEBAR_ITEMS } from '@/lib/navigation/nav-items';
import { createClient } from '@/lib/supabase/server';
import { countPendingCareSubmissions, listPendingCareNotifications } from '@/services/customer-care';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole('ADMIN');
  const supabase = await createClient();
  const [pendingCareCount, pendingCareNotifications] = await Promise.all([
    countPendingCareSubmissions(supabase),
    listPendingCareNotifications(supabase),
  ]);

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:pl-56">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-card/85 shadow-xs supports-backdrop-filter:backdrop-blur-lg">
        <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:flex sm:gap-3">
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-md bg-accent/15 lg:hidden"
          >
            <BrandMark decorative className="w-7 text-accent" />
          </span>
          <div className="min-w-0 sm:flex-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              BikeForce · Quản trị
            </p>
            <p className="truncate text-base font-semibold tracking-tight text-heading">
              {profile.full_name}
            </p>
          </div>
          <div className="col-span-3 flex min-w-0 flex-wrap items-center justify-end gap-2 sm:contents">
            <Link
              href="/admin/report-previews"
              aria-label="Xem trước báo cáo nhân viên"
              title="Xem trước báo cáo nhân viên"
              className={buttonClassName({ variant: 'secondary', className: 'shrink-0 px-3 sm:px-4' })}
            >
              <Eye aria-hidden="true" className="size-4" />
              <span className="hidden md:inline">Xem trước</span>
            </Link>
            <CustomerCareNotificationButton
              pendingCount={pendingCareCount}
              notifications={pendingCareNotifications}
            />
          </div>
        </div>
      </header>

      <main className="w-full min-w-0 flex-1 animate-rise-in px-4 py-5 pb-28">
        {children}
      </main>

      <MainNav
        items={ADMIN_NAV_ITEMS}
        sidebarItems={ADMIN_SIDEBAR_ITEMS}
        label="Điều hướng Quản trị"
      />
    </div>
  );
}
