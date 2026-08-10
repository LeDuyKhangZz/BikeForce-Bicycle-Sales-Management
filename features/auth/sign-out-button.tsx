'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { signOutAction } from './actions';
import { SignOutSubmit } from './sign-out-submit';

/**
 * Đăng xuất — UC-02, FR-003. Bản nằm TRONG trang `/…/account`.
 *
 * Có bước xác nhận theo `docs/06 §3.2` và rule `confirmation-dialogs` của
 * `docs/05`. Dùng xác nhận **inline** thay vì `window.confirm()`: hộp thoại
 * native không đọc được bằng screen reader một cách nhất quán và trên Zalo
 * in-app webview thì hiển thị rất khác nhau (NFR-009).
 *
 * `signOutAction` chạy trong Server Action nên cookie httpOnly mới thực sự bị
 * xoá phía server — làm ở client là không đủ.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  PHASE 13b (DEC-054) — VÌ SAO Ở ĐÂY LÀ KHỐI TẠI CHỖ, KHÔNG PHẢI POPOVER
 * ─────────────────────────────────────────────────────────────────────────
 *  Bản header là popover neo vào nút vì nút đó nằm trên một thanh dính, không
 *  có chỗ nào để nở ra. Ở đây thì ngược lại: nút nằm trong dòng chảy của trang,
 *  nên khối xác nhận **đẩy nội dung xuống** là hành vi đúng và rẻ nhất — không
 *  có lớp nổi nào phải quản lý focus, phím Esc hay bấm-ra-ngoài.
 *
 *  Bản trước là một hàng trần: câu hỏi, nút đỏ, chữ "Huỷ" trông y hệt một liên
 *  kết. Ba mảnh rời nhau, không có gì nói chúng thuộc về nhau. Nay chúng nằm
 *  trong một khối có viền và nền cảnh báo nhạt, nên đọc ra ĐÚNG MỘT câu hỏi.
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
    <div className="rounded-md border border-destructive/35 bg-status-missed-bg/60 p-3.5">
      {/* `role="alert"` chỉ bọc CÂU HỎI, không bọc cả khối. Bọc cả khối thì
          screen reader đọc luôn nhãn hai nút như thể chúng là một phần của
          thông báo, và người dùng nghe xong vẫn không biết phải làm gì. */}
      <p role="alert" className="text-base font-semibold tracking-tight text-heading">
        Đăng xuất khỏi BikeForce?
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Bạn sẽ cần đăng nhập lại bằng email và mật khẩu.
      </p>

      <div className="mt-3.5 flex flex-wrap gap-2">
        {/* Nút HUỶ đứng trước nút phá huỷ — ngón cái đi từ trái sang phải thì
            gặp lựa chọn an toàn trước (rule `destructive-nav-separation`). */}
        <Button variant="secondary" onClick={() => setConfirming(false)}>
          Huỷ
        </Button>
        <form action={signOutAction}>
          <SignOutSubmit />
        </form>
      </div>
    </div>
  );
}
