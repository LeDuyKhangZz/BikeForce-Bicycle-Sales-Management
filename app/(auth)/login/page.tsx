import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/features/auth/login-form';
import { getCurrentProfile } from '@/features/auth/queries';
import { messageForLoginReason } from '@/lib/auth/messages';
import { dashboardPathFor, sanitizeNextPath } from '@/lib/auth/routes';

export const metadata: Metadata = {
  title: 'Đăng nhập · BikeForce',
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * `/login` — DEC-017 (route là `/login`, KHÔNG phải `/auth/login`).
 *
 * Là Server Component: chỉ phần form là `'use client'`. Đã có phiên hợp lệ thì
 * đi thẳng về dashboard đúng vai (`docs/06 §3.1` quy tắc 4) — middleware cũng
 * làm việc này, đây là lớp phòng thủ thứ hai.
 */
export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;

  const profile = await getCurrentProfile();
  if (profile?.is_active) {
    redirect(dashboardPathFor(profile.role));
  }

  const nextPath = sanitizeNextPath(firstValue(params.next));
  const reasonMessage = messageForLoginReason(firstValue(params.reason));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-heading">BikeForce</h1>
        <p className="text-base text-muted-foreground">
          Báo cáo hiệu suất bán hàng hằng ngày. Đăng nhập bằng tài khoản do Admin cấp.
        </p>
      </header>

      {reasonMessage && (
        <p
          role="alert"
          className="rounded-lg border border-warning bg-card px-3 py-3 text-sm text-warning"
        >
          {reasonMessage}
        </p>
      )}

      <LoginForm nextPath={nextPath} />

      {/*
        BR-012 / FR-006: KHÔNG có self-registration. Không render link "Đăng ký",
        và signup cũng đã bị tắt ở tầng cấu hình Supabase Auth — tắt ở frontend
        là không đủ vì endpoint /auth/v1/signup vẫn mở với anon key.
      */}
      <p className="text-sm text-muted-foreground">
        Chưa có tài khoản? Hệ thống không cho tự đăng ký — vui lòng liên hệ Admin.
      </p>
    </main>
  );
}
