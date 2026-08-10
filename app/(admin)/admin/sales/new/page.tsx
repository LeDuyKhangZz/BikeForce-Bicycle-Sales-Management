import type { Metadata } from 'next';

import { BackLink } from '@/components/ui/back-link';
import { Card, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/features/auth/queries';
import { CreateSalesForm } from '@/features/admin-sales-management/create-sales-form';

export const metadata: Metadata = {
  title: 'Tạo tài khoản Sales · BikeForce',
};

/**
 * `/admin/sales/new` — UC-17, FR-030, AF-07.
 *
 * Đây là **cách duy nhất** để một tài khoản mới xuất hiện trong hệ thống: không
 * có self-registration ở bất kỳ đâu (FR-006, BR-012), và `POST /auth/v1/signup`
 * đã bị tắt ở cấu hình Supabase Auth.
 *
 * Mọi tài khoản tạo ở đây đều là `SALES`. Vai `ADMIN` **không** đặt được từ giao
 * diện — `handle_new_user()` cố ý bỏ qua `role` trong `user_metadata` vì client
 * sửa được metadata bằng `auth.updateUser()`. Admin đầu tiên được nâng quyền một
 * lần duy nhất bằng SQL theo runbook `docs/09 §10`.
 */
export default async function CreateSalesPage() {
  await requireRole('ADMIN');

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink href="/admin/sales">Về danh sách nhân viên</BackLink>
        <h1 className="text-2xl font-bold tracking-tight text-heading">Tạo tài khoản Sales</h1>
      </div>

      <Card className="flex flex-col gap-3">
        <CardTitle className="text-base">Thông tin tài khoản</CardTitle>
        <p className="text-sm text-muted-foreground">
          Hệ thống không gửi email. Sau khi tạo xong, hãy chép mật khẩu tạm và bàn giao trực tiếp
          cho nhân viên — mật khẩu chỉ hiện đúng một lần.
        </p>
        <CreateSalesForm />
      </Card>
    </div>
  );
}
