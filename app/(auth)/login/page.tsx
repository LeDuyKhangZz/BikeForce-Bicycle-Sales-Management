import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { BrandLockup } from '@/components/ui/brand-mark';
import { Card } from '@/components/ui/card';
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
    /*
      PHASE 13 (DEC-053) — trang đăng nhập là bộ mặt đầu tiên của sản phẩm.

      Bản cũ đặt logo, chữ và form trực tiếp lên nền trang, nên nó đọc ra như
      một biểu mẫu nội bộ. Nay form nằm trong một **thẻ nổi có bóng** trên nền
      chuyển sắc thương hiệu — cùng ngôn ngữ với phần còn lại của app, và tự nói
      "đây là một sản phẩm" trước khi người dùng gõ ký tự đầu tiên.
    */
    <main className="mx-auto flex min-h-dvh w-full max-w-md animate-rise-in flex-col justify-center gap-6 px-4 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        {/* Logo đứng riêng một dòng, hình cam + chữ xanh đúng logo gốc (DEC-046).
            `<h1>` bọc lấy lockup để cấp bậc heading vẫn là h1 → không phá
            `heading-hierarchy`. */}
        <h1>
          <BrandLockup size="lg" />
        </h1>
        <p className="text-base text-balance text-muted-foreground">
          Báo cáo hiệu suất bán hàng hằng ngày. Đăng nhập bằng tài khoản do Admin cấp.
        </p>
      </header>

      {reasonMessage && (
        <p
          role="alert"
          className="rounded-md border border-warning bg-status-near-bg px-3.5 py-3 text-sm font-medium text-status-near-fg"
        >
          {reasonMessage}
        </p>
      )}

      <Card className="p-5 shadow-lg sm:p-6">
        <LoginForm nextPath={nextPath} />
      </Card>

      {/*
        BR-012 / FR-006: KHÔNG có self-registration. Không render link "Đăng ký",
        và signup cũng đã bị tắt ở tầng cấu hình Supabase Auth — tắt ở frontend
        là không đủ vì endpoint /auth/v1/signup vẫn mở với anon key.
      */}
      <p className="text-center text-sm text-balance text-muted-foreground">
        Chưa có tài khoản? Hệ thống không cho tự đăng ký — vui lòng liên hệ Admin.
      </p>
    </main>
  );
}
