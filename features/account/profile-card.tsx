import { Card, CardTitle } from '@/components/ui/card';
import type { AccountProfile } from '@/services/profiles';

/**
 * Hồ sơ cá nhân — UC-11, FR-023.
 *
 * **Chỉ đọc, và không có form sửa** — `docs/06 §7 (b)`: brief §12 định nghĩa
 * `/sales/account` gồm đúng ba thứ (hồ sơ, đổi mật khẩu, đăng xuất), không có
 * FR nào cho màn hình sửa họ tên / số điện thoại. Hồ sơ do Admin quản lý
 * (UC-18, Phase 10).
 *
 * Đây là **thông tin chỉ đọc**, không phải ô nhập bị disable — trình bày dạng
 * `<dl>` chứ không phải `<input disabled>` (rule `read-only-distinction`).
 *
 * Dùng chung cho cả `/sales/account` và `/admin/account`, nên nó nhận
 * `AccountProfile` chứ không giả định vai nào.
 */

type Props = {
  profile: AccountProfile;
};

/**
 * Nhãn tiếng Việt của vai — từ vựng nghiệp vụ, chỉ có hai giá trị (DEC-030).
 *
 * Export từ PHASE 14 (DEC-063) để `/admin/account` dùng lại trong form sửa hồ
 * sơ. Chỉ có một bảng nhãn vai trong toàn dự án.
 */
export const ROLE_LABEL = {
  ADMIN: 'Quản trị viên',
  SALES: 'Nhân viên kinh doanh',
} as const;

/** Chuỗi thay thế khi trường tuỳ chọn còn trống — cùng quy ước `'—'` của `lib/`. */
const EMPTY_DISPLAY = '—';

export function ProfileCard({ profile }: Props) {
  const rows: ReadonlyArray<{ label: string; value: string }> = [
    { label: 'Họ và tên', value: profile.full_name },
    { label: 'Email', value: profile.email },
    { label: 'Số điện thoại', value: profile.phone ?? EMPTY_DISPLAY },
    { label: 'Mã nhân viên', value: profile.employee_code ?? EMPTY_DISPLAY },
    { label: 'Vai trò', value: ROLE_LABEL[profile.role] },
  ];

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle className="text-base">Hồ sơ của bạn</CardTitle>

      <dl className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            {/* Email dài xuống dòng chứ không cắt (rule truncation-strategy). */}
            <dd className="text-base font-medium break-words text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-sm text-muted-foreground">
        Cần sửa thông tin hồ sơ? Hãy liên hệ Admin — chỉ Admin mới đổi được các trường này.
      </p>
    </Card>
  );
}
