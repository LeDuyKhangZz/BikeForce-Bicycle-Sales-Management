'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Lock, RotateCcw } from 'lucide-react';
import type { ZodType } from 'zod';

import { Button } from '@/components/ui/button';
import { CurrencyField } from '@/components/ui/currency-field';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrencyVND } from '@/lib/currency';
import { useReportDraft } from '@/lib/hooks/use-report-draft';
import { eveningDraftKey } from '@/lib/reports/draft-keys';
import {
  MAX_EVENING_NOTE_LENGTH,
  MAX_ROUTE_LENGTH,
  eveningReportSchema,
} from '@/lib/validation/report';

import { saveEveningReport, type EveningReportState } from './actions';

/** Sáu ô của form, tất cả giữ dưới dạng CHUỖI đúng như người dùng gõ. */
export type EveningFormValues = {
  actual_visit_points: string;
  actual_sales_quantity: string;
  actual_revenue: string;
  actual_customer_visits: string;
  actual_route: string;
  evening_note: string;
};

type FieldName = keyof EveningFormValues;

/**
 * Bốn con số đã cam kết buổi sáng, dùng làm câu nhắc ngay dưới từng ô.
 *
 * ⚠ Đây là **đối chiếu bằng mắt** (FR-013), KHÔNG phải tính achievement. Không
 * có một phép chia nào trong file này: `%` là `lib/kpi.ts` — Phase 5, còn chờ
 * ISSUE-008. Hiển thị một con số phần trăm tính sai còn tệ hơn không hiển thị.
 */
export type MorningCommitment = {
  target_visit_points: number;
  target_sales_quantity: number;
  target_revenue: number;
  target_customer_visits: number;
};

type Props = {
  reportId: string;
  /** Ngày nghiệp vụ, dùng làm một phần khoá draft (BR-021). */
  today: string;
  commitment: MorningCommitment;
  initialValues: EveningFormValues;
};

/** Ba ô số nguyên. Doanh thu có component riêng vì cần phân nhóm nghìn. */
const COUNT_FIELDS: ReadonlyArray<{
  name: FieldName;
  label: string;
  commitmentOf: (commitment: MorningCommitment) => string;
  enterKeyHint: 'next' | 'done';
}> = [
  {
    name: 'actual_visit_points',
    label: 'Số điểm đã viếng thăm',
    commitmentOf: (c) => `${c.target_visit_points} điểm`,
    enterKeyHint: 'next',
  },
  {
    name: 'actual_sales_quantity',
    label: 'Doanh số thực đạt',
    commitmentOf: (c) => `${c.target_sales_quantity} xe`,
    enterKeyHint: 'next',
  },
];

/**
 * Form nhập thực đạt cuối ngày — UC-06, FR-014, FR-015.
 *
 * Cùng khung với `MorningReportForm` (validate on blur bằng **chính** schema của
 * server, draft localStorage, sticky action bar, error summary), khác ba điểm:
 *
 *   1. **Chỉ có một chế độ.** Không có `mode: 'create' | 'edit'` — BR-019 khoá
 *      báo cáo vĩnh viễn sau khi lưu, nên không tồn tại lần lưu thứ hai.
 *   2. **Mỗi ô mang theo con số đã cam kết sáng** để đối chiếu trực tiếp mà
 *      không phải cuộn lên (FR-013).
 *   3. **Nói trước rằng thao tác này không hoàn tác được** (BR-019). Cảnh báo
 *      nằm ngay cạnh nút Lưu chứ không phải trong một hộp thoại xác nhận: hộp
 *      thoại tốn thêm một lần chạm cho mọi người dùng để phòng một tình huống
 *      hiếm, và câu cảnh báo đọc trước khi bấm hiệu quả hơn câu hỏi sau khi bấm.
 */
export function EveningReportForm({ reportId, today, commitment, initialValues }: Props) {
  const [state, formAction, isPending] = useActionState<EveningReportState, FormData>(
    saveEveningReport,
    null,
  );

  const { values, setValue, isDirty, restoredFromDraft, discardDraft } = useReportDraft(
    eveningDraftKey(today),
    initialValues,
  );

  const [clientErrors, setClientErrors] = useState<Partial<Record<FieldName, string>>>({});
  const formRef = useRef<HTMLFormElement>(null);

  /**
   * `state` chỉ mang giá trị khi THẤT BẠI: lưu thành công thì action `redirect()`
   * và trang này bị thay thế (DEC-037). Nhờ vậy `isBusy` chỉ cần theo `isPending`.
   */
  const isBusy = isPending;

  const serverFieldErrors = state?.fieldErrors ?? {};
  const formError = state && state.code !== 'VALIDATION' ? state.message : null;

  const errorFor = (field: FieldName): string | undefined =>
    clientErrors[field] ?? serverFieldErrors[field]?.[0];

  const errorFields = (Object.keys(initialValues) as FieldName[]).filter((field) =>
    Boolean(errorFor(field)),
  );

  /** Validate ON BLUR bằng đúng schema của server (rule inline-validation). */
  function validateOnBlur(field: FieldName, value: string) {
    const fieldSchema: ZodType = eveningReportSchema.shape[field];
    const result = fieldSchema.safeParse(value);
    setClientErrors((previous) => ({
      ...previous,
      [field]: result.success ? undefined : result.error.issues[0]?.message,
    }));
  }

  function updateField(field: FieldName, value: string) {
    setValue(field, value);
    if (clientErrors[field]) {
      setClientErrors((previous) => ({ ...previous, [field]: undefined }));
    }
  }

  // Đưa focus về ô lỗi đầu tiên sau khi server trả lỗi validate (rule
  // focus-management, `docs/05 §8` mục 5).
  useEffect(() => {
    if (state?.code !== 'VALIDATION') return;
    const firstError = Object.keys(state.fieldErrors ?? {})[0];
    if (!firstError) return;
    formRef.current?.querySelector<HTMLElement>(`[name="${firstError}"]`)?.focus();
  }, [state]);

  const noteLength = values.evening_note.trim().length;
  const routeLength = values.actual_route.trim().length;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="report_id" value={reportId} />

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

      {COUNT_FIELDS.map((field) => (
        <FormField
          key={field.name}
          id={field.name}
          label={field.label}
          required
          error={errorFor(field.name)}
          helperText={`Cam kết sáng: ${field.commitmentOf(commitment)}.`}
        >
          <Input
            id={field.name}
            name={field.name}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint={field.enterKeyHint}
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
        id="actual_revenue"
        label="Doanh thu thực đạt"
        value={values.actual_revenue}
        helperText={`Cam kết sáng: ${formatCurrencyVND(commitment.target_revenue)}.`}
        error={errorFor('actual_revenue')}
        disabled={isBusy}
        onChange={(value) => updateField('actual_revenue', value)}
        onBlur={(value) => validateOnBlur('actual_revenue', value)}
      />

      <FormField
        id="actual_customer_visits"
        label="Số khách hàng đã gặp"
        required
        error={errorFor('actual_customer_visits')}
        helperText={`Cam kết sáng: ${commitment.target_customer_visits} khách.`}
      >
        <Input
          id="actual_customer_visits"
          name="actual_customer_visits"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="next"
          autoComplete="off"
          required
          disabled={isBusy}
          invalid={Boolean(errorFor('actual_customer_visits'))}
          aria-describedby={`actual_customer_visits-helper${errorFor('actual_customer_visits') ? ' actual_customer_visits-error' : ''}`}
          value={values.actual_customer_visits}
          onChange={(event) => updateField('actual_customer_visits', event.currentTarget.value)}
          onBlur={(event) => validateOnBlur('actual_customer_visits', event.currentTarget.value)}
        />
      </FormField>

      <FormField
        id="actual_route"
        label="Tuyến thực tế"
        error={errorFor('actual_route')}
        helperText="Không bắt buộc. Bỏ trống nếu đi đúng tuyến đã lên kế hoạch."
        counter={routeLength > MAX_ROUTE_LENGTH - 100 ? `${routeLength}/${MAX_ROUTE_LENGTH}` : undefined}
      >
        <Textarea
          id="actual_route"
          name="actual_route"
          maxLength={MAX_ROUTE_LENGTH}
          enterKeyHint="next"
          disabled={isBusy}
          invalid={Boolean(errorFor('actual_route'))}
          aria-describedby={`actual_route-helper${errorFor('actual_route') ? ' actual_route-error' : ''}`}
          value={values.actual_route}
          onChange={(event) => updateField('actual_route', event.currentTarget.value)}
          onBlur={(event) => validateOnBlur('actual_route', event.currentTarget.value)}
        />
      </FormField>

      <FormField
        id="evening_note"
        label="Ghi chú cuối ngày"
        error={errorFor('evening_note')}
        helperText="Không bắt buộc. Ví dụ: lý do chưa đạt, khách hẹn lại, sự cố dọc đường."
        counter={
          noteLength > MAX_EVENING_NOTE_LENGTH - 200
            ? `${noteLength}/${MAX_EVENING_NOTE_LENGTH}`
            : undefined
        }
      >
        <Textarea
          id="evening_note"
          name="evening_note"
          rows={4}
          maxLength={MAX_EVENING_NOTE_LENGTH}
          enterKeyHint="done"
          disabled={isBusy}
          invalid={Boolean(errorFor('evening_note'))}
          aria-describedby={`evening_note-helper${errorFor('evening_note') ? ' evening_note-error' : ''}`}
          value={values.evening_note}
          onChange={(event) => updateField('evening_note', event.currentTarget.value)}
          onBlur={(event) => validateOnBlur('evening_note', event.currentTarget.value)}
        />
      </FormField>

      {/* BR-019 — nói TRƯỚC khi bấm, không hỏi lại SAU khi bấm. */}
      <p className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
        <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          Sau khi lưu, báo cáo hôm nay được khoá lại và không sửa được nữa. Hãy kiểm tra kỹ các con
          số trước khi hoàn tất.
        </span>
      </p>

      {/*
        Sticky action bar — `docs/05 §8` mục 3. `-mx-4` bù `px-4` của <main>;
        `env(safe-area-inset-bottom)` để nút không nằm dưới thanh home của iPhone.
      */}
      <div className="sticky bottom-0 -mx-4 mt-2 border-t border-border bg-card px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Button type="submit" size="lg" disabled={isBusy} aria-busy={isBusy}>
          <CheckCircle2 aria-hidden="true" className="size-5" />
          {isBusy ? 'Đang lưu…' : 'Hoàn tất báo cáo hôm nay'}
        </Button>
        {isDirty && !isBusy && (
          <p className="mt-2 text-center text-xs text-muted-foreground">Có thay đổi chưa lưu.</p>
        )}
      </div>
    </form>
  );
}
