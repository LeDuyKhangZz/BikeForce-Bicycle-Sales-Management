'use client';

import { useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { signOutAction } from './actions';
import { SignOutSubmit } from './sign-out-submit';

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
 *  là một vấn đề THẬT và vẫn phải giải, chứ không được bỏ qua: nút `shrink-0`
 *  để không bao giờ bị bóp méo, còn khối tên có `min-w-0` + `truncate` nên tên
 *  dài sẽ cắt bằng "…" thay vì đẩy nút ra khỏi màn hình.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  PHASE 13b (DEC-054) — TỪ "DẢI NGANG TOÀN CHIỀU RỘNG" THÀNH "THẺ NEO"
 * ─────────────────────────────────────────────────────────────────────────
 *  Bản trước đặt bước xác nhận vào một dải `absolute inset-x-0` chạy hết bề
 *  rộng màn hình. Trên điện thoại còn tạm; trên laptop 1440px thì câu hỏi nằm
 *  mãi bên trái còn hai nút nằm mãi bên phải, cách nhau cả nghìn pixel — mắt
 *  không nối được chúng thành một câu hỏi, và nó **che mất dòng đầu của nội
 *  dung** như một thanh lỗi hệ thống. Đó là chỗ người dùng gọi là xấu.
 *
 *  Nay là một thẻ nhỏ **neo ngay dưới chính cái nút vừa bấm**, có mũi nhọn chỉ
 *  lên nút đó. Quan hệ nguyên nhân–kết quả trở thành thứ nhìn thấy được, không
 *  phải thứ phải suy ra. Kèm theo là ba thứ mà một popover buộc phải có và bản
 *  cũ không có: **Esc để đóng**, **bấm ra ngoài để đóng**, và **focus tự vào
 *  panel rồi trả về nút khi đóng** (rule `modal-escape`, `keyboard-navigation`).
 *
 *  Vẫn là xác nhận **inline**, KHÔNG `window.confirm()` — hộp thoại native đọc
 *  không nhất quán bằng screen reader và hiển thị rất khác nhau trong webview
 *  Zalo (NFR-009). Lý do đầy đủ ở `sign-out-button.tsx`.
 */
export function HeaderSignOut() {
  const [confirming, setConfirming] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirming) return;

    // Focus vào nút AN TOÀN, không phải nút phá huỷ: mở panel rồi gõ Enter theo
    // quán tính thì kết quả phải là "không có gì xảy ra".
    cancelRef.current?.focus();

    function close(returnFocus: boolean) {
      setConfirming(false);
      if (returnFocus) triggerRef.current?.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close(true);
    }

    /*
      `pointerdown` chứ không phải `click`: panel đóng ngay lúc ngón tay chạm
      xuống, nên không có khoảnh khắc nào người dùng thấy nó còn đó sau khi đã
      quyết định bỏ đi. Chạm vào chính nút mở nằm TRONG `containerRef` nên
      không bị đóng ở đây — `onClick` của nút tự lo việc đóng, và nếu cả hai
      cùng chạy thì panel sẽ nhấp nháy mở-đóng.
    */
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) close(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [confirming]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button
        ref={triggerRef}
        variant="secondary"
        aria-label="Đăng xuất"
        aria-expanded={confirming}
        aria-haspopup="dialog"
        onClick={() => setConfirming((previous) => !previous)}
        className="px-3 sm:px-4"
      >
        <LogOut aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">Đăng xuất</span>
      </Button>

      {confirming && (
        <div
          role="dialog"
          aria-label="Xác nhận đăng xuất"
          /*
            `w-72` = 288px. Ở 375px, mép phải của nút cách mép màn hình đúng
            16px (`px-4` của header), nên panel còn dư 71px bên trái — không
            bao giờ tràn ngang (NFR-003), kể cả trên màn hình nhỏ nhất.
          */
          className="absolute top-[calc(100%+0.75rem)] right-0 z-40 w-72 animate-rise-in rounded-lg border border-border bg-card p-4 text-left shadow-lg"
        >
          {/* Mũi nhọn chỉ lên nút — hình vuông xoay 45°, chỉ tô hai cạnh trên
              và trái để nó liền mạch với viền của thẻ. */}
          <span
            aria-hidden="true"
            className="absolute -top-1.5 right-6 size-3 rotate-45 border-t border-l border-border bg-card"
          />

          <p className="text-base font-semibold tracking-tight text-heading">
            Đăng xuất khỏi BikeForce?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Bạn sẽ cần đăng nhập lại bằng email và mật khẩu.
          </p>

          {/*
            HAI NÚT XẾP DỌC, MỖI NÚT TRÀN HẾT BỀ RỘNG — không phải hai cột.

            Bản đầu xếp hai cột `grid-cols-2`; chụp ảnh ra thì thấy ngay chữ
            "Đăng xuất" **gãy làm hai dòng** trong ô rộng 128px, và ở trạng thái
            đang gửi thì nhãn còn dài hơn ("Đang đăng xuất…") nên nới bề rộng
            panel cũng không cứu được. Xếp dọc thì không có nhãn nào gãy dòng,
            ở bất kỳ độ dài nào.

            Thứ tự "hành động trước, Huỷ sau" là quy ước của action sheet trên cả
            iOS lẫn Android: nút trả lời thẳng câu hỏi vừa hỏi ngay bên trên.
            Đường thoát KHÔNG hề khó với tới — Esc, chạm ra ngoài, và chính nút
            Huỷ (đang được focus sẵn) đều huỷ.
          */}
          <div className="mt-4 flex flex-col gap-2">
            <form action={signOutAction}>
              <SignOutSubmit className="w-full" />
            </form>
            <Button
              ref={cancelRef}
              variant="secondary"
              onClick={() => setConfirming(false)}
              className="w-full"
            >
              Huỷ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
