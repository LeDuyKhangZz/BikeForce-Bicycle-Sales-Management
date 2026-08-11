'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signInSchema } from '@/lib/validation/auth';

import { signInAction, type SignInState } from './actions';

type Props = {
  /** Đường dẫn quay lại sau khi đăng nhập, đã được server làm sạch. */
  nextPath: string | null;
};

type FieldName = 'email' | 'password';

/**
 * Form đăng nhập — UC-01, FR-001.
 *
 * `'use client'` là bắt buộc ở đây (state form + validate on blur), nhưng nó chỉ
 * bọc đúng phần tương tác: trang `/login` vẫn là Server Component (AGENTS.md §4).
 *
 * Validate phía client dùng **chính** `signInSchema` của Server Action — một
 * nguồn, không hai bản (AGENTS.md §9). Client validate chỉ để UX; server luôn
 * validate lại.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  PHASE 13b (DEC-054) — NÚT HIỆN MẬT KHẨU
 * ─────────────────────────────────────────────────────────────────────────
 *  Sales gõ mật khẩu bằng một ngón, ngoài nắng, trên bàn phím ảo 375px — nơi
 *  gõ nhầm là chuyện thường và không có cách nào kiểm tra lại. Không có nút
 *  hiện, cách duy nhất để sửa là xoá sạch rồi gõ lại từ đầu.
 *
 *  Ba ràng buộc bắt buộc, cả ba đều đã làm ở dưới:
 *    • `type="button"` — quên thì nó submit form (chính là lý do `Button` của
 *      dự án mặc định `type="button"`);
 *    • `aria-label` đổi theo trạng thái + `aria-pressed` — nút chỉ có icon thì
 *      screen reader không có gì để đọc (rule `aria-labels`, mức CRITICAL);
 *    • vùng chạm 44×44px thật, nằm TRONG ô nhập nhưng KHÔNG đè lên chữ — ô có
 *      `pr-14` đúng bằng chỗ nút chiếm.
 *
 *  Mặc định LUÔN là ẩn. Nút này không bao giờ được nhớ trạng thái sang lần sau.
 */
export function LoginForm({ nextPath }: Props) {
  const [state, formAction, isPending] = useActionState<SignInState, FormData>(
    signInAction,
    null,
  );
  const [clientErrors, setClientErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const serverFieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const formError = state && !state.ok && state.code !== 'VALIDATION' ? state.message : null;

  const errorFor = (field: FieldName): string | undefined =>
    clientErrors[field] ?? serverFieldErrors[field]?.[0];

  // Đưa focus về ô lỗi đầu tiên sau khi server trả lỗi validate (AGENTS.md §10).
  useEffect(() => {
    if (!state || state.ok) return;
    if (state.fieldErrors?.email) emailRef.current?.focus();
    else if (state.fieldErrors?.password) passwordRef.current?.focus();
  }, [state]);

  /** Validate ON BLUR, không validate từng phím (rule inline-validation). */
  function validateOnBlur(field: FieldName, value: string) {
    const result = signInSchema.shape[field].safeParse(value);
    setClientErrors((prev) => ({
      ...prev,
      [field]: result.success ? undefined : result.error.issues[0]?.message,
    }));
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {nextPath && <input type="hidden" name="next" value={nextPath} />}

      {/* Lỗi cấp form có ICON, không chỉ có màu đỏ — rule `color-only`: trạng
          thái không bao giờ được truyền đạt bằng riêng màu sắc. */}
      {formError && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-destructive/40 bg-status-missed-bg px-3.5 py-3 text-sm font-medium text-status-missed-fg"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4.5 shrink-0" />
          <span>{formError}</span>
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email" required>
          Email
        </Label>
        <Input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          enterKeyHint="next"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="ten@congty.com"
          required
          disabled={isPending}
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
          Mật khẩu
        </Label>
        <div className="relative">
          <Input
            ref={passwordRef}
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            enterKeyHint="go"
            required
            disabled={isPending}
            invalid={Boolean(errorFor('password'))}
            aria-describedby={errorFor('password') ? 'password-error' : undefined}
            onBlur={(event) => validateOnBlur('password', event.currentTarget.value)}
            className="pr-14"
          />
          <button
            type="button"
            onClick={() => setShowPassword((previous) => !previous)}
            disabled={isPending}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={showPassword}
            aria-controls="password"
            className="absolute inset-y-0 right-0 grid w-13 place-items-center rounded-r-md text-muted-foreground transition-colors duration-200 ease-out-soft hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="size-5" />
            ) : (
              <Eye aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
        {errorFor('password') && (
          <p id="password-error" role="alert" className="text-sm text-destructive">
            {errorFor('password')}
          </p>
        )}
      </div>

      {/* Disable khi đang gửi để chống double submit (rule loading-buttons). */}
      <Button
        type="submit"
        size="lg"
        className="mt-1"
        loading={isPending}
        loadingText="Đang đăng nhập…"
      >
        <LogIn aria-hidden="true" className="size-5" />
        Đăng nhập
      </Button>
    </form>
  );
}
