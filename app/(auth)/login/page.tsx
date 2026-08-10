import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AlertTriangle, ClipboardCheck, ImageDown, Target } from 'lucide-react';

import { BrandLockup, BrandMark } from '@/components/ui/brand-mark';
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
 * Ba điều app THẬT SỰ làm — không phải khẩu hiệu marketing.
 *
 * Mỗi dòng ở đây phải soi được về đúng một chức năng đã có trong v1, nếu không
 * thì trang đăng nhập đang hứa một thứ mà sản phẩm không giao (Master Spec §71
 * cấm tự thêm phạm vi, kể cả bằng chữ trên màn hình).
 */
const HIGHLIGHTS = [
  {
    icon: Target,
    title: 'Cam kết KPI đầu ngày',
    detail: 'Bốn chỉ tiêu: viếng thăm, doanh số, doanh thu công nợ, khách hàng đã gặp.',
  },
  {
    icon: ClipboardCheck,
    title: 'Nhập thực đạt cuối ngày',
    detail: 'Hệ thống tự đối chiếu cam kết với thực đạt thành một báo cáo duy nhất.',
  },
  {
    icon: ImageDown,
    title: 'Xuất ảnh 9:16 gửi Zalo',
    detail: 'Một chạm là có ảnh báo cáo đúng khổ điện thoại, không cần chụp màn hình.',
  },
] as const;

/**
 * `/login` — DEC-017 (route là `/login`, KHÔNG phải `/auth/login`).
 *
 * Là Server Component: chỉ phần form là `'use client'`. Đã có phiên hợp lệ thì
 * đi thẳng về dashboard đúng vai (`docs/06 §3.1` quy tắc 4) — middleware cũng
 * làm việc này, đây là lớp phòng thủ thứ hai.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  PHASE 13b (DEC-054) — VÌ SAO BỐ CỤC CHIA ĐÔI TỪ 1024px
 * ─────────────────────────────────────────────────────────────────────────
 *  Bản trước là **một cột `max-w-md` canh giữa ở MỌI bề rộng**. Trên điện thoại
 *  nó ổn. Trên laptop 1440px thì 1.100px hai bên là khoảng trắng chết, và mắt
 *  đọc ra "một biểu mẫu bị bỏ quên giữa trang", không phải "màn hình mở đầu của
 *  một sản phẩm". Đó chính là thứ người dùng gọi là xấu.
 *
 *  Từ `lg` trở lên: cột trái là **mặt thương hiệu** (nền xanh đậm của logo, ba
 *  điều app làm), cột phải là form. Dưới `lg` cột trái **biến mất hoàn toàn** —
 *  KHÔNG thu nhỏ, KHÔNG xếp chồng: trên 375px mọi pixel phải dùng để đăng nhập
 *  cho nhanh, và cuộn qua một khối quảng cáo trước khi thấy ô Email là phản tác
 *  dụng (mobile-first, CLAUDE.md §3 điều 9).
 *
 *  Tương phản đã ĐO, không ước lượng: chữ trắng trên nền `heading` (#0B4A76) là
 *  **8,66:1**; chỗ sáng nhất của vệt sáng xanh còn **5,21:1** — cả hai vượt AA.
 *  Vì vậy cột trái dùng `text-white` ĐẶC ở mọi dòng chữ; phân cấp bằng cỡ và độ
 *  đậm, KHÔNG bằng `text-white/70` (đo được chỉ 3,7:1 — trượt AA).
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
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr] xl:grid-cols-[1.2fr_1fr]">
      {/*
        CỘT THƯƠNG HIỆU — chỉ tồn tại từ 1024px.

        `bg-heading` là NỀN ĐẶC, còn hai vệt sáng nằm ở lớp phủ riêng bên trong.
        Tách làm hai lớp là có chủ đích: mọi phép đo tương phản (axe, và bộ đo
        của `e2e/ui-quality.spec.ts`) leo cây tổ tiên tìm màu nền đầu tiên KHÔNG
        trong suốt — để gradient trực tiếp trên phần tử chứa chữ thì phép đo đọc
        trúng nền của cha và cho ra con số sai (bài học ISSUE-018).
      */}
      <aside className="relative hidden overflow-hidden bg-heading text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div aria-hidden="true" className="auth-brand-aura pointer-events-none absolute inset-0" />

        {/* Hình xe cỡ lớn làm hoa văn nền — cắt bớt ở mép để đọc ra "chi tiết
            phóng to" chứ không phải "logo bị đặt sai chỗ". */}
        <BrandMark
          decorative
          className="pointer-events-none absolute -right-16 -bottom-20 w-104 text-white/8"
        />

        <div className="relative">
          <BrandLockup size="lg" tone="inverse" />
        </div>

        <div className="relative max-w-lg">
          <p className="text-4xl font-bold tracking-tight text-balance text-white">
            Một báo cáo ngày. Gửi Zalo trong một chạm.
          </p>

          <ul className="mt-10 flex flex-col gap-6">
            {HIGHLIGHTS.map(({ icon: Icon, title, detail }) => (
              <li key={title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="grid size-11 shrink-0 place-items-center rounded-md bg-white/15"
                >
                  <Icon className="size-5 text-white" />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-semibold text-white">{title}</span>
                  <span className="mt-0.5 block text-sm text-white">{detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white">
          Ứng dụng nội bộ · Tài khoản do Admin cấp
        </p>
      </aside>

      {/* CỘT FORM — là toàn bộ trang ở dưới 1024px. */}
      <main className="flex min-h-dvh flex-col justify-center px-4 py-10 lg:min-h-0 lg:px-10 xl:px-16">
        <div className="mx-auto flex w-full max-w-md animate-rise-in flex-col gap-6">
          {/* Logo chỉ hiện dưới 1024px: từ 1024px cột trái đã mang thương hiệu,
              để cả hai là gắn thương hiệu hai lần trên cùng một khung nhìn. */}
          <header className="flex flex-col items-center gap-3 text-center lg:hidden">
            <BrandLockup size="lg" />
            <p className="text-base text-balance text-muted-foreground">
              Báo cáo hiệu suất bán hàng hằng ngày.
            </p>
          </header>

          {reasonMessage && (
            <p
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-warning/40 bg-status-near-bg px-3.5 py-3 text-sm font-medium text-status-near-fg"
            >
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4.5 shrink-0" />
              <span>{reasonMessage}</span>
            </p>
          )}

          {/*
            Vạch màu 6px ở mép trên thẻ. Đây là chi tiết rẻ nhất mà đổi được nhiều
            nhất: một mặt trắng bo góc có một vệt màu thương hiệu đọc ra "có
            thiết kế", còn mặt trắng trơn đọc ra "hộp thoại hệ thống". Nó thuần
            trang trí nên không phải đo tương phản.
          */}
          <Card flush className="overflow-hidden rounded-xl shadow-lg">
            <div
              aria-hidden="true"
              className="h-1.5 bg-primary bg-linear-to-r from-primary via-secondary to-accent"
            />
            <div className="p-5 sm:p-6">
              <h1 className="text-2xl font-bold tracking-tight text-heading">Đăng nhập</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Dùng email và mật khẩu do Admin cấp.
              </p>

              <div className="mt-6">
                <LoginForm nextPath={nextPath} />
              </div>
            </div>
          </Card>

          {/*
            BR-012 / FR-006: KHÔNG có self-registration. Không render link "Đăng ký",
            và signup cũng đã bị tắt ở tầng cấu hình Supabase Auth — tắt ở frontend
            là không đủ vì endpoint /auth/v1/signup vẫn mở với anon key.
          */}
          <p className="text-center text-sm text-balance text-muted-foreground">
            Chưa có tài khoản? Hệ thống không cho tự đăng ký — vui lòng liên hệ Admin.
          </p>
        </div>
      </main>
    </div>
  );
}
