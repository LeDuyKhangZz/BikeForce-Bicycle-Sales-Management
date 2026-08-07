'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { LogIn } from 'lucide-react';

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
 */
export function LoginForm({ nextPath }: Props) {
  const [state, formAction, isPending] = useActionState<SignInState, FormData>(
    signInAction,
    null,
  );
  const [clientErrors, setClientErrors] = useState<Partial<Record<FieldName, string>>>({});
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
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {nextPath && <input type="hidden" name="next" value={nextPath} />}

      {formError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive bg-card px-3 py-3 text-sm text-destructive"
        >
          {formError}
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
        <Input
          ref={passwordRef}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          enterKeyHint="go"
          required
          disabled={isPending}
          invalid={Boolean(errorFor('password'))}
          aria-describedby={errorFor('password') ? 'password-error' : undefined}
          onBlur={(event) => validateOnBlur('password', event.currentTarget.value)}
        />
        {errorFor('password') && (
          <p id="password-error" role="alert" className="text-sm text-destructive">
            {errorFor('password')}
          </p>
        )}
      </div>

      {/* Disable khi đang gửi để chống double submit (rule loading-buttons). */}
      <Button type="submit" size="lg" disabled={isPending} aria-busy={isPending}>
        <LogIn aria-hidden="true" className="size-5" />
        {isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </Button>
    </form>
  );
}
