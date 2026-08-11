'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { CheckCircle2, KeyRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePasswordSchema, PASSWORD_MIN_LENGTH } from '@/lib/validation/account';

import { changePasswordAction, type ChangePasswordState } from './actions';

/**
 * Form đổi mật khẩu — UC-11, FR-023.
 *
 * `'use client'` chỉ bọc đúng phần tương tác; trang `/sales/account` vẫn là
 * Server Component (AGENTS.md §4).
 *
 * Validate phía client dùng **chính** `changePasswordSchema` của Server Action
 * — một nguồn, không hai bản (AGENTS.md §9). Client validate chỉ để UX; server
 * luôn validate lại (NFR-006).
 *
 * Câu xác nhận thành công lấy từ `state.data.notice` do **server** trả về, không
 * suy ra từ trạng thái form — đúng bài học DEC-034.
 */

type FieldName = 'password' | 'confirm_password';

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState<ChangePasswordState, FormData>(
    changePasswordAction,
    null,
  );
  const [clientErrors, setClientErrors] = useState<Partial<Record<FieldName, string>>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const serverFieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const formError = state && !state.ok && state.code !== 'VALIDATION' ? state.message : null;
  const notice = state?.ok ? state.data.notice : null;

  const errorFor = (field: FieldName): string | undefined =>
    clientErrors[field] ?? serverFieldErrors[field]?.[0];

  /**
   * Effect này CHỈ chạm DOM (`reset`, `focus`) — không có `setState` nào.
   *
   * React Compiler chặn `setState` trong effect (`react-hooks/set-state-in-effect`),
   * đúng bài học đã gặp ở Phase 3 với `useReportDraft`. Việc dọn `clientErrors`
   * vì vậy nằm ở `handleSubmit` bên dưới — một event handler, nơi đặt `setState`
   * là hợp lệ.
   */
  useEffect(() => {
    if (!state) return;

    // Thành công: dọn ô nhập để mật khẩu mới không nằm lại trong DOM.
    if (state.ok) {
      formRef.current?.reset();
      return;
    }

    // Lỗi validate: đưa focus về ô lỗi đầu tiên (AGENTS.md §10).
    if (state.fieldErrors?.password) passwordRef.current?.focus();
    else if (state.fieldErrors?.confirm_password) confirmRef.current?.focus();
  }, [state]);

  /**
   * Xoá lỗi client của lần gõ trước ngay khi gửi: sau khi đổi thành công, form
   * đã `reset()` nên một dòng lỗi cũ còn treo dưới ô trống là vô nghĩa.
   */
  function handleSubmit(formData: FormData) {
    setClientErrors({});
    formAction(formData);
  }

  /**
   * Validate ON BLUR, không validate từng phím (rule `inline-validation`).
   *
   * Ô nhập lại phải so với ô thứ nhất nên không kiểm riêng lẻ được — đọc thẳng
   * giá trị hiện tại của form và chạy cả schema, rồi chỉ lấy lỗi của ô vừa rời.
   */
  function validateOnBlur(field: FieldName) {
    const form = formRef.current;
    if (!form) return;

    const data = new FormData(form);
    const result = changePasswordSchema.safeParse({
      password: data.get('password'),
      confirm_password: data.get('confirm_password'),
    });

    const message = result.success
      ? undefined
      : result.error.issues.find((issue) => issue.path[0] === field)?.message;

    setClientErrors((prev) => ({ ...prev, [field]: message }));
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4" noValidate>
      {notice && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-border bg-status-exceeded-bg px-3 py-3 text-sm text-status-exceeded-fg"
        >
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{notice}</span>
        </p>
      )}

      {formError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive bg-card px-3 py-3 text-sm text-destructive"
        >
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" required>
          Mật khẩu mới
        </Label>
        <Input
          ref={passwordRef}
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          enterKeyHint="next"
          required
          disabled={isPending}
          invalid={Boolean(errorFor('password'))}
          aria-describedby={errorFor('password') ? 'password-error' : 'password-hint'}
          onBlur={() => validateOnBlur('password')}
        />
        {errorFor('password') ? (
          <p id="password-error" role="alert" className="text-sm text-destructive">
            {errorFor('password')}
          </p>
        ) : (
          <p id="password-hint" className="text-sm text-muted-foreground">
            Tối thiểu {PASSWORD_MIN_LENGTH} ký tự. Không bắt buộc chữ hoa hay ký tự đặc biệt.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm_password" required>
          Nhập lại mật khẩu mới
        </Label>
        <Input
          ref={confirmRef}
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          enterKeyHint="done"
          required
          disabled={isPending}
          invalid={Boolean(errorFor('confirm_password'))}
          aria-describedby={errorFor('confirm_password') ? 'confirm-password-error' : undefined}
          onBlur={() => validateOnBlur('confirm_password')}
        />
        {errorFor('confirm_password') && (
          <p id="confirm-password-error" role="alert" className="text-sm text-destructive">
            {errorFor('confirm_password')}
          </p>
        )}
      </div>

      {/* Disable khi đang gửi để chống double submit (rule loading-buttons). */}
      <Button
        type="submit"
        size="lg"
        loading={isPending}
        loadingText="Đang đổi mật khẩu…"
      >
        <KeyRound aria-hidden="true" className="size-5" />
        Đổi mật khẩu
      </Button>
    </form>
  );
}
