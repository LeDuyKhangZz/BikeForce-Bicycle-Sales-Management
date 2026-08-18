'use client';

import { useActionState, useState } from 'react';
import { CheckCircle2, CopyCheck, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrencyVND, formatThousands, parseCurrencyInput } from '@/lib/currency';
import { monthlyTargetFieldName, type MonthlyTargetKind } from '@/lib/validation/monthly-targets';

import { saveMonthlyTargetsAction, type SaveMonthlyTargetsState } from './actions';

/**
 * Form giao chỉ tiêu tháng cho cả đội — DEC-071.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  NÚT "GIỮ NGUYÊN CHỈ TIÊU THÁNG TRƯỚC" CHỈ ĐIỀN Ô, KHÔNG LƯU
 * ─────────────────────────────────────────────────────────────────────────
 *  Chỉ tiêu phần lớn tháng nào cũng như tháng nấy, nên gõ lại 11 dòng mỗi đầu
 *  tháng là việc thừa. Nhưng nút này **không** tự ghi database: nó đổ số tháng
 *  trước vào các ô rồi dừng, Admin xem lại và bấm Lưu.
 *
 *  Cố ý như vậy vì một cú bấm nhầm mà tự lưu sẽ **đè** chỉ tiêu vừa gõ tay mà
 *  không có đường lùi — bảng này không có lịch sử phiên bản. Điền-rồi-xem-lại
 *  thì lỡ tay vẫn quay lại được bằng cách rời trang mà không bấm Lưu.
 *
 * Số tháng trước đến từ **server** (`previousTargets`), không phải một lượt
 * `fetch` khi bấm: trang đã đọc tháng trước để hiện dòng tóm tắt, nên nút này
 * không tốn thêm round-trip nào.
 */

export type TargetSalesRow = {
  id: string;
  full_name: string;
  employee_code: string | null;
  is_active: boolean;
};

/** Giá trị hai ô của một dòng, ở dạng CHUỖI đúng như người dùng đang thấy. */
type RowValue = { target_sales_amount: string; target_revenue: string };

type Props = {
  month: string;
  monthLabel: string;
  salesList: readonly TargetSalesRow[];
  /** Chỉ tiêu đã lưu của tháng đang xem — `sales_id` → hai số nguyên VND. */
  currentTargets: Readonly<Record<string, { target_sales_amount: number | null; target_revenue: number | null }>>;
  /** Chỉ tiêu của tháng liền trước, cho nút "giữ nguyên". Rỗng ⇒ nút tắt. */
  previousTargets: Readonly<Record<string, { target_sales_amount: number | null; target_revenue: number | null }>>;
  previousMonthLabel: string;
};

/** `null` → `''`; số → `'640.000.000'`. Ô trống nghĩa là CHƯA GIAO, không phải 0. */
function toInputValue(amount: number | null | undefined): string {
  return typeof amount === 'number' ? formatThousands(amount) : '';
}

function buildValues(
  salesList: readonly TargetSalesRow[],
  source: Props['currentTargets'],
): Record<string, RowValue> {
  const next: Record<string, RowValue> = {};

  for (const sales of salesList) {
    next[sales.id] = {
      target_sales_amount: toInputValue(source[sales.id]?.target_sales_amount),
      target_revenue: toInputValue(source[sales.id]?.target_revenue),
    };
  }

  return next;
}

export function MonthlyTargetsForm({
  month,
  monthLabel,
  salesList,
  currentTargets,
  previousTargets,
  previousMonthLabel,
}: Props) {
  const [state, formAction, isPending] = useActionState<SaveMonthlyTargetsState, FormData>(
    saveMonthlyTargetsAction,
    null,
  );
  const [values, setValues] = useState<Record<string, RowValue>>(() =>
    buildValues(salesList, currentTargets),
  );
  const [copied, setCopied] = useState(false);

  const serverFieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const formError = state && !state.ok && state.code !== 'VALIDATION' ? state.message : null;
  const validationError = state && !state.ok && state.code === 'VALIDATION' ? state.message : null;
  const notice = state?.ok ? state.data.notice : null;

  const hasPrevious = Object.keys(previousTargets).length > 0;

  function setCell(salesId: string, kind: MonthlyTargetKind, raw: string) {
    setValues((prev) => ({
      ...prev,
      [salesId]: { ...prev[salesId], [kind]: raw } as RowValue,
    }));
  }

  function formatCell(salesId: string, kind: MonthlyTargetKind, raw: string) {
    const amount = parseCurrencyInput(raw);
    // Chuỗi rác giữ NGUYÊN để người dùng nhìn thấy đúng thứ mình đã gõ cạnh
    // thông báo lỗi — cùng cách làm với `CurrencyField`.
    if (amount !== null) setCell(salesId, kind, formatThousands(amount));
  }

  function copyPreviousMonth() {
    setValues(buildValues(salesList, previousTargets));
    setCopied(true);
  }

  // Tổng để Admin đối chiếu thẳng với bảng KPI của công ty — bảng đó có dòng
  // "Tổng" và đó là cách nhanh nhất để biết mình gõ thiếu một dòng.
  const totals = salesList.reduce(
    (sum, sales) => ({
      target_sales_amount:
        sum.target_sales_amount + (parseCurrencyInput(values[sales.id]?.target_sales_amount ?? '') ?? 0),
      target_revenue:
        sum.target_revenue + (parseCurrencyInput(values[sales.id]?.target_revenue ?? '') ?? 0),
    }),
    { target_sales_amount: 0, target_revenue: 0 },
  );

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {/* Tháng đi kèm form nhưng KHÔNG phải nguồn quyền: Server Action vẫn kiểm
          vai Admin, và policy `monthly_targets_*_admin` mới là thứ chặn thật. */}
      <input type="hidden" name="month" value={month} />

      {notice && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-border bg-status-exceeded-bg px-3 py-3 text-sm text-status-exceeded-fg"
        >
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{notice}</span>
        </p>
      )}

      {(formError ?? validationError) && (
        <p
          role="alert"
          className="rounded-lg border border-destructive bg-card px-3 py-3 text-sm text-destructive"
        >
          {formError ?? validationError}
        </p>
      )}

      <Card className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">Giữ nguyên chỉ tiêu tháng trước</CardTitle>
          <p className="text-sm text-muted-foreground">
            {hasPrevious
              ? `Điền lại toàn bộ ô bằng chỉ tiêu ${previousMonthLabel}. Số chỉ được ghi khi bạn bấm Lưu.`
              : `${previousMonthLabel} chưa có chỉ tiêu nào để chép.`}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={!hasPrevious || isPending}
          onClick={copyPreviousMonth}
        >
          <CopyCheck aria-hidden="true" className="size-5" />
          Chép chỉ tiêu {previousMonthLabel}
        </Button>
        {copied && (
          <p role="status" className="text-sm text-status-exceeded-fg">
            Đã điền chỉ tiêu {previousMonthLabel} vào các ô. Kiểm tra lại rồi bấm Lưu chỉ tiêu.
          </p>
        )}
      </Card>

      <ul className="grid gap-3 md:grid-cols-2">
        {salesList.map((sales) => (
          <li key={sales.id}>
            <Card className="flex h-full flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <p className="text-base font-semibold text-heading">{sales.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {sales.employee_code ?? 'Chưa có mã nhân viên'}
                  {!sales.is_active && ' · đã vô hiệu hoá'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <TargetCell
                  salesId={sales.id}
                  salesName={sales.full_name}
                  kind="target_sales_amount"
                  label="Chỉ tiêu doanh số"
                  value={values[sales.id]?.target_sales_amount ?? ''}
                  error={serverFieldErrors[monthlyTargetFieldName('target_sales_amount', sales.id)]?.[0]}
                  disabled={isPending}
                  onChange={setCell}
                  onBlur={formatCell}
                />
                <TargetCell
                  salesId={sales.id}
                  salesName={sales.full_name}
                  kind="target_revenue"
                  label="Chỉ tiêu doanh thu"
                  value={values[sales.id]?.target_revenue ?? ''}
                  error={serverFieldErrors[monthlyTargetFieldName('target_revenue', sales.id)]?.[0]}
                  disabled={isPending}
                  onChange={setCell}
                  onBlur={formatCell}
                />
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Card className="flex flex-col gap-2">
        <CardTitle className="text-base">Tổng {monthLabel}</CardTitle>
        <dl className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-0.5">
            <dt className="text-sm text-muted-foreground">Doanh số</dt>
            <dd className="tabular text-base font-semibold break-words text-foreground">
              {formatCurrencyVND(totals.target_sales_amount)}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-sm text-muted-foreground">Doanh thu</dt>
            <dd className="tabular text-base font-semibold break-words text-foreground">
              {formatCurrencyVND(totals.target_revenue)}
            </dd>
          </div>
        </dl>
        <p className="text-sm text-muted-foreground">
          Đối chiếu hai con số này với dòng Tổng của bảng KPI để biết có bỏ sót ai không.
        </p>
      </Card>

      <Button type="submit" size="lg" loading={isPending} loadingText="Đang lưu chỉ tiêu…">
        <Save aria-hidden="true" className="size-5" />
        Lưu chỉ tiêu {monthLabel}
      </Button>
    </form>
  );
}

type CellProps = {
  salesId: string;
  salesName: string;
  kind: MonthlyTargetKind;
  label: string;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (salesId: string, kind: MonthlyTargetKind, raw: string) => void;
  onBlur: (salesId: string, kind: MonthlyTargetKind, raw: string) => void;
};

/**
 * Một ô tiền. Không export — chỉ dùng trong file này (AGENTS.md §4).
 *
 * Cố ý **không** dùng `CurrencyField`: ô đó `required` và kèm ba chip cộng
 * nhanh cho báo cáo ngày. Ở đây ô trống là trạng thái hợp lệ ("chưa giao"), và
 * 24 ô mỗi ô ba chip thì màn hình chỉ còn là một rừng nút. Việc format vẫn đi
 * qua `lib/currency.ts`, không có phép định dạng tiền thứ hai.
 */
function TargetCell({
  salesId,
  salesName,
  kind,
  label,
  value,
  error,
  disabled,
  onChange,
  onBlur,
}: CellProps) {
  const fieldId = monthlyTargetFieldName(kind, salesId);
  const parsed = parseCurrencyInput(value);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={fieldId}>
        {label}
        {/* Tên người trong nhãn cho screen reader: 24 ô cùng nhãn "Chỉ tiêu
            doanh số" thì đọc bằng trình đọc màn hình sẽ không biết của ai. */}
        <span className="sr-only"> của {salesName}</span>
      </Label>
      <Input
        id={fieldId}
        name={fieldId}
        type="text"
        inputMode="numeric"
        pattern="[0-9.]*"
        autoComplete="off"
        enterKeyHint="next"
        placeholder="Chưa giao"
        disabled={disabled}
        invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-error` : `${fieldId}-helper`}
        value={value}
        onChange={(event) => onChange(salesId, kind, event.currentTarget.value)}
        onBlur={(event) => onBlur(salesId, kind, event.currentTarget.value)}
      />
      {error ? (
        <p id={`${fieldId}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <p id={`${fieldId}-helper`} className="text-sm text-muted-foreground">
          {parsed === null ? 'Để trống nếu chưa giao.' : formatCurrencyVND(parsed)}
        </p>
      )}
    </div>
  );
}
