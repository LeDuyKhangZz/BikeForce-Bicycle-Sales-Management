'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { CheckCircle2, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PASSWORD_MIN_LENGTH } from '@/lib/validation/account';
import { createSalesSchema } from '@/lib/validation/sales-account';

import { createSalesAccount, type CreateSalesState } from './actions';

/**
 * Form tạo tài khoản Sales — UC-17, FR-030.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  MẬT KHẨU TẠM HIỆN ĐÚNG MỘT LẦN
 * ─────────────────────────────────────────────────────────────────────────
 *  `docs/01 §12.3` bước 6: Admin bàn giao mật khẩu tạm cho Sales qua kênh nội
 *  bộ. Hệ thống **không** gửi email (không có luồng email nào ở v1), nên nếu
 *  Admin rời trang mà chưa chép mật khẩu thì không có cách nào lấy lại — phải
 *  đặt lại mật khẩu.
 *
 *  Vì vậy: sau khi tạo thành công, form **không** điều hướng đi đâu (khác
 *  DEC-037 của luồng cuối ngày), và mật khẩu vừa nhập được giữ nguyên trên màn
 *  hình kèm một câu nhắc rõ ràng. Admin tự bấm "Tạo người tiếp theo" khi đã
 *  chép xong.
 *
 * Validate phía client dùng **chính** `createSalesSchema` của Server Action —
 * một nguồn, không hai bản (AGENTS.md §9).
 */

type FieldName = 'email' | 'password' | 'full_name' | 'phone' | 'employee_code';

export function CreateSalesForm() {
  const [state, formAction, isPending] = useActionState<CreateSalesState, FormData>(
    createSalesAccount,
    null,
  );
  const [clientErrors, setClientErrors] = useState<Partial<Record<FieldName, string>>>({});
  /**
   * Mật khẩu tạm vừa gửi, giữ lại để hiện **một lần** sau khi tạo xong.
   *
   * Bắt ở `handleSubmit` (event handler) chứ không đọc `ref.current` lúc render:
   * React Compiler cấm đọc ref trong thân component (`react-hooks/refs`), và
   * đúng như cảnh báo đó — giá trị đọc kiểu ấy không tham gia vòng render nên
   * có thể lệch với những gì đang hiển thị.
   *
   * Server **không** gửi mật khẩu ngược về: nó đi một chiều lên GoTrue và không
   * có lý do gì để quay lại qua payload của Server Action.
   */
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);

  const serverFieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const formError = state && !state.ok && state.code !== 'VALIDATION' ? state.message : null;
  const created = state?.ok ? state.data : null;

  const errorFor = (field: FieldName): string | undefined =>
    clientErrors[field] ?? serverFieldErrors[field]?.[0];

  /** Effect CHỈ chạm DOM — React Compiler chặn `setState` trong effect. */
  useEffect(() => {
    if (!state || state.ok) return;
    if (state.fieldErrors?.email) emailRef.current?.focus();
    else if (state.fieldErrors?.full_name) fullNameRef.current?.focus();
  }, [state]);

  function handleSubmit(formData: FormData) {
    setClientErrors({});
    // Bắt mật khẩu tạm TRƯỚC khi gửi — sau khi thành công, form bị thay bằng
    // màn hình bàn giao và ô nhập không còn trong DOM nữa.
    const password = formData.get('password');
    setTemporaryPassword(typeof password === 'string' ? password : '');
    formAction(formData);
  }

  /** Validate ON BLUR, không validate từng phím (rule `inline-validation`). */
  function validateOnBlur(field: FieldName, value: string) {
    const result = createSalesSchema.shape[field].safeParse(value);
    setClientErrors((prev) => ({
      ...prev,
      [field]: result.success ? undefined : result.error.issues[0]?.message,
    }));
  }

  if (created !== null) {
    return (
      <div className="flex flex-col gap-4">
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-border bg-status-exceeded-bg px-3 py-3 text-sm text-status-exceeded-fg"
        >
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{created.notice}</span>
        </p>

        <dl className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Email đăng nhập</dt>
            <dd className="font-medium break-all text-foreground">{created.email}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Mật khẩu tạm</dt>
            <dd className="font-medium break-all text-foreground">{temporaryPassword}</dd>
          </div>
        </dl>

        <p className="text-sm text-muted-foreground">
          Hãy chép mật khẩu tạm và bàn giao cho nhân viên ngay bây giờ — rời trang này là không xem
          lại được nữa.
        </p>

        <Button size="lg" variant="secondary" onClick={() => window.location.reload()}>
          <UserPlus aria-hidden="true" className="size-5" />
          Tạo người tiếp theo
        </Button>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4" noValidate>
      {formError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive bg-card px-3 py-3 text-sm text-destructive"
        >
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="full_name" required>
          Họ và tên
        </Label>
        <Input
          ref={fullNameRef}
          id="full_name"
          name="full_name"
          required
          disabled={isPending}
          enterKeyHint="next"
          invalid={Boolean(errorFor('full_name'))}
          aria-describedby={errorFor('full_name') ? 'full_name-error' : undefined}
          onBlur={(event) => validateOnBlur('full_name', event.currentTarget.value)}
        />
        {errorFor('full_name') && (
          <p id="full_name-error" role="alert" className="text-sm text-destructive">
            {errorFor('full_name')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email" required>
          Email đăng nhập
        </Label>
        <Input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          disabled={isPending}
          enterKeyHint="next"
          invalid={Boolean(errorFor('email'))}
          aria-describedby={errorFor('email') ? 'email-error' : undefined}
          onBlur={(event) => validateOnBlur('email', event.currentTarget.value)}
        />
        {errorFor('email') && (
          <p id="email-error" role="alert" className="text-sm text-destructive">
            {errorFor('email')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" required>
          Mật khẩu tạm
        </Label>
        <Input
          id="password"
          name="password"
          // `type="text"` là CỐ Ý: Admin phải đọc được để chép lại và bàn giao.
          // Đây không phải mật khẩu của chính họ, và ô này không tự điền.
          type="text"
          autoComplete="off"
          required
          disabled={isPending}
          enterKeyHint="next"
          invalid={Boolean(errorFor('password'))}
          aria-describedby={errorFor('password') ? 'password-error' : 'password-hint'}
          onBlur={(event) => validateOnBlur('password', event.currentTarget.value)}
        />
        {errorFor('password') ? (
          <p id="password-error" role="alert" className="text-sm text-destructive">
            {errorFor('password')}
          </p>
        ) : (
          <p id="password-hint" className="text-sm text-muted-foreground">
            Tối thiểu {PASSWORD_MIN_LENGTH} ký tự. Nhân viên tự đổi lại ở màn hình Tài khoản.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Số điện thoại</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          disabled={isPending}
          enterKeyHint="next"
          invalid={Boolean(errorFor('phone'))}
          aria-describedby={errorFor('phone') ? 'phone-error' : undefined}
          onBlur={(event) => validateOnBlur('phone', event.currentTarget.value)}
        />
        {errorFor('phone') && (
          <p id="phone-error" role="alert" className="text-sm text-destructive">
            {errorFor('phone')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="employee_code">Mã nhân viên</Label>
        <Input
          id="employee_code"
          name="employee_code"
          autoComplete="off"
          autoCapitalize="characters"
          disabled={isPending}
          enterKeyHint="done"
          invalid={Boolean(errorFor('employee_code'))}
          aria-describedby={errorFor('employee_code') ? 'employee_code-error' : undefined}
          onBlur={(event) => validateOnBlur('employee_code', event.currentTarget.value)}
        />
        {errorFor('employee_code') && (
          <p id="employee_code-error" role="alert" className="text-sm text-destructive">
            {errorFor('employee_code')}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" disabled={isPending} aria-busy={isPending}>
        <UserPlus aria-hidden="true" className="size-5" />
        {isPending ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
      </Button>
    </form>
  );
}
