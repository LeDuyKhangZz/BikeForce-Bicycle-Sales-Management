'use client';

import { useActionState, useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateSalesSchema } from '@/lib/validation/sales-account';

import { updateSalesAccount, type UpdateSalesState } from './actions';

/**
 * Form sửa hồ sơ Sales — UC-18, FR-031.
 *
 * Ba trường, và **không có email**: đổi email là đổi định danh đăng nhập, phải
 * đồng bộ `auth.users.email` với `profiles.email` (BR-025). Không có FR nào yêu
 * cầu ở v1 nên cố ý để ngoài phạm vi thay vì cài một nửa — xem chú thích ở
 * `lib/validation/sales-account.ts`.
 *
 * Cũng **không có** `is_active` ở đây: bật/tắt quyền truy cập là một hành động
 * nghiệp vụ khác (UC-19), có nút riêng kèm xác nhận. Gộp vào form này thì một
 * cú bấm Lưu có thể vô tình khoá tài khoản người khác.
 */

type FieldName = 'full_name' | 'phone' | 'employee_code';

type Props = {
  salesId: string;
  initialValues: { full_name: string; phone: string; employee_code: string };
};

export function EditSalesForm({ salesId, initialValues }: Props) {
  const [state, formAction, isPending] = useActionState<UpdateSalesState, FormData>(
    updateSalesAccount,
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
    const result = updateSalesSchema.shape[field].safeParse(value);
    setClientErrors((prev) => ({
      ...prev,
      [field]: result.success ? undefined : result.error.issues[0]?.message,
    }));
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4" noValidate>
      {/* `sales_id` đi kèm form nhưng KHÔNG phải nguồn quyền: Server Action vẫn
          kiểm vai Admin, và policy `profiles_update_admin` mới là thứ chặn thật
          (AGENTS.md §8 — không tin dữ liệu từ client). */}
      <input type="hidden" name="sales_id" value={salesId} />

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
        <Label htmlFor="full_name" required>
          Họ và tên
        </Label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={initialValues.full_name}
          required
          disabled={isPending}
          enterKeyHint="next"
          invalid={Boolean(errorFor('full_name'))}
          aria-describedby={errorFor('full_name') ? 'edit-full_name-error' : undefined}
          onBlur={(event) => validateOnBlur('full_name', event.currentTarget.value)}
        />
        {errorFor('full_name') && (
          <p id="edit-full_name-error" role="alert" className="text-sm text-destructive">
            {errorFor('full_name')}
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
          defaultValue={initialValues.phone}
          disabled={isPending}
          enterKeyHint="next"
          invalid={Boolean(errorFor('phone'))}
          aria-describedby={errorFor('phone') ? 'edit-phone-error' : undefined}
          onBlur={(event) => validateOnBlur('phone', event.currentTarget.value)}
        />
        {errorFor('phone') && (
          <p id="edit-phone-error" role="alert" className="text-sm text-destructive">
            {errorFor('phone')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="employee_code">Mã nhân viên</Label>
        <Input
          id="employee_code"
          name="employee_code"
          defaultValue={initialValues.employee_code}
          autoCapitalize="characters"
          disabled={isPending}
          enterKeyHint="done"
          invalid={Boolean(errorFor('employee_code'))}
          aria-describedby={errorFor('employee_code') ? 'edit-employee_code-error' : undefined}
          onBlur={(event) => validateOnBlur('employee_code', event.currentTarget.value)}
        />
        {errorFor('employee_code') && (
          <p id="edit-employee_code-error" role="alert" className="text-sm text-destructive">
            {errorFor('employee_code')}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" loading={isPending} loadingText="Đang lưu hồ sơ…">
        <Save aria-hidden="true" className="size-5" />
        Lưu hồ sơ
      </Button>
    </form>
  );
}
