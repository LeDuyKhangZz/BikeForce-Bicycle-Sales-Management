'use client';

import { useFormStatus } from 'react-dom';
import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Nút GỬI của form đăng xuất — dùng chung cho cả hai chỗ xác nhận
 * (`header-sign-out.tsx` ở header và `sign-out-button.tsx` ở `/…/account`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO PHẢI LÀ MỘT COMPONENT RIÊNG, KHÔNG PHẢI `<Button>` THẲNG
 * ─────────────────────────────────────────────────────────────────────────
 *  `useFormStatus()` chỉ đọc được trạng thái của `<form>` khi nó được gọi từ
 *  một component **con** của form đó — gọi trong cùng component chứa `<form>`
 *  thì luôn trả `pending: false`.
 *
 *  Trạng thái đó không phải trang trí: `signOutAction` kết thúc bằng
 *  `redirect()` phía server, nên nút còn sống thêm vài trăm mili giây sau khi
 *  bấm. Không khoá lại thì bấm hai lần là chuyện thường (rule `loading-buttons`).
 *
 *  PHASE 13b (DEC-054) — trước đây bản ở `/…/account` KHÔNG có trạng thái này,
 *  bản ở header thì có. Gộp về một nơi để hai chỗ không bao giờ lệch nhau nữa.
 */
export function SignOutSubmit({ className }: { className?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="destructive"
      loading={pending}
      loadingText="Đang đăng xuất…"
      className={className}
    >
      <LogOut aria-hidden="true" className="size-4" />
      Đăng xuất
    </Button>
  );
}
