import type { Metadata } from 'next';

import { Card, CardTitle } from '@/components/ui/card';
import { ChangePasswordForm } from '@/features/account/change-password-form';
import { ProfileCard } from '@/features/account/profile-card';
import { requireRole } from '@/features/auth/queries';
import { SignOutButton } from '@/features/auth/sign-out-button';
import { createClient } from '@/lib/supabase/server';
import { getAccountProfile } from '@/services/profiles';

export const metadata: Metadata = {
  title: 'Tài khoản · BikeForce',
};

/**
 * `/sales/account` — UC-11, FR-023. Đúng ba khối theo brief §12: hồ sơ, đổi mật
 * khẩu, đăng xuất. **Không** có form sửa hồ sơ (`docs/06 §7 (b)`).
 *
 * `requireRole('SALES')` đã trả về hồ sơ phiên, nhưng nó cố ý hẹp (không có
 * `phone`) vì chạy ở mọi request. Màn hình này đọc thêm một truy vấn để lấy bản
 * đầy đủ — RLS `profiles_select_self_or_admin` chỉ cho đọc hồ sơ của chính
 * mình, nên `profile.id` từ phiên là đủ và cũng là giới hạn thật.
 */
export default async function SalesAccountPage() {
  const sessionProfile = await requireRole('SALES');

  const supabase = await createClient();
  const profile = await getAccountProfile(supabase, sessionProfile.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight text-heading">Tài khoản</h1>

      {profile === null ? (
        // Không tới được trong thực tế (`requireProfile()` đã chặn trước), nhưng
        // một trang trắng thì không nói được gì cho người dùng.
        <Card>
          <p className="text-sm text-muted-foreground">
            Không tải được hồ sơ lúc này. Vui lòng thử lại hoặc liên hệ Admin.
          </p>
        </Card>
      ) : (
        <ProfileCard profile={profile} />
      )}

      <Card className="flex flex-col gap-3">
        <CardTitle className="text-base">Đổi mật khẩu</CardTitle>
        <ChangePasswordForm />
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle className="text-base">Phiên đăng nhập</CardTitle>
        <p className="text-sm text-muted-foreground">
          Đăng xuất khỏi thiết bị này. Dữ liệu báo cáo đã lưu không bị ảnh hưởng.
        </p>
        <SignOutButton />
      </Card>
    </div>
  );
}
