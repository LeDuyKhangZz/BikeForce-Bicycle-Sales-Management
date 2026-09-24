'use client';

import { useRef, useState, useTransition } from 'react';
import { FileSpreadsheet, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { importMisaCustomerPlans } from '@/features/misa-employees/actions';
import { parseCustomerPlanCsv, type CustomerPlanCsvResult } from '@/lib/amis/customer-plan-csv';

type Props = { employeeId: number; month: string };

export function CustomerPlanImport({ employeeId, month }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<CustomerPlanCsvResult | null>(null);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  function closePreview() {
    setPreview(null);
    setFileName('');
    setMessage('');
    if (inputRef.current) inputRef.current.value = '';
  }

  async function selectFile(file: File | undefined) {
    setMessage('');
    if (!file) return;
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setPreview({ rows: [], errors: [{ line: 1, message: 'Chỉ chấp nhận file CSV được tải từ file mẫu.' }] });
      return;
    }
    setPreview(parseCustomerPlanCsv(await file.text()));
  }

  function confirmImport() {
    if (!preview || preview.rows.length === 0 || preview.errors.length > 0) return;
    startTransition(async () => {
      const result = await importMisaCustomerPlans({ month, employeeId, rows: preview.rows });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setMessage(`Đã nhập ${result.data.saved} kế hoạch khách hàng.`);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
    });
  }

  return (
    <div className="w-full sm:w-auto">
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only"
        onChange={(event) => void selectFile(event.target.files?.[0])} />
      <button type="button" onClick={() => inputRef.current?.click()}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-input-border bg-primary/5 px-4 font-semibold text-heading hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-auto">
        <Upload aria-hidden="true" className="size-5" /> Nhập kế hoạch
      </button>
      {(preview || message) && (
        <section aria-label="Xem trước nhập kế hoạch" className="mt-3 rounded-xl border border-input-border bg-card p-4 sm:min-w-[28rem]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-semibold text-heading"><FileSpreadsheet aria-hidden="true" className="size-5 shrink-0 text-primary" />{fileName || 'Kết quả nhập'}</p>
              {preview && <p className="mt-1 text-sm text-muted-foreground">{preview.rows.length} dòng hợp lệ · {preview.errors.length} dòng lỗi</p>}
            </div>
            <button type="button" onClick={closePreview} aria-label="Đóng xem trước" className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><X aria-hidden="true" className="size-5" /></button>
          </div>
          {preview && preview.errors.length > 0 && (
            <div role="alert" className="mt-3 max-h-40 overflow-y-auto rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-semibold">Hãy sửa các lỗi sau rồi tải lại file:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {preview.errors.slice(0, 20).map((error) => <li key={`${error.line}-${error.message}`}>Dòng {error.line}: {error.message}</li>)}
              </ul>
              {preview.errors.length > 20 && <p className="mt-2">Còn {preview.errors.length - 20} lỗi khác.</p>}
            </div>
          )}
          {message && <p role={preview ? 'alert' : 'status'} className={preview ? 'mt-3 text-sm text-destructive' : 'mt-3 text-sm text-success'}>{message}</p>}
          {preview && preview.errors.length === 0 && preview.rows.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button type="button" onClick={confirmImport} loading={pending} loadingText="Đang nhập…">Xác nhận nhập {preview.rows.length} khách</Button>
              <p className="text-xs text-muted-foreground">Dữ liệu hiện có của các khách trong file sẽ được cập nhật.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
