'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import type { ZodType } from 'zod';

import { Button } from '@/components/ui/button';
import { CurrencyField } from '@/components/ui/currency-field';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useReportDraft } from '@/lib/hooks/use-report-draft';
import { morningDraftKey } from '@/lib/reports/draft-keys';
import {
  MAX_ROUTE_LENGTH,
  MIN_TARGET_VISIT_POINTS,
  morningReportSchema,
} from '@/lib/validation/report';

import { saveMorningReport, type MorningReportState } from './actions';

/**
 * NĂM ô của form, tất cả giữ dưới dạng CHUỖI đúng như người dùng gõ.
 *
 * ⚠ `visit_purpose` đã bị GỠ ở PHASE 13 (DEC-048) — cột vẫn còn trong database
 * cho dữ liệu cũ, nhưng form không nhập và không gửi nó nữa.
 */
export type MorningFormValues = {
  planned_route: string;
  target_visit_points: string;
  target_sales_amount: string;
  target_revenue: string;
  target_customer_visits: string;
};

type FieldName = keyof MorningFormValues;

/**
 * Form LUÔN bắt đầu rỗng — PHASE 14, DEC-055.
 *
 * Trước đây giá trị ban đầu đến từ route dưới dạng prop `initialValues` để phục
 * vụ chế độ SỬA (UC-05). UC-05 đã bị gỡ, nên chỉ còn đúng một điểm khởi đầu.
 * Hằng số ở **tầng module** chứ không dựng trong thân component: `useReportDraft`
 * nhận nó làm giá trị nền, và một object mới mỗi lần render là một nguồn
 * re-render vô ích.
 */
const EMPTY_VALUES: MorningFormValues = {
  planned_route: '',
  target_visit_points: '',
  target_sales_amount: '',
  target_revenue: '',
  target_customer_visits: '',
};

type Props = {
  /** Ngày nghiệp vụ, dùng làm một phần khoá draft (BR-021). */
  today: string;
};

/**
 * Ô đếm duy nhất còn lại ở nửa trên của form. Hai ô TIỀN (doanh số, doanh thu
 * công nợ) dùng `CurrencyField` vì cần phân nhóm nghìn và chip cộng nhanh —
 * DEC-050 chuyển "Mục tiêu doanh số" từ đếm xe sang nhập tiền.
 */
const COUNT_FIELDS: ReadonlyArray<{ name: FieldName; label: string; helper: string }> = [
  {
    name: 'target_visit_points',
    label: 'Mục tiêu điểm viếng thăm',
    helper: `Số điểm dự kiến ghé trong ngày. Tối thiểu ${MIN_TARGET_VISIT_POINTS}.`,
  },
];

/**
 * Form cam kết đầu ngày — UC-04, FR-008.
 *
 * `'use client'` là bắt buộc (state form, validate on blur, draft localStorage),
 * nhưng nó chỉ bọc phần tương tác: trang `/sales/today/morning` vẫn là Server
 * Component và tự đọc dữ liệu (AGENTS.md §4).
 *
 * Validate phía client dùng **chính** `morningReportSchema` của Server Action —
 * một nguồn, không hai bản (AGENTS.md §9). Client validate chỉ để UX; server
 * luôn validate lại (NFR-006).
 *
 * ⚠ **PHASE 14 — DEC-055.** Component này từng có hai chế độ (`create` / `edit`)
 * và tự chọn một trong hai Server Action. Nay chỉ còn `saveMorningReport`, giống
 * hệt `EveningReportForm` vốn cố ý chỉ có một chế độ.
 */
export function MorningReportForm({ today }: Props) {
  const [state, formAction, isPending] = useActionState<MorningReportState, FormData>(
    saveMorningReport,
    null,
  );

  const { values, setValue, isDirty, restoredFromDraft, discardDraft } = useReportDraft(
    morningDraftKey(today),
    EMPTY_VALUES,
  );

  const [clientErrors, setClientErrors] = useState<Partial<Record<FieldName, string>>>({});
  const formRef = useRef<HTMLFormElement>(null);

  /**
   * `state` chỉ mang giá trị khi THẤT BẠI: lưu thành công thì action `redirect()`
   * và trang này bị thay thế (DEC-037, áp cho luồng sáng từ PHASE 14). Nhờ vậy
   * `isBusy` chỉ cần theo `isPending`.
   */
  const isBusy = isPending;

  const serverFieldErrors = state?.fieldErrors ?? {};
  const formError = state && state.code !== 'VALIDATION' ? state.message : null;

  const errorFor = (field: FieldName): string | undefined =>
    clientErrors[field] ?? serverFieldErrors[field]?.[0];

  const errorFields = (Object.keys(EMPTY_VALUES) as FieldName[]).filter((field) =>
    Boolean(errorFor(field)),
  );

  /** Validate ON BLUR bằng đúng schema của server (rule inline-validation). */
  function validateOnBlur(field: FieldName, value: string) {
    // `shape[field]` là union của 6 schema khác nhau; thu về `ZodType` để lời
    // gọi `safeParse` có đúng một chữ ký thay vì một union chữ ký.
    const fieldSchema: ZodType = morningReportSchema.shape[field];
    const result = fieldSchema.safeParse(value);
    setClientErrors((previous) => ({
      ...previous,
      [field]: result.success ? undefined : result.error.issues[0]?.message,
    }));
  }

  function updateField(field: FieldName, value: string) {
    setValue(field, value);
    // Xoá lỗi cũ ngay khi người dùng bắt đầu sửa — không bắt họ nhìn lỗi đã
    // khắc phục cho tới lần blur kế tiếp.
    if (clientErrors[field]) {
      setClientErrors((previous) => ({ ...previous, [field]: undefined }));
    }
  }

  // Đưa focus về ô lỗi đầu tiên sau khi server trả lỗi validate (rule
  // focus-management, `docs/05 §8` mục 5).
  useEffect(() => {
    if (!state || state.code !== 'VALIDATION') return;
    const firstError = Object.keys(state.fieldErrors ?? {})[0];
    if (!firstError) return;
    formRef.current?.querySelector<HTMLElement>(`[name="${firstError}"]`)?.focus();
  }, [state]);

  /*
   * ⚠ KHÔNG còn `useEffect` bắt `state.ok` để `clearDraft()` + `router.replace()`.
   *
   * Nó đã chết cùng DEC-055 và bộ E2E bắt được ngay: `/sales/today/morning` nay
   * tự `redirect()` khi hôm nay đã có báo cáo, nên lần render lại RSC sau Server
   * Action làm form unmount **trước khi** effect kịp commit. Điều hướng do
   * `saveMorningReport` phát ra (DEC-037), việc dọn draft do `DiscardMorningDraft`
   * trên `/sales/today` lo.
   */

  const routeLength = values.planned_route.trim().length;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-6" noValidate>
      {restoredFromDraft && (
        <div className="flex flex-col gap-2 rounded-lg border border-input-border bg-card p-3">
          <p className="text-sm text-foreground">
            Đã khôi phục nội dung bạn nhập dở lần trước. Dữ liệu này chưa được lưu lên hệ thống.
          </p>
          <Button variant="secondary" onClick={discardDraft} className="self-start">
            <RotateCcw aria-hidden="true" className="size-4" />
            Bỏ nội dung nhập dở
          </Button>
        </div>
      )}

      {formError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive bg-card px-3 py-3 text-sm text-destructive"
        >
          {formError}
        </p>
      )}

      {/* Error summary khi có từ 2 lỗi trở lên (rule error-summary). */}
      {errorFields.length > 1 && (
        <div role="alert" className="rounded-lg border border-destructive bg-card px-3 py-3">
          <p className="text-sm font-medium text-destructive">
            Có {errorFields.length} ô cần kiểm tra lại:
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {errorFields.map((field) => (
              <li key={field} className="text-sm text-destructive">
                {errorFor(field)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <FormField
        id="planned_route"
        label="Tuyến ghé thăm"
        required
        error={errorFor('planned_route')}
        helperText="Ví dụ: Quận 1 → Quận 3 → Bình Thạnh."
        counter={
          routeLength > MAX_ROUTE_LENGTH - 100
            ? `${routeLength}/${MAX_ROUTE_LENGTH}`
            : undefined
        }
      >
        <Textarea
          id="planned_route"
          name="planned_route"
          required
          maxLength={MAX_ROUTE_LENGTH}
          enterKeyHint="next"
          disabled={isBusy}
          invalid={Boolean(errorFor('planned_route'))}
          aria-describedby={`planned_route-helper${errorFor('planned_route') ? ' planned_route-error' : ''}`}
          value={values.planned_route}
          onChange={(event) => updateField('planned_route', event.currentTarget.value)}
          onBlur={(event) => validateOnBlur('planned_route', event.currentTarget.value)}
        />
      </FormField>

      {COUNT_FIELDS.map((field) => (
        <FormField
          key={field.name}
          id={field.name}
          label={field.label}
          required
          error={errorFor(field.name)}
          helperText={field.helper}
        >
          <Input
            id={field.name}
            name={field.name}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="next"
            autoComplete="off"
            required
            disabled={isBusy}
            invalid={Boolean(errorFor(field.name))}
            aria-describedby={`${field.name}-helper${errorFor(field.name) ? ` ${field.name}-error` : ''}`}
            value={values[field.name]}
            onChange={(event) => updateField(field.name, event.currentTarget.value)}
            onBlur={(event) => validateOnBlur(field.name, event.currentTarget.value)}
          />
        </FormField>
      ))}

      <CurrencyField
        id="target_sales_amount"
        label="Mục tiêu doanh số"
        helperText="Tiền bán hàng dự kiến trong ngày. Đơn vị: đồng (₫)."
        value={values.target_sales_amount}
        error={errorFor('target_sales_amount')}
        disabled={isBusy}
        onChange={(value) => updateField('target_sales_amount', value)}
        onBlur={(value) => validateOnBlur('target_sales_amount', value)}
      />

      <CurrencyField
        id="target_revenue"
        label="Mục tiêu doanh thu công nợ"
        helperText="Tiền công nợ dự kiến thu hồi trong ngày. Đơn vị: đồng (₫)."
        value={values.target_revenue}
        error={errorFor('target_revenue')}
        disabled={isBusy}
        onChange={(value) => updateField('target_revenue', value)}
        onBlur={(value) => validateOnBlur('target_revenue', value)}
      />

      <FormField
        id="target_customer_visits"
        label="Mục tiêu số lượng khách hàng sẽ gặp"
        required
        error={errorFor('target_customer_visits')}
        helperText="Số khách dự kiến gặp trong ngày. Tối đa 1.000."
      >
        <Input
          id="target_customer_visits"
          name="target_customer_visits"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          autoComplete="off"
          required
          disabled={isBusy}
          invalid={Boolean(errorFor('target_customer_visits'))}
          aria-describedby={`target_customer_visits-helper${errorFor('target_customer_visits') ? ' target_customer_visits-error' : ''}`}
          value={values.target_customer_visits}
          onChange={(event) => updateField('target_customer_visits', event.currentTarget.value)}
          onBlur={(event) => validateOnBlur('target_customer_visits', event.currentTarget.value)}
        />
      </FormField>

      {/*
        Sticky action bar — `docs/05 §8` mục 3. `-mx-4` bù `px-4` của <main>;
        `env(safe-area-inset-bottom)` để nút không nằm dưới thanh home của iPhone.
      */}
      <div className="sticky bottom-0 -mx-4 mt-2 border-t border-border bg-card px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Button type="submit" size="lg" loading={isBusy} loadingText="Đang lưu cam kết…">
          <Save aria-hidden="true" className="size-5" />
          Lưu báo cáo đầu ngày
        </Button>
        {isDirty && !isBusy && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Có thay đổi chưa lưu.
          </p>
        )}
      </div>
    </form>
  );
}
