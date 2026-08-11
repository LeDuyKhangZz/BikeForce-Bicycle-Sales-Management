import type { Metadata } from 'next';

import { Card, CardTitle } from '@/components/ui/card';
import { ChangePasswordForm } from '@/features/account/change-password-form';
import { OwnProfileForm } from '@/features/account/own-profile-form';
import { ROLE_LABEL } from '@/features/account/profile-card';
import { requireRole } from '@/features/auth/queries';
import { SignOutButton } from '@/features/auth/sign-out-button';
import { createClient } from '@/lib/supabase/server';
import { getAccountProfile } from '@/services/profiles';

export const metadata: Metadata = {
  title: 'Tài khoản · BikeForce',
};

/**
 * `/admin/account` — UC-11, FR-023. Cùng ba khối với `/sales/account`
 * (`docs/05 §9`: "như `/sales/account`").
 *
 * Dùng lại nguyên `ChangePasswordForm` của Phase 7 — nó cố ý không giả định vai
 * nào.
 *
 * ⚠ **PHASE 14 (DEC-063) — khối hồ sơ ở đây KHÔNG còn giống `/sales/account`.**
 * Trang này dùng `OwnProfileForm` (sửa được họ tên / SĐT / mã NV), còn
 * `/sales/account` giữ `ProfileCard` chỉ đọc. Khác biệt đó là **chủ ý**: hồ sơ
 * Sales do Admin quản lý (UC-18, FR-031), còn Admin không có ai ở trên để nhờ.
 *
 * `changePasswordAction` gọi `auth.updateUser()`, hàm này **luôn** sửa người
 * đang đăng nhập và không nhận `userId`, nên nó an toàn cho cả hai vai mà không
 * cần nhánh riêng. Đổi mật khẩu người khác là UC-18 (Phase 10) và đi đường
 * `lib/supabase/admin.ts` (DEC-005).
 */
export default async function AdminAccountPage() {
  const sessionProfile = await requireRole('ADMIN');

  const supabase = await createClient();
  const profile = await getAccountProfile(supabase, sessionProfile.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight text-heading">Tài khoản</h1>

      {profile === null ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            Không tải được hồ sơ lúc này. Vui lòng thử lại.
          </p>
        </Card>
      ) : (
        /*
         * PHASE 14 (DEC-063) — Admin SỬA ĐƯỢC hồ sơ của chính mình.
         *
         * `/sales/account` vẫn là `ProfileCard` chỉ đọc, và đó là chủ ý: hồ sơ
         * Sales do Admin quản lý (UC-18). Còn Admin thì trước đây bị màn hình
         * này bảo "hãy liên hệ Admin" — tự nói với chính mình — trong khi UC-18
         * lọc `role = 'SALES'` nên không có đường nào sửa hồ sơ Admin cả.
         */
        <Card className="flex flex-col gap-3">
          <CardTitle className="text-base">Hồ sơ của bạn</CardTitle>
          <OwnProfileForm
            initialValues={{
              full_name: profile.full_name,
              // `null` ⇒ chuỗi rỗng: `defaultValue` của `<input>` không nhận
              // `null`, và schema quy chuỗi rỗng ngược về `null` khi lưu.
              phone: profile.phone ?? '',
              employee_code: profile.employee_code ?? '',
            }}
            readOnly={{ email: profile.email, roleLabel: ROLE_LABEL[profile.role] }}
          />
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <CardTitle className="text-base">Đổi mật khẩu</CardTitle>
        <ChangePasswordForm />
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle className="text-base">Phiên đăng nhập</CardTitle>
        <p className="text-sm text-muted-foreground">
          Đăng xuất khỏi thiết bị này. Dữ liệu báo cáo của đội không bị ảnh hưởng.
        </p>
        <SignOutButton />
      </Card>
    </div>
  );
}
