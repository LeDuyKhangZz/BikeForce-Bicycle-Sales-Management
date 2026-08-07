'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, RotateCcw } from 'lucide-react';
import type { ZodType } from 'zod';

import { Button } from '@/components/ui/button';
import { CurrencyField } from '@/components/ui/currency-field';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useReportDraft } from '@/lib/hooks/use-report-draft';
import { morningDraftKey } from '@/lib/reports/draft-keys';
import { SALES_TODAY_PATH } from '@/lib/reports/today-cta';
import {
  MAX_ROUTE_LENGTH,
  MAX_VISIT_PURPOSE_LENGTH,
  morningReportSchema,
} from '@/lib/validation/report';

import { saveMorningReport, updateMorningReport, type MorningReportState } from './actions';

/** Sáu ô của form, tất cả giữ dưới dạng CHUỖI đúng như người dùng gõ. */
export type MorningFormValues = {
  planned_route: string;
  visit_purpose: string;
  target_visit_points: string;
  target_sales_quantity: string;
  target_revenue: string;
  target_customer_visits: string;
};

type FieldName = keyof MorningFormValues;

type Props = {
  /** `create` = UC-04, `edit` = UC-05. Quyết định Server Action nào được gọi. */
  mode: 'create' | 'edit';
  reportId: string | null;
  /** Ngày nghiệp vụ, dùng làm một phần khoá draft (BR-021). */
  today: string;
  initialValues: MorningFormValues;
};

/** Ba ô số nguyên. Doanh thu có component riêng vì cần phân nhóm nghìn. */
const COUNT_FIELDS: ReadonlyArray<{ name: FieldName; label: string; helper: string }> = [
  {
    name: 'target_visit_points',
    label: 'Mục tiêu điểm viếng thăm',
    helper: 'Số điểm dự kiến ghé trong ngày. Tối đa 1.000.',
  },
  {
    name: 'target_sales_quantity',
    label: 'Mục tiêu doanh số',
    helper: 'Số xe dự kiến bán trong ngày. Tối đa 10.000.',
  },
];

/**
 * Form cam kết đầu ngày — UC-04, UC-05, FR-008.
 *
 * `'use client'` là bắt buộc (state form, validate on blur, draft localStorage),
 * nhưng nó chỉ bọc phần tương tác: trang `/sales/today/morning` vẫn là Server
 * Component và tự đọc dữ liệu (AGENTS.md §4).
 *
 * Validate phía client dùng **chính** `morningReportSchema` của Server Action —
 * một nguồn, không hai bản (AGENTS.md §9). Client validate chỉ để UX; server
 * luôn validate lại (NFR-006).
 */
export function MorningReportForm({ mode, reportId, today, initialValues }: Props) {
  const router = useRouter();
  const action = mode === 'create' ? saveMorningReport : updateMorningReport;
  const [state, formAction, isPending] = useActionState<MorningReportState, FormData>(action, null);

  const { values, setValue, isDirty, restoredFromDraft, discardDraft, clearDraft } = useReportDraft(
    morningDraftKey(today),
    initialValues,
  );

  const [clientErrors, setClientErrors] = useState<Partial<Record<FieldName, string>>>({});
  const formRef = useRef<HTMLFormElement>(null);

  /**
   * Đang gửi, HOẶC đã gửi xong và đang chờ điều hướng về `/sales/today`.
   *
   * Giữ form ở trạng thái khoá trong cả hai giai đoạn: chống double submit
   * (rule `loading-buttons`), và tránh việc các ô nháy về giá trị gốc trong một
   * khung hình sau khi `clearDraft()` chạy mà trang chưa kịp chuyển.
   */
  const isBusy = isPending || Boolean(state?.ok);

  const serverFieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const formError = state && !state.ok && state.code !== 'VALIDATION' ? state.message : null;

  const errorFor = (field: FieldName): string | undefined =>
    clientErrors[field] ?? serverFieldErrors[field]?.[0];

  const errorFields = (Object.keys(initialValues) as FieldName[]).filter((field) =>
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
    if (!state || state.ok || state.code !== 'VALIDATION') return;
    const firstError = Object.keys(state.fieldErrors ?? {})[0];
    if (!firstError) return;
    formRef.current?.querySelector<HTMLElement>(`[name="${firstError}"]`)?.focus();
  }, [state]);

  // Lưu thành công: xoá draft + gỡ cảnh báo rời trang TRƯỚC khi điều hướng
  // (`docs/03 §4.2` bước 21–22).
  useEffect(() => {
    if (!state?.ok) return;

    clearDraft();

    // `notice` do SERVER trả về. KHÔNG suy ra từ `mode` ở đây: sau khi tạo
    // thành công, `revalidatePath('/sales/today/morning')` làm RSC của chính
    // trang này render lại — lúc đó đã có báo cáo nên `mode` đã đổi thành
    // `'edit'`, và một lần TẠO MỚI sẽ hiện nhầm câu "Đã cập nhật cam kết sáng".
    // Lỗi này đã xảy ra thật khi kiểm chứng Phase 3 trên Chromium.
    router.replace(`${SALES_TODAY_PATH}?saved=${state.data.notice}`);
  }, [state, clearDraft, router]);

  const routeLength = values.planned_route.trim().length;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-6" noValidate>
      {mode === 'edit' && reportId && <input type="hidden" name="report_id" value={reportId} />}

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

      <FormField
        id="visit_purpose"
        label="Mục đích chuyến đi"
        error={errorFor('visit_purpose')}
        helperText="Không bắt buộc. Tối đa 300 ký tự."
      >
        <Input
          id="visit_purpose"
          name="visit_purpose"
          type="text"
          maxLength={MAX_VISIT_PURPOSE_LENGTH}
          enterKeyHint="next"
          autoComplete="off"
          disabled={isBusy}
          invalid={Boolean(errorFor('visit_purpose'))}
          aria-describedby={`visit_purpose-helper${errorFor('visit_purpose') ? ' visit_purpose-error' : ''}`}
          value={values.visit_purpose}
          onChange={(event) => updateField('visit_purpose', event.currentTarget.value)}
          onBlur={(event) => validateOnBlur('visit_purpose', event.currentTarget.value)}
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
        id="target_revenue"
        label="Mục tiêu doanh thu"
        value={values.target_revenue}
        error={errorFor('target_revenue')}
        disabled={isBusy}
        onChange={(value) => updateField('target_revenue', value)}
        onBlur={(value) => validateOnBlur('target_revenue', value)}
      />

      <FormField
        id="target_customer_visits"
        label="Mục tiêu số lượng khách hàng"
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
        <Button type="submit" size="lg" disabled={isBusy} aria-busy={isBusy}>
          <Save aria-hidden="true" className="size-5" />
          {isBusy
            ? 'Đang lưu…'
            : mode === 'create'
              ? 'Lưu báo cáo đầu ngày'
              : 'Lưu thay đổi'}
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
