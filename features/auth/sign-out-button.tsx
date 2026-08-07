'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { signOutAction } from './actions';

/**
 * Đăng xuất — UC-02, FR-003.
 *
 * Có bước xác nhận theo `docs/06 §3.2` và rule `confirmation-dialogs` của
 * `docs/05`. Dùng xác nhận **inline** thay vì `window.confirm()`: hộp thoại
 * native không đọc được bằng screen reader một cách nhất quán và trên Zalo
 * in-app webview thì hiển thị rất khác nhau (NFR-009).
 *
 * `signOutAction` chạy trong Server Action nên cookie httpOnly mới thực sự bị
 * xoá phía server — làm ở client là không đủ.
 */
export function SignOutButton() {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="secondary" onClick={() => setConfirming(true)}>
        <LogOut aria-hidden="true" className="size-4" />
        Đăng xuất
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p role="alert" className="text-sm text-foreground">
        Đăng xuất khỏi BikeForce?
      </p>
      <form action={signOutAction}>
        <Button type="submit" variant="destructive">
          Đăng xuất
        </Button>
      </form>
      <Button variant="ghost" onClick={() => setConfirming(false)}>
        Huỷ
      </Button>
    </div>
  );
}
