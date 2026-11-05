import type { Metadata } from 'next';
import { AtSign, BadgeCheck, Bell, ChevronDown, Clock3, KeyRound, PencilLine, Phone, UserRound } from 'lucide-react';

import { Card, CardTitle } from '@/components/ui/card';
import { ChangePasswordForm } from '@/features/account/change-password-form';
import { OwnProfileForm } from '@/features/account/own-profile-form';
import { ROLE_LABEL } from '@/features/account/profile-card';
import { SignOutButton } from '@/features/auth/sign-out-button';
import { requireRole } from '@/features/auth/queries';
import { createClient } from '@/lib/supabase/server';
import { getAccountProfile } from '@/services/profiles';

export const metadata: Metadata = {
  title: 'Tài khoản · BikeForce',
};

export default async function AdminAccountPage() {
  const sessionProfile = await requireRole('ADMIN');
  const supabase = await createClient();
  const profile = await getAccountProfile(supabase, sessionProfile.id);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">BikeForce · Quản trị</p>
          <h1 className="text-2xl font-bold tracking-tight text-heading">Tài khoản</h1>
        </div>
        <div className="flex items-center gap-4">
          <Bell aria-hidden="true" className="size-5 text-muted-foreground" />
          <span aria-hidden="true" className="h-8 border-l border-border" />
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg p-1.5 outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-primary">
              <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-primary font-semibold text-white">{profile?.full_name.slice(0, 1).toUpperCase() ?? 'A'}</span>
              <span className="text-sm">Xin chào,<br /><strong className="text-foreground">{profile?.full_name ?? 'Admin'}</strong></span>
              <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-border bg-card p-3 shadow-lg">
              <p className="mb-3 break-words text-sm text-muted-foreground">{profile?.email ?? 'Tài khoản quản trị'}</p>
              <SignOutButton />
            </div>
          </details>
        </div>
      </header>

      <section aria-label="Hồ sơ tài khoản" className="grid gap-3 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.4fr)]">
        <Card className="flex flex-col gap-5 p-5 sm:p-6">
          <CardTitle className="flex items-center gap-3"><UserRound className="size-6 text-primary" />Thông tin tài khoản</CardTitle>
          {profile === null ? (
            <p role="alert" className="text-sm text-muted-foreground">Không tải được hồ sơ lúc này. Vui lòng thử lại.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-[minmax(130px,0.7fr)_minmax(0,1fr)] sm:items-center">
              <div className="flex flex-col items-center gap-3 border-b border-border pb-5 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5">
                <div aria-hidden="true" className="grid size-28 place-items-center rounded-full bg-primary/10 text-primary ring-4 ring-primary/5">
                  <UserRound className="size-16" strokeWidth={1.5} />
                </div>
                <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">{ROLE_LABEL[profile.role]}</span>
              </div>
              <dl className="grid gap-4">
                <ProfileDetail icon={UserRound} label="Họ và tên" value={profile.full_name} />
                <ProfileDetail icon={Phone} label="Số điện thoại" value={profile.phone ?? '—'} />
                <ProfileDetail icon={AtSign} label="Email" value={profile.email} />
                <ProfileDetail icon={BadgeCheck} label="Mã nhân viên" value={profile.employee_code ?? '—'} />
              </dl>
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-5 p-5 sm:p-6">
          <CardTitle className="flex items-center gap-3"><PencilLine className="size-6 text-primary" />Chỉnh sửa thông tin</CardTitle>
          {profile ? (
            <OwnProfileForm
              initialValues={{ full_name: profile.full_name, phone: profile.phone ?? '', employee_code: profile.employee_code ?? '' }}
              readOnly={{ email: profile.email, roleLabel: ROLE_LABEL[profile.role] }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Biểu mẫu sẽ hiển thị khi tải được hồ sơ.</p>
          )}
        </Card>
      </section>

      <section aria-label="Bảo mật tài khoản" className="grid gap-3 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <Card className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-3"><KeyRound className="size-6 text-primary" /><div><CardTitle>Đổi mật khẩu</CardTitle><p className="mt-1 text-sm text-muted-foreground">Cập nhật mật khẩu để bảo vệ tài khoản.</p></div></div>
          <ChangePasswordForm />
        </Card>

        <Card className="flex flex-col gap-4 p-5 sm:p-6">
          <CardTitle className="flex items-center gap-3"><Clock3 className="size-6 text-primary" />Phiên đăng nhập</CardTitle>
          <div className="flex flex-1 flex-col justify-center gap-4 rounded-lg bg-background p-4">
            <div className="flex items-start gap-3">
              <span className="mt-1 size-2.5 shrink-0 rounded-full bg-emerald-500" />
              <div>
                <p className="font-semibold text-foreground">Phiên hiện tại đang hoạt động</p>
                <p className="mt-1 text-sm text-muted-foreground">Đăng xuất nếu bạn đang dùng thiết bị lạ hoặc muốn kết thúc phiên này.</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Hệ thống hiện chưa lưu lịch sử thiết bị và địa chỉ IP đăng nhập.</p>
        </Card>
      </section>
    </div>
  );
}

function ProfileDetail({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <Icon aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="break-words font-medium text-foreground">{value}</dd></div>
    </div>
  );
}
