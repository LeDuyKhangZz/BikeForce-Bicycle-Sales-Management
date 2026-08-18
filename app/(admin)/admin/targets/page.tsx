import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, UsersRound } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LinkPendingIcon } from '@/components/ui/link-pending-icon';
import { requireRole } from '@/features/auth/queries';
import {
  MonthlyTargetsForm,
  type TargetSalesRow,
} from '@/features/admin-targets/monthly-targets-form';
import { formatVietnamMonth, resolveVietnamMonth, shiftVietnamMonth } from '@/lib/date';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import { periodMonthOf } from '@/lib/validation/monthly-targets';
import { listMonthlyTargets, type MonthlyTargetRow } from '@/services/monthly-targets';
import { listSalesOptions } from '@/services/profiles';

export const metadata: Metadata = {
  title: 'Chỉ tiêu tháng · BikeForce',
};

const TARGETS_PATH = '/admin/targets';

/**
 * `/admin/targets` — DEC-071.
 *
 * Nơi Admin giao **chỉ tiêu THÁNG** (doanh số + doanh thu công nợ) cho từng
 * Sales. Trước màn hình này, hai con số đó chỉ đặt được bằng cách sửa thẳng
 * database.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  KHÁC HẲN CAM KẾT NGÀY — ĐỪNG GỘP HAI KHÁI NIỆM
 * ─────────────────────────────────────────────────────────────────────────
 *  `daily_reports.target_*` là cam kết NGÀY do Sales tự gõ mỗi sáng (DEC-030),
 *  và Admin **không** được sửa nó (BR-020). Bảng `sales_monthly_targets` là chỉ
 *  tiêu THÁNG công ty giao xuống. Hai thứ sống song song và không ai đè ai.
 *
 *  Cụm "Tình trạng thực hiện" của thẻ ảnh đọc chỉ tiêu THÁNG; nếu tháng đó chưa
 *  giao thì nó mới rơi về đường lùi cũ (chỉ tiêu AMIS / tổng cam kết ngày).
 *
 * ⚠ **Tháng sau ĐƯỢC phép mở**, khác `/admin/analytics`. Trang kia xem số liệu
 * đã xảy ra nên chặn tương lai theo BR-021; trang này **đặt kế hoạch**, mà giao
 * chỉ tiêu tháng sau trước khi tháng đó tới mới là việc bình thường.
 */

type Props = {
  searchParams: Promise<{ month?: string }>;
};

/** `MonthlyTargetRow[]` → `sales_id` → hai số, cho tra cứu O(1) ở form. */
function byId(rows: readonly MonthlyTargetRow[]) {
  return Object.fromEntries(
    rows.map((row) => [
      row.sales_id,
      { target_sales_amount: row.target_sales_amount, target_revenue: row.target_revenue },
    ]),
  );
}

export default async function AdminTargetsPage({ searchParams }: Props) {
  await requireRole('ADMIN');

  const params = await searchParams;
  const { month } = resolveVietnamMonth(params.month);
  const previousMonth = shiftVietnamMonth(month, -1);
  const nextMonth = shiftVietnamMonth(month, 1);

  const supabase = await createClient();

  /*
   * Ba truy vấn độc lập nhau nên chạy song song. Truy vấn thứ ba là tháng liền
   * trước — nó phục vụ nút "giữ nguyên chỉ tiêu tháng trước", và đọc sẵn ở đây
   * để cú bấm không phải chờ thêm một lượt round-trip.
   */
  const [salesList, currentRows, previousRows] = await Promise.all([
    listSalesOptions(supabase),
    listMonthlyTargets(supabase, periodMonthOf(month)),
    previousMonth === null
      ? Promise.resolve([])
      : listMonthlyTargets(supabase, periodMonthOf(previousMonth)),
  ]);

  const salesRows: TargetSalesRow[] = salesList.map((sales) => ({
    id: sales.id,
    full_name: sales.full_name,
    employee_code: sales.employee_code,
    is_active: sales.is_active,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-heading">Chỉ tiêu tháng</h1>
        <p className="text-sm text-muted-foreground">
          Chỉ tiêu doanh số và doanh thu công nợ công ty giao cho từng nhân viên. Khác với cam kết
          hằng ngày do nhân viên tự đặt.
        </p>
      </div>

      <Card className="flex items-center justify-between gap-2 py-2">
        <MonthLink
          href={previousMonth === null ? null : `${TARGETS_PATH}?month=${previousMonth}`}
          label="Tháng trước"
          icon={<ChevronLeft aria-hidden="true" className="size-5" />}
        />
        <p aria-live="polite" className="tabular text-base font-semibold text-heading">
          {formatVietnamMonth(month)}
        </p>
        <MonthLink
          href={nextMonth === null ? null : `${TARGETS_PATH}?month=${nextMonth}`}
          label="Tháng sau"
          icon={<ChevronRight aria-hidden="true" className="size-5" />}
        />
      </Card>

      {salesRows.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <UsersRound aria-hidden="true" className="size-12 text-muted-foreground" />
          <p className="text-base font-medium text-foreground">Chưa có nhân viên Sales nào</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Hãy tạo tài khoản nhân viên trước, sau đó quay lại đây để giao chỉ tiêu tháng.
          </p>
          <Link href="/admin/sales/new" className={buttonClassName({ variant: 'secondary' })}>
            Tạo tài khoản nhân viên
          </Link>
        </Card>
      ) : (
        <MonthlyTargetsForm
          // Đổi tháng là đổi hẳn bộ dữ liệu của form. `key` buộc React dựng lại
          // state từ đầu — nếu không, các ô vẫn giữ số của tháng vừa rời khỏi.
          key={month}
          month={month}
          monthLabel={formatVietnamMonth(month)}
          salesList={salesRows}
          currentTargets={byId(currentRows)}
          previousTargets={byId(previousRows)}
          previousMonthLabel={
            previousMonth === null ? 'tháng trước' : formatVietnamMonth(previousMonth)
          }
        />
      )}
    </div>
  );
}

/** Không export — chỉ dùng trong file này. Cùng quy ước với `/admin/analytics`. */
function MonthLink({
  href,
  label,
  icon,
}: {
  href: string | null;
  label: string;
  icon: React.ReactNode;
}) {
  const className = cn(buttonClassName({ variant: 'ghost' }), 'min-w-11');

  if (href === null) {
    return (
      <span aria-disabled="true" className={cn(className, 'cursor-not-allowed opacity-45')}>
        {icon}
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <Link href={href} className={className}>
      <LinkPendingIcon label={`Đang mở ${label.toLocaleLowerCase('vi-VN')}…`} className="size-5">
        {icon}
      </LinkPendingIcon>
      <span className="sr-only">{label}</span>
    </Link>
  );
}
