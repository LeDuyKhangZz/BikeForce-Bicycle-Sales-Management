'use client';

import { useActionState, useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateOwnProfileSchema } from '@/lib/validation/account';

import { updateOwnProfileAction, type UpdateOwnProfileState } from './actions';

/**
 * Form Admin tự sửa hồ sơ của mình — PHASE 14, **DEC-063**.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO CÓ FORM NÀY, VÀ VÌ SAO CHỈ Ở `/admin/account`
 * ─────────────────────────────────────────────────────────────────────────
 *  Bản cũ của màn hình này là `ProfileCard` chỉ đọc, kết thúc bằng câu "Cần sửa
 *  thông tin hồ sơ? Hãy liên hệ Admin". Với Sales thì câu đó đúng — hồ sơ của
 *  họ do Admin quản lý (UC-18). Với **Admin** thì nó bảo họ đi liên hệ chính
 *  mình, và không có màn hình nào trong sản phẩm sửa được hồ sơ Admin: UC-18
 *  lọc `role = 'SALES'`. Tức là họ tên in trên mọi báo cáo của Admin bị khoá
 *  vĩnh viễn ở giá trị lúc tạo tài khoản.
 *
 *  `/sales/account` **giữ nguyên `ProfileCard` chỉ đọc** — đó vẫn là luật đúng.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  BA TRƯỜNG SỬA ĐƯỢC, HAI TRƯỜNG CHỈ ĐỌC — KHÁC NHAU VỀ BẢN CHẤT
 * ─────────────────────────────────────────────────────────────────────────
 *  Email và Vai trò vẫn hiển thị nhưng nằm ngoài form, dạng `<dl>` chứ KHÔNG
 *  phải `<input disabled>` (rule `read-only-distinction`): một ô nhập mờ đi
 *  trông như "tạm thời chưa sửa được", trong khi sự thật là **không bao giờ**
 *  sửa được ở đây — trigger `guard_profile_self_update()` chặn ở tầng database
 *  (BR-012, BR-025).
 *
 *  Khuôn form theo đúng `EditSalesForm` của UC-18: validate lúc `blur` phía
 *  client cho phản hồi nhanh, và server **luôn** validate lại (NFR-006).
 */

type FieldName = 'full_name' | 'phone' | 'employee_code';

type Props = {
  initialValues: { full_name: string; phone: string; employee_code: string };
  /** Chỉ để hiển thị — không đi kèm form, không ai ghi được từ client. */
  readOnly: { email: string; roleLabel: string };
};

export function OwnProfileForm({ initialValues, readOnly }: Props) {
  const [state, formAction, isPending] = useActionState<UpdateOwnProfileState, FormData>(
    updateOwnProfileAction,
    null,
  );
  const [clientErrors, setClientErrors] = useState<Partial<Record<FieldName, string>>>({});

  const serverFieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const formError = state && !state.ok && state.code !== 'VALIDATION' ? state.message : null;
  const notice = state?.ok ? state.data.notice : null;

  const errorFor = (field: FieldName): string | undefined =>
    clientErrors[field] ?? serverFieldErrors[field]?.[0];

  function handleSubmit(formData: FormData) {
    setClientErrors({});
    formAction(formData);
  }

  function validateOnBlur(field: FieldName, value: string) {
    const result = updateOwnProfileSchema.shape[field].safeParse(value);
    setClientErrors((prev) => ({
      ...prev,
      [field]: result.success ? undefined : result.error.issues[0]?.message,
    }));
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4" noValidate>
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
        <Label htmlFor="own_full_name" required>
          Họ và tên
        </Label>
        <Input
          id="own_full_name"
          name="full_name"
          defaultValue={initialValues.full_name}
          required
          disabled={isPending}
          enterKeyHint="next"
          invalid={Boolean(errorFor('full_name'))}
          aria-describedby={errorFor('full_name') ? 'own-full_name-error' : undefined}
          onBlur={(event) => validateOnBlur('full_name', event.currentTarget.value)}
        />
        {errorFor('full_name') && (
          <p id="own-full_name-error" role="alert" className="text-sm text-destructive">
            {errorFor('full_name')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="own_phone">Số điện thoại</Label>
        <Input
          id="own_phone"
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={initialValues.phone}
          disabled={isPending}
          enterKeyHint="next"
          invalid={Boolean(errorFor('phone'))}
          aria-describedby={errorFor('phone') ? 'own-phone-error' : undefined}
          onBlur={(event) => validateOnBlur('phone', event.currentTarget.value)}
        />
        {errorFor('phone') && (
          <p id="own-phone-error" role="alert" className="text-sm text-destructive">
            {errorFor('phone')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="own_employee_code">Mã nhân viên</Label>
        <Input
          id="own_employee_code"
          name="employee_code"
          defaultValue={initialValues.employee_code}
          autoCapitalize="characters"
          disabled={isPending}
          enterKeyHint="done"
          invalid={Boolean(errorFor('employee_code'))}
          aria-describedby={errorFor('employee_code') ? 'own-employee_code-error' : undefined}
          onBlur={(event) => validateOnBlur('employee_code', event.currentTarget.value)}
        />
        {errorFor('employee_code') && (
          <p id="own-employee_code-error" role="alert" className="text-sm text-destructive">
            {errorFor('employee_code')}
          </p>
        )}
      </div>

      {/*
        Hai trường KHÔNG sửa được. Để dạng `<dl>` ngay trong form để người dùng
        thấy đủ hồ sơ ở một chỗ, nhưng chúng không có `name` nên không bao giờ
        đi theo `FormData` — và Server Action cũng không đọc tới.
      */}
      <dl className="flex flex-col gap-3 border-t border-border/70 pt-4">
        <div className="flex flex-col gap-0.5">
          <dt className="text-sm text-muted-foreground">Email</dt>
          {/* Email dài xuống dòng chứ không cắt (rule truncation-strategy). */}
          <dd className="text-base font-medium break-words text-foreground">{readOnly.email}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-sm text-muted-foreground">Vai trò</dt>
          <dd className="text-base font-medium text-foreground">{readOnly.roleLabel}</dd>
        </div>
      </dl>

      <p className="text-sm text-muted-foreground">
        Email và vai trò không đổi được tại đây — đó là định danh đăng nhập và quyền truy cập.
      </p>

      <Button type="submit" size="lg" loading={isPending} loadingText="Đang lưu hồ sơ…">
        <Save aria-hidden="true" className="size-5" />
        Lưu hồ sơ
      </Button>
    </form>
  );
}
