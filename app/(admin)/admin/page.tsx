import type { Metadata } from 'next';

import { Card, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/features/auth/queries';

export const metadata: Metadata = {
  title: 'Tổng quan · BikeForce',
};

/**
 * `/admin` — ĐÍCH ĐẾN sau khi Admin đăng nhập.
 *
 * ⚠ ĐÂY LÀ TRANG TỐI THIỂU CỦA PHASE 2, KHÔNG PHẢI FR-024.
 * 12 chỉ số dashboard (Master Spec §16) và cảnh báo Sales chưa báo cáo (AF-02)
 * là **UC-12 / FR-024 — Phase 8**. Trang này tồn tại để luồng đăng nhập của
 * Phase 2 có đích đến thật và test được.
 */
export default async function AdminDashboardPage() {
  const profile = await requireRole('ADMIN');

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight text-heading">Tổng quan</h1>

      <Card className="flex flex-col gap-2">
        <CardTitle>Tài khoản</CardTitle>
        <dl className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Họ tên</dt>
            <dd className="text-right font-medium text-foreground">{profile.full_name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-right break-all font-medium text-foreground">{profile.email}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <p className="text-sm text-muted-foreground">
          12 chỉ số toàn đội, danh sách báo cáo và quản lý tài khoản Sales sẽ có ở Phase 8 đến
          Phase 10.
        </p>
      </Card>
    </div>
  );
}
