import type { Metadata } from 'next';

import { Card, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/features/auth/queries';

export const metadata: Metadata = {
  title: 'Hôm nay · BikeForce',
};

/**
 * `/sales/today` — ĐÍCH ĐẾN sau khi Sales đăng nhập.
 *
 * ⚠ ĐÂY LÀ TRANG TỐI THIỂU CỦA PHASE 2, KHÔNG PHẢI FR-007.
 * Nội dung thật (trạng thái báo cáo hôm nay, ngày nghiệp vụ VN, đúng 1 CTA
 * chính theo `status`) là **UC-03 / FR-007 — Phase 3**. Trang này tồn tại để
 * luồng đăng nhập của Phase 2 có đích đến thật và test được.
 *
 * Cố ý CHƯA hiển thị ngày: `lib/date.ts` còn là khung, `getVietnamToday()` và
 * `formatVietnamDate()` đang `throw` cho tới Phase 5. Gọi vào sẽ nổ — và thà
 * không hiển thị còn hơn hiển thị một ngày tính sai múi giờ (BR-005).
 */
export default async function SalesTodayPage() {
  const profile = await requireRole('SALES');

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight text-heading">Hôm nay</h1>

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
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Mã nhân viên</dt>
            <dd className="text-right font-medium text-foreground tabular">
              {profile.employee_code ?? '—'}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <p className="text-sm text-muted-foreground">
          Màn hình cam kết đầu ngày và nhập thực đạt cuối ngày sẽ có ở Phase 3 và Phase 4.
        </p>
      </Card>
    </div>
  );
}
