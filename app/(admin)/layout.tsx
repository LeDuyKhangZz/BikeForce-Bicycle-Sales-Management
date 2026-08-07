import type { ReactNode } from 'react';

import { SignOutButton } from '@/features/auth/sign-out-button';
import { requireRole } from '@/features/auth/queries';

/**
 * LỚP 2 — guard server-side cho toàn bộ route group `(admin)` (FR-004, DEC-004).
 * Xem giải thích đầy đủ ở `app/(sales)/layout.tsx`.
 *
 * Sidebar từ 1024px + bottom nav 4 mục (DEC-018) thuộc Phase 8 — chưa dựng ở đây.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole('ADMIN');

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">BikeForce · Quản trị</p>
            <p className="truncate text-base font-semibold text-heading">{profile.full_name}</p>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-20">{children}</main>
    </div>
  );
}
