'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { signOutAction } from './actions';

/**
 * Nút Đăng xuất ở GÓC TRÊN BÊN PHẢI của header — PHASE 13, nhóm A.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO NÓ QUAY LẠI, VÀ VÌ SAO KHÔNG PHẢI BẢN Ở `/…/account`
 * ─────────────────────────────────────────────────────────────────────────
 *  Phase 7/8 đã CỐ Ý bỏ nút này khỏi header với hai lý do ghi ngay trong layout:
 *  (a) đã có tab Tài khoản thì thành hai đường tới cùng một hành động; (b) nó
 *  chiếm mất chỗ của tên người dùng ở 375px.
 *
 *  Người dùng yêu cầu ngược lại, nên (a) không còn là lý do phản đối. Nhưng (b)
 *  là một vấn đề THẬT và vẫn phải giải, chứ không được bỏ qua:
 *    • dưới 640px nút **chỉ có icon**, `aria-label` mang câu đầy đủ cho screen
 *      reader — chiếm đúng 44px thay vì ~120px;
 *    • `shrink-0` để nút không bao giờ bị bóp méo, còn khối tên có `min-w-0` +
 *      `truncate` nên tên dài sẽ cắt bằng "…" thay vì đẩy nút ra khỏi màn hình.
 *
 *  Bước xác nhận giữ nguyên (`docs/06 §3.2`) và vẫn là **inline**, không
 *  `window.confirm()` — lý do đầy đủ ở `sign-out-button.tsx`. Ở đây panel xác
 *  nhận rơi xuống DƯỚI thanh header nên nó không bao giờ làm vỡ hàng ngang.
 */
export function HeaderSignOut() {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="shrink-0">
      <Button
        variant="secondary"
        aria-label="Đăng xuất"
        aria-expanded={confirming}
        onClick={() => setConfirming((previous) => !previous)}
        className="px-3 sm:px-4"
      >
        <LogOut aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">Đăng xuất</span>
      </Button>

      {confirming && (
        <div
          role="alert"
          className="absolute inset-x-0 top-full z-20 border-b border-border bg-card px-4 py-3 shadow-sm"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-end gap-2">
            <p className="mr-auto text-sm text-foreground">Đăng xuất khỏi BikeForce?</p>
            <form action={signOutAction}>
              <ConfirmSignOutButton />
            </form>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Huỷ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Tách riêng để gọi được `useFormStatus()` — hook đó chỉ đọc được trạng thái của
 * `<form>` khi nó nằm trong một component CON của form đó.
 *
 * Đăng xuất kết thúc bằng `redirect()` phía server nên nút sẽ sống thêm vài trăm
 * mili giây sau khi bấm; không khoá lại thì bấm hai lần là chuyện thường
 * (rule `loading-buttons`).
 */
function ConfirmSignOutButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="destructive" disabled={pending} aria-busy={pending}>
      {pending && (
        <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
      )}
      {pending ? 'Đang đăng xuất…' : 'Đăng xuất'}
    </Button>
  );
}
