import { redirect } from 'next/navigation';

import { getCurrentProfile } from '@/features/auth/queries';
import { LOGIN_PATH, dashboardPathFor } from '@/lib/auth/routes';

/**
 * `/` không có nội dung riêng — nó chỉ phân luồng theo role.
 *
 * `middleware.ts` đã xử lý trường hợp này trước khi request tới đây; trang này
 * là lớp phòng thủ thứ hai, tồn tại để `/` vẫn đúng nếu `matcher` của middleware
 * bị sửa nhầm (DEC-004: defense in depth).
 */
export default async function RootPage() {
  const profile = await getCurrentProfile();

  if (!profile || !profile.is_active) {
    redirect(LOGIN_PATH);
  }

  redirect(dashboardPathFor(profile.role));
}
