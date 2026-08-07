import type { ReactNode } from 'react';

import { SignOutButton } from '@/features/auth/sign-out-button';
import { requireRole } from '@/features/auth/queries';

/**
 * LỚP 2 — guard server-side cho toàn bộ route group `(sales)` (FR-004, DEC-004).
 *
 * Không tin middleware đã chặn: layout là nơi ĐỌC dữ liệu cho cả group, nên nếu
 * role sai mà layout vẫn render thì dữ liệu đã lộ trước khi RLS kịp chặn ở query
 * con (`docs/06 §5.3`).
 *
 * Bottom nav 3 mục của Sales (DEC-018) thuộc Phase 7 — chưa dựng ở đây.
 */
export default async function SalesLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole('SALES');

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">BikeForce · Sales</p>
            <p className="truncate text-base font-semibold text-heading">{profile.full_name}</p>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-20">{children}</main>
    </div>
  );
}
