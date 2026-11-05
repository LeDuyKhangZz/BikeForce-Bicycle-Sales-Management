'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Lock, Unlock, UserRound, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ROLE_LABEL } from '@/features/account/profile-card';

import { setSystemAccountActiveAction } from './actions';
import type { SetSystemAccountActiveState } from './types';

type Props = {
  accountId: string;
  accountName: string;
  email: string;
  employeeCode: string | null;
  role: 'ADMIN' | 'SALES';
  isActive: boolean;
  isCurrentUser: boolean;
};

export function AccountRowDialog({
  accountId,
  accountName,
  email,
  employeeCode,
  role,
  isActive,
  isCurrentUser,
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<SetSystemAccountActiveState, FormData>(
    setSystemAccountActiveAction,
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="grid w-full gap-2 px-4 py-4 text-left hover:bg-background focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-primary md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(7rem,0.7fr)_minmax(7rem,0.7fr)_8rem] md:items-center md:gap-4 md:px-5"
      >
        <span className="min-w-0 font-semibold text-foreground">{accountName}<span className="ml-2 text-xs font-normal text-primary md:hidden">Xem chi tiết</span><span className="block break-all text-sm font-normal text-muted-foreground md:hidden">{email}</span></span>
        <span className="hidden min-w-0 break-all text-sm text-foreground md:block">{email}</span>
        <span className="text-sm text-muted-foreground"><span className="md:hidden">Mã nhân viên: </span>{employeeCode ?? '—'}</span>
        <span className="text-sm text-foreground">{ROLE_LABEL[role]}</span>
        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? 'bg-status-exceeded-bg text-status-exceeded-fg' : 'bg-status-missed-bg text-status-missed-fg'}`}>
          {isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
        </span>
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`account-dialog-title-${accountId}`}
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <section className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl sm:p-6">
            <header className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><UserRound aria-hidden="true" className="size-6" /></span>
                <div className="min-w-0"><h2 id={`account-dialog-title-${accountId}`} className="text-lg font-bold text-heading">Thông tin tài khoản</h2><p className="break-words text-sm text-muted-foreground">{accountName}</p></div>
              </div>
              <Button ref={closeRef} variant="ghost" aria-label="Đóng" onClick={() => setOpen(false)} className="size-10 shrink-0 p-0"><X aria-hidden="true" className="size-5" /></Button>
            </header>

            <dl className="mt-5 grid gap-3 rounded-lg bg-background p-4 sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">Email</dt><dd className="break-all text-sm font-medium text-foreground">{email}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Mã nhân viên</dt><dd className="text-sm font-medium text-foreground">{employeeCode ?? '—'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Vai trò</dt><dd className="text-sm font-medium text-foreground">{ROLE_LABEL[role]}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Trạng thái</dt><dd className="text-sm font-medium text-foreground">{isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}</dd></div>
            </dl>

            {state && !state.ok && <p role="alert" className="mt-4 rounded-md bg-status-missed-bg p-3 text-sm text-status-missed-fg">{state.message}</p>}
            {state?.ok && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-status-exceeded-fg"><CheckCircle2 aria-hidden="true" className="size-4" />{state.data.notice}</p>}

            {isCurrentUser ? (
              <p className="mt-5 rounded-md bg-background p-3 text-sm text-muted-foreground">Đây là tài khoản bạn đang dùng nên không thể tự vô hiệu hóa.</p>
            ) : (
              <div className="mt-5 rounded-lg border border-border p-4">
                <p className="font-semibold text-foreground">{isActive ? 'Vô hiệu hóa tài khoản này?' : 'Mở lại tài khoản này?'}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isActive
                    ? 'Người này sẽ không thể đăng nhập; dữ liệu và báo cáo đã lưu vẫn được giữ.'
                    : 'Người này sẽ có thể đăng nhập và tiếp tục sử dụng hệ thống.'}
                </p>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button variant="secondary" onClick={() => setOpen(false)} disabled={isPending}>Hủy</Button>
                  <form action={formAction}>
                    <input type="hidden" name="account_id" value={accountId} />
                    <input type="hidden" name="is_active" value={isActive ? 'false' : 'true'} />
                    <Button type="submit" variant={isActive ? 'destructive' : 'primary'} loading={isPending} loadingText="Đang cập nhật…">
                      {isActive ? <Lock aria-hidden="true" className="size-4" /> : <Unlock aria-hidden="true" className="size-4" />}
                      {isActive ? 'Xác nhận vô hiệu hóa' : 'Xác nhận mở lại'}
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
