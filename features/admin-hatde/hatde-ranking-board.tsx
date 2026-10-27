import { ArrowDown, ArrowUp, Crown, Medal, Minus, ReceiptText, WalletCards } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { HatdeBranchViewModel, HatdeComparisonViewModel, HatdeSnapshotViewModel } from '@/lib/hatde/view-model';

type Props = { report: HatdeSnapshotViewModel };

function Comparison({ value, label }: { value: HatdeComparisonViewModel; label: string }) {
  const Icon = value.direction === 'UP' ? ArrowUp : value.direction === 'DOWN' ? ArrowDown : Minus;
  return (
    <div className={cn(
      'flex min-h-16 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border px-2 py-2 text-center sm:min-h-20 sm:rounded-3xl',
      value.direction === 'UP' && 'border-success/35 bg-status-exceeded-bg text-status-exceeded-fg',
      value.direction === 'DOWN' && 'border-destructive/35 bg-status-missed-bg text-status-missed-fg',
      value.direction === 'UNCHANGED' && 'border-input-border bg-status-pending-bg text-status-pending-fg',
    )}>
      <Icon aria-hidden="true" className="size-5 shrink-0 sm:size-7" strokeWidth={3} />
      <span className="sr-only">{label}: </span>
      <p className="text-base font-black tabular-nums sm:text-xl">{value.display}</p>
    </div>
  );
}

function Rank({ rank }: { rank: number }) {
  const isMedal = rank <= 3;
  return (
    <div className="relative grid size-14 shrink-0 place-items-center sm:size-20">
      {rank === 1 && <Crown aria-hidden="true" className="absolute -top-4 size-9 text-hatde-gold" fill="currentColor" />}
      {rank === 2 && <Medal aria-hidden="true" className="absolute -top-2 size-8 text-hatde-silver" />}
      {rank === 3 && <Medal aria-hidden="true" className="absolute -top-2 size-8 text-hatde-bronze" />}
      <span className={cn(
        'grid size-12 place-items-center rounded-full text-2xl font-black tabular-nums sm:size-16 sm:text-3xl',
        rank === 1 && 'border-4 border-hatde-gold-light bg-hatde-gold text-card shadow-md',
        rank === 2 && 'border-4 border-hatde-silver-light bg-hatde-silver text-hatde-green-deep shadow-md',
        rank === 3 && 'border-4 border-hatde-bronze-light bg-hatde-bronze text-card shadow-md',
        !isMedal && 'bg-hatde-rank-soft text-hatde-green-deep',
      )}>{rank}</span>
    </div>
  );
}

function BranchRow({ branch }: { branch: HatdeBranchViewModel }) {
  return (
    <li className={cn(
      'grid min-h-28 grid-cols-[auto_1fr] items-center gap-2 rounded-2xl border bg-card/90 p-3 shadow-sm backdrop-blur-[2px] sm:grid-cols-[auto_1.5fr_.55fr_1fr] sm:gap-4 sm:px-5',
      branch.rank === 1 ? 'border-2 border-hatde-gold shadow-lg' : 'border-hatde-row-border',
    )}>
      <Rank rank={branch.rank} />
      <div className="min-w-0">
        <h3 className="text-base font-black tracking-tight break-words text-hatde-green-deep uppercase sm:text-xl">{branch.name}</h3>
        <div className="mt-1">
          <p className="inline-flex items-center gap-2 text-lg font-black tracking-tight text-hatde-green-deep tabular-nums sm:text-2xl">
            <WalletCards aria-hidden="true" className="size-5 shrink-0 text-success sm:size-7" />
            {branch.revenueDisplay}
          </p>
          <p aria-label={`${branch.transactionsDisplay} giao dịch`} className="mt-1 text-sm text-hatde-ink sm:hidden">
            <strong className="text-base tabular-nums">{branch.transactionsDisplay}</strong> giao dịch
          </p>
        </div>
      </div>
      <p aria-label={`${branch.transactionsDisplay} giao dịch`} className="hidden text-center text-sm text-hatde-ink sm:block">
        <strong className="block text-2xl tabular-nums">{branch.transactionsDisplay}</strong> giao dịch
      </p>
      <div className="col-span-2 flex min-w-0 gap-2 sm:col-span-1">
        <Comparison value={branch.vsYesterday} label="Hôm qua" />
        <Comparison value={branch.vsLastWeek} label="Tuần trước" />
      </div>
    </li>
  );
}

export function HatdeRankingBoard({ report }: Props) {
  return (
    <section aria-labelledby="hatde-ranking-title" className="hatde-poster-background overflow-hidden rounded-xl border border-hatde-row-border shadow-lg">
      <h2 id="hatde-ranking-title" className="sr-only">Bảng thi đua doanh thu Hạt Dẻ Ông Lý</h2>
      <p className="mx-auto w-fit rounded-full border border-hatde-row-border bg-card/90 px-5 py-1.5 text-center text-sm font-bold tabular-nums text-hatde-green-deep shadow-sm">
        Cập nhật {report.reportTime} · {report.reportDateDisplay}
      </p>
      <div className="mx-[2.5%] mt-3 hidden grid-cols-[4rem_1.5fr_.55fr_.5fr_.5fr] items-center rounded-2xl bg-hatde-rank-soft/70 px-5 py-3 text-center text-sm font-black text-hatde-green-deep sm:grid">
        <span>#</span><span className="text-left">Chi nhánh / Doanh thu</span><span>Số giao dịch</span><span>So với hôm qua</span><span>So với tuần trước</span>
      </div>
      <ol className="mt-3 space-y-3 px-[2.5%] sm:mt-2">
        {report.branches.map((branch) => <BranchRow key={branch.code} branch={branch} />)}
      </ol>
      <div
        aria-label={`Tổng doanh thu ${report.totalRevenueDisplay}, tổng ${report.totalTransactionsDisplay} giao dịch`}
        className="mx-[2.5%] mt-3 grid gap-3 rounded-2xl border-2 border-hatde-lime bg-card/95 p-4 shadow-lg backdrop-blur-[2px] sm:grid-cols-2 sm:px-10"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-hatde-rank-soft text-hatde-green-deep">
            <WalletCards aria-hidden="true" className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-hatde-ink">Tổng doanh thu chuỗi</p>
            <p className="break-words text-xl font-black tracking-tight text-hatde-green-deep tabular-nums sm:text-2xl">
              {report.totalRevenueDisplay}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3 sm:justify-end">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-hatde-rank-soft text-hatde-green-deep">
            <ReceiptText aria-hidden="true" className="size-6" />
          </span>
          <div className="min-w-0 sm:text-right">
            <p className="text-sm font-bold text-hatde-ink">Tổng giao dịch</p>
            <p className="text-xl font-black text-hatde-green-deep tabular-nums sm:text-2xl">
              {report.totalTransactionsDisplay} giao dịch
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
