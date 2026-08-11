'use client';

import { useActionState, useState } from 'react';
import { CheckCircle2, Lock, Unlock } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { toggleSalesActive, type ToggleSalesActiveState } from './actions';

/**
 * Bật/tắt quyền truy cập của một Sales — UC-19, FR-032, BR-009.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  CÓ BƯỚC XÁC NHẬN, VÀ XÁC NHẬN INLINE
 * ─────────────────────────────────────────────────────────────────────────
 *  Vô hiệu hoá là hành động **có hậu quả tức thì**: người đó bị chặn ở request
 *  kế tiếp, đang nhập báo cáo dở cũng mất quyền ghi. Rule `confirmation-dialogs`
 *  của `docs/05` yêu cầu xác nhận.
 *
 *  Xác nhận **inline** chứ không `window.confirm()`, cùng lý do với
 *  `SignOutButton` của Phase 2: hộp thoại native đọc không nhất quán bằng screen
 *  reader và hiển thị rất khác nhau trong webview (NFR-009).
 *
 * Dữ liệu báo cáo của người bị vô hiệu hoá **không** mất: BR-013 không cho xoá
 * báo cáo, và bảng hiệu suất vẫn hiện họ kèm nhãn "đã nghỉ". Nói rõ điều đó
 * trong câu xác nhận để Admin không ngần ngại một cách vô cớ.
 */

type Props = {
  salesId: string;
  salesName: string;
  isActive: boolean;
};

export function ToggleActiveButton({ salesId, salesName, isActive }: Props) {
  const [state, formAction, isPending] = useActionState<ToggleSalesActiveState, FormData>(
    toggleSalesActive,
    null,
  );
  const [confirming, setConfirming] = useState(false);

  const notice = state?.ok ? state.data.notice : null;
  const error = state && !state.ok ? state.message : null;

  return (
    <div className="flex flex-col gap-3">
      {notice && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-border bg-status-exceeded-bg px-3 py-3 text-sm text-status-exceeded-fg"
        >
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{notice}</span>
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive bg-card px-3 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {confirming ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <p role="alert" className="text-sm text-foreground">
            {isActive
              ? `Vô hiệu hoá tài khoản của ${salesName}? Người này sẽ không đăng nhập và không gửi báo cáo được nữa. Báo cáo đã lưu vẫn được giữ nguyên.`
              : `Mở lại quyền truy cập cho ${salesName}?`}
          </p>

          <div className="flex flex-wrap gap-2">
            <form action={formAction}>
              <input type="hidden" name="sales_id" value={salesId} />
              {/* Gửi trạng thái ĐÍCH, không phải trạng thái hiện tại — hai tab
                  cùng mở thì cả hai vẫn đi tới cùng một kết quả. */}
              <input type="hidden" name="is_active" value={isActive ? 'false' : 'true'} />
              <Button
                type="submit"
                variant={isActive ? 'destructive' : 'primary'}
                loading={isPending}
                loadingText={isActive ? 'Đang vô hiệu hoá…' : 'Đang mở lại…'}
              >
                {isActive ? (
                  <Lock aria-hidden="true" className="size-4" />
                ) : (
                  <Unlock aria-hidden="true" className="size-4" />
                )}
                {isActive ? 'Vô hiệu hoá' : 'Mở lại'}
              </Button>
            </form>

            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={isPending}>
              Huỷ
            </Button>
          </div>
        </div>
      ) : (
        <Button variant={isActive ? 'secondary' : 'primary'} onClick={() => setConfirming(true)}>
          {isActive ? (
            <Lock aria-hidden="true" className="size-4" />
          ) : (
            <Unlock aria-hidden="true" className="size-4" />
          )}
          {isActive ? 'Vô hiệu hoá tài khoản' : 'Mở lại quyền truy cập'}
        </Button>
      )}
    </div>
  );
}
