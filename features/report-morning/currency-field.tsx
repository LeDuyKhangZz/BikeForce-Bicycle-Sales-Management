'use client';

import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { formatCurrencyVND, formatThousands, parseCurrencyInput } from '@/lib/currency';

type Props = {
  id: string;
  label: string;
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onBlur: (value: string) => void;
};

/**
 * Ba chip cộng nhanh — `docs/05 §6.2`. Lý do tồn tại là NFR-008: hoàn tất báo
 * cáo sáng trong ≤ 60 giây và ≤ 6 lần chạm. Gõ "150000000" trên bàn phím số của
 * điện thoại là 9 lần chạm chỉ cho một ô.
 */
const QUICK_ADD_STEPS = [
  { label: '+1tr', amount: 1_000_000 },
  { label: '+5tr', amount: 5_000_000 },
  { label: '+10tr', amount: 10_000_000 },
] as const;

/**
 * Ô nhập tiền VND — BR-010, DEC-008.
 *
 * Người dùng gõ số thuần; khi `blur` thì hiển thị phân nhóm nghìn
 * (`150.000.000`). Giá trị gửi lên server vẫn là chuỗi đó, và
 * `morningReportSchema` quy nó về **số nguyên** bằng `parseCurrencyInput` —
 * database KHÔNG BAO GIỜ nhận chuỗi đã format.
 *
 * `type="text"` chứ không `type="number"`: `number` cho phép cuộn chuột làm đổi
 * giá trị, hiện spinner khó chạm, và chặn luôn dấu chấm phân nhóm.
 */
export function CurrencyField({ id, label, value, error, disabled, onChange, onBlur }: Props) {
  const parsed = parseCurrencyInput(value);

  function handleBlur(raw: string) {
    const amount = parseCurrencyInput(raw);
    // Chỉ định dạng lại khi parse được. Chuỗi rác giữ NGUYÊN để người dùng nhìn
    // thấy đúng thứ mình đã gõ cạnh thông báo lỗi.
    if (amount !== null) onChange(formatThousands(amount));
    onBlur(amount === null ? raw : String(amount));
  }

  function handleQuickAdd(amount: number) {
    onChange(formatThousands((parsed ?? 0) + amount));
  }

  return (
    <FormField
      id={id}
      label={label}
      required
      error={error}
      helperText={
        parsed === null
          ? 'Đơn vị: đồng (₫). Nhập số nguyên, không nhập phần lẻ.'
          : `Đang nhập: ${formatCurrencyVND(parsed)}`
      }
    >
      <Input
        id={id}
        name={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9.]*"
        enterKeyHint="next"
        autoComplete="off"
        required
        disabled={disabled}
        invalid={Boolean(error)}
        aria-describedby={`${id}-helper${error ? ` ${id}-error` : ''}`}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        onBlur={(event) => handleBlur(event.currentTarget.value)}
      />

      <div className="flex flex-wrap gap-2">
        {QUICK_ADD_STEPS.map((step) => (
          <button
            key={step.label}
            type="button"
            disabled={disabled}
            onClick={() => handleQuickAdd(step.amount)}
            className="tabular min-h-11 rounded-lg border border-input-border bg-card px-4 text-sm font-medium text-primary transition-colors duration-150 hover:bg-background disabled:cursor-not-allowed disabled:opacity-45"
          >
            {step.label}
          </button>
        ))}
      </div>
    </FormField>
  );
}
