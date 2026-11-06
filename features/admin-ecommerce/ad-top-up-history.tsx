import { formatCurrencyVND } from '@/lib/currency';
import { formatVietnamDateTime } from '@/lib/date';
import type { AdTopUpHistoryItem } from '@/lib/reports/ad-finance';

type Props = { label: string; entries: AdTopUpHistoryItem[] };

export function AdTopUpHistory({ label, entries }: Props) {
  return (
    <section aria-label={`Lịch sử nạp Ads ${label}`} className="rounded-md border border-border bg-white/90 p-3">
      <h3 className="font-semibold text-heading">Lịch sử nạp Ads {label}</h3>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Chưa có lần nạp nào được ghi nhận.</p>
      ) : (
        <ol className="mt-2 flex flex-col gap-2">
          {entries.map((entry, index) => (
            <li key={`${entry.createdAt}-${index}`} className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="text-xs text-muted-foreground">{entry.isOpeningBalance ? 'Số lũy kế trước khi bật lịch sử' : formatVietnamDateTime(entry.createdAt)}</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
                <div><dt className="text-muted-foreground">Trước</dt><dd className="font-semibold tabular-nums text-heading">{formatCurrencyVND(entry.previousAmount)}</dd></div>
                <div><dt className="text-muted-foreground">Nạp thêm</dt><dd className="font-semibold tabular-nums text-heading">{formatCurrencyVND(entry.depositAmount)}</dd></div>
                <div><dt className="text-muted-foreground">Sau</dt><dd className="font-semibold tabular-nums text-heading">{formatCurrencyVND(entry.newAmount)}</dd></div>
              </dl>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
