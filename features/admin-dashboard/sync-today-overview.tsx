'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  AlertCircle, ArrowUpRight, CalendarClock, CheckCircle2, Clock3,
  Database, DatabaseZap, RefreshCw,
} from 'lucide-react';
import { SiShopee, SiTiktok } from '@icons-pack/react-simple-icons';

import { Card, CardTitle } from '@/components/ui/card';
import { formatVietnamDateTime } from '@/lib/date';
import type { SyncHealthItem, SyncHealthSummary } from '@/lib/system-health/sync-health';

type Props = { summary: SyncHealthSummary };
type DisplayStatus = 'SYNCED' | 'NOT_SYNCED' | 'MONTHLY' | 'RUNNING' | 'FAILED' | 'EMPTY';
type StatusFilter = 'ALL' | 'ATTENTION' | 'SYNCED' | 'MONTHLY' | 'RUNNING';

function getDisplayStatus(item: SyncHealthItem): DisplayStatus {
  if (item.status === 'FAILED' || item.runStatus === 'FAILED') return 'FAILED';
  if (item.status === 'RUNNING') return 'RUNNING';
  if (item.cadence === 'MONTHLY') return 'MONTHLY';
  if (item.latestSyncedAt === null) return 'EMPTY';
  return item.syncedToday ? 'SYNCED' : 'NOT_SYNCED';
}

function getStatusLabel(status: DisplayStatus): string {
  if (status === 'SYNCED') return 'Đã đồng bộ hôm nay';
  if (status === 'NOT_SYNCED') return 'Chưa đồng bộ hôm nay';
  if (status === 'MONTHLY') return 'Theo lịch hằng tháng';
  if (status === 'RUNNING') return 'Đang chạy';
  if (status === 'FAILED') return 'Đồng bộ lỗi';
  return 'Chưa có dữ liệu';
}

const STATUS_STYLES: Record<DisplayStatus, string> = {
  SYNCED: 'bg-status-success-bg text-status-success-fg',
  NOT_SYNCED: 'bg-status-warning-bg text-status-warning-fg',
  MONTHLY: 'bg-cyan-50 text-cyan-800',
  RUNNING: 'bg-status-info-bg text-status-info-fg',
  FAILED: 'bg-status-missed-bg text-status-missed-fg',
  EMPTY: 'bg-status-pending-bg text-muted-foreground',
};

function StatusIcon({ status }: { status: DisplayStatus }) {
  const className = 'size-4 shrink-0';
  if (status === 'SYNCED') return <CheckCircle2 aria-hidden="true" className={className} />;
  if (status === 'NOT_SYNCED') return <Clock3 aria-hidden="true" className={className} />;
  if (status === 'MONTHLY') return <CalendarClock aria-hidden="true" className={className} />;
  if (status === 'RUNNING') return <RefreshCw aria-hidden="true" className={className} />;
  if (status === 'FAILED') return <AlertCircle aria-hidden="true" className={className} />;
  return <DatabaseZap aria-hidden="true" className={className} />;
}

function getTimingDescription(item: SyncHealthItem, status: DisplayStatus): string {
  if (status === 'FAILED' && item.runError) return item.runError;
  if (item.latestSyncedAt !== null) return formatVietnamDateTime(item.latestSyncedAt);
  if (status === 'FAILED') return 'Lần chạy gần nhất thất bại.';
  if (item.queryFailed) return 'Không đọc được trạng thái đồng bộ.';
  return item.cadence === 'MONTHLY' ? 'Chưa ghi nhận lần đồng bộ nào.' : 'Chưa có bản ghi đồng bộ.';
}

function getSystemName(key: string): string {
  if (key.startsWith('amis')) return 'AMIS';
  if (key.startsWith('misa')) return 'MISA';
  if (key.startsWith('pancake')) return 'Pancake';
  if (key.startsWith('salework')) return 'SaleWork';
  if (key.startsWith('tiktok')) return 'TikTok';
  if (key.startsWith('shopee')) return 'Shopee';
  if (key.startsWith('hatde')) return 'Hạt Dẻ';
  return 'Worker';
}

function SystemMark({ name }: { name: string }) {
  if (name === 'TikTok') return <SiTiktok aria-hidden="true" size={18} color="#111827" />;
  if (name === 'Shopee') return <SiShopee aria-hidden="true" size={18} color="#ee4d2d" />;
  const colors: Record<string, string> = {
    AMIS: 'bg-sky-100 text-sky-700', MISA: 'bg-amber-100 text-amber-800',
    Pancake: 'bg-violet-100 text-violet-700', SaleWork: 'bg-emerald-100 text-emerald-700',
    'Hạt Dẻ': 'bg-lime-100 text-lime-800', Worker: 'bg-slate-100 text-slate-700',
  };
  return <span aria-hidden="true" className={`grid size-6 place-items-center rounded-md text-xs font-bold ${colors[name] ?? 'bg-slate-100 text-slate-700'}`}>{name.slice(0, 1)}</span>;
}

function StatusDonut({ counts, total }: { counts: readonly number[]; total: number }) {
  const colors = ['#24a66a', '#e78b25', '#31b7b0', '#347ee8'];
  const radius = 57;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg viewBox="0 0 160 160" role="img" aria-label={`Tỷ lệ trạng thái trên ${total} nguồn`} className="size-40 shrink-0 -rotate-90">
      <circle cx="80" cy="80" r={radius} fill="none" stroke="#edf1f6" strokeWidth="19" />
      {counts.map((count, index) => {
        const length = total === 0 ? 0 : (count / total) * circumference;
        const currentOffset = offset;
        offset += length;
        return <circle key={index} cx="80" cy="80" r={radius} fill="none" stroke={colors[index]} strokeWidth="19" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-currentOffset}><title>{count} nguồn</title></circle>;
      })}
      <text x="80" y="77" textAnchor="middle" className="rotate-90 origin-center fill-slate-800 text-2xl font-bold">{total}</text>
      <text x="80" y="98" textAnchor="middle" className="rotate-90 origin-center fill-slate-500 text-[11px]">nguồn</text>
    </svg>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-10 rounded-lg border px-3 text-xs font-semibold transition-colors ${active ? 'border-primary bg-primary text-white' : 'border-border bg-white text-muted-foreground hover:bg-slate-50'}`}>{children}</button>;
}

export function SyncTodayOverview({ summary }: Props) {
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const rows = useMemo(() => summary.items.map((item) => ({ item, status: getDisplayStatus(item) })), [summary.items]);
  const counts = {
    synced: rows.filter((row) => row.status === 'SYNCED').length,
    attention: rows.filter((row) => row.status === 'NOT_SYNCED' || row.status === 'FAILED' || row.status === 'EMPTY').length,
    scheduled: rows.filter((row) => row.status === 'MONTHLY').length,
    running: rows.filter((row) => row.status === 'RUNNING').length,
  };
  const total = rows.length;
  const filteredRows = rows.filter(({ status }) => {
    if (filter === 'ALL') return true;
    if (filter === 'ATTENTION') return status === 'NOT_SYNCED' || status === 'FAILED' || status === 'EMPTY';
    if (filter === 'SYNCED') return status === 'SYNCED';
    if (filter === 'MONTHLY') return status === 'MONTHLY';
    return status === 'RUNNING';
  });
  const systems = Object.entries(rows.reduce<Record<string, number>>((groups, row) => {
    const name = getSystemName(row.item.key);
    groups[name] = (groups[name] ?? 0) + 1;
    return groups;
  }, {}));
  const attentionRows = rows.filter(({ status }) => status === 'NOT_SYNCED' || status === 'FAILED' || status === 'EMPTY');
  const statCards = [
    { label: 'Đã đồng bộ', value: counts.synced, icon: <CheckCircle2 aria-hidden="true" className="size-5" />, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Cần kiểm tra', value: counts.attention, icon: <AlertCircle aria-hidden="true" className="size-5" />, tone: 'bg-amber-50 text-amber-800' },
    { label: 'Theo lịch', value: counts.scheduled, icon: <CalendarClock aria-hidden="true" className="size-5" />, tone: 'bg-cyan-50 text-cyan-800' },
    { label: 'Đang chạy', value: counts.running, icon: <RefreshCw aria-hidden="true" className="size-5" />, tone: 'bg-blue-50 text-blue-700' },
  ];

  return (
    <section aria-labelledby="sync-today-title" className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-blue-50/80 via-slate-50 to-indigo-50/50 p-3 sm:p-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 id="sync-today-title" className="text-xl font-bold tracking-tight text-heading sm:text-2xl">Tình trạng đồng bộ hôm nay</h2><p className="mt-1 text-sm text-muted-foreground">Tính theo thời điểm đồng bộ, giờ Việt Nam · kiểm tra lúc {formatVietnamDateTime(summary.checkedAt)}</p></div>
        <div className="flex flex-wrap gap-2" aria-label="Tóm tắt trạng thái">
          {statCards.map((stat) => <span key={stat.label} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${stat.tone}`}>{stat.icon}{stat.value} {stat.label.toLowerCase()}</span>)}
        </div>
      </header>

      {attentionRows.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/90 p-3 sm:flex-row sm:items-center sm:px-4">
          <div className="flex shrink-0 items-center gap-2 text-amber-900"><AlertCircle aria-hidden="true" className="size-5" /><div><p className="font-bold">Nguồn cần kiểm tra</p><p className="text-xs">Ưu tiên xem nguồn chưa đồng bộ hoặc chưa có dữ liệu.</p></div></div>
          <div className="flex flex-wrap gap-2 sm:border-l sm:border-amber-200 sm:pl-3">{attentionRows.map(({ item, status }) => <Link key={item.key} href={item.href} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-amber-200 bg-white px-3 text-xs font-semibold text-heading hover:bg-amber-100">{item.label}<ArrowUpRight aria-hidden="true" className="size-3.5" /></Link>)}</div>
        </div>
      ) : <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Tất cả nguồn cần theo dõi đã đồng bộ hôm nay.</p>}

      <div className="grid gap-4 xl:grid-cols-[minmax(15rem,0.27fr)_minmax(0,0.73fr)]">
        <aside className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Card className="flex flex-col gap-3 bg-white/95 p-4"><h3 className="font-bold text-heading">Tỷ lệ trạng thái</h3><div className="flex flex-wrap items-center justify-center gap-3"><StatusDonut counts={[counts.synced, counts.attention, counts.scheduled, counts.running]} total={total} /><ul className="grid gap-2 text-xs">{statCards.map((stat) => <li key={stat.label} className="flex items-center gap-2"><span aria-hidden="true" className={`size-2.5 rounded-full ${stat.tone.split(' ')[0]}`} /><span className="text-muted-foreground">{stat.label}</span><span className="font-bold tabular-nums text-heading">{stat.value}</span></li>)}</ul></div></Card>
          <Card className="flex flex-col gap-3 bg-white/95 p-4"><h3 className="font-bold text-heading">Tổng quan hệ thống</h3><ul className="grid gap-2">{systems.map(([name, count]) => <li key={name} className="flex min-h-8 items-center gap-2"><span className="grid size-7 shrink-0 place-items-center"><SystemMark name={name} /></span><span className="flex-1 text-sm font-medium text-heading">{name}</span><span className="min-w-7 rounded-full bg-slate-100 px-2 py-1 text-center text-xs font-semibold tabular-nums text-muted-foreground">{count}</span></li>)}</ul></Card>
        </aside>

        <Card className="flex min-w-0 flex-col gap-3 bg-white/95 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><Database aria-hidden="true" className="size-5 text-primary" /><CardTitle className="text-base sm:text-lg">Danh sách nguồn dữ liệu</CardTitle></div><div className="flex flex-wrap gap-1.5">{([['ALL', 'Tất cả'], ['ATTENTION', 'Cần kiểm tra'], ['SYNCED', 'Đã đồng bộ'], ['MONTHLY', 'Theo lịch'], ['RUNNING', 'Đang chạy']] as const).map(([value, label]) => <FilterButton key={value} active={filter === value} onClick={() => setFilter(value)}>{label}</FilterButton>)}</div></div>
          <p className="sr-only" aria-live="polite">Đang hiển thị {filteredRows.length} nguồn dữ liệu.</p>
          <div className="hidden overflow-x-auto rounded-xl border border-border/70 xl:block"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-slate-100 text-muted-foreground"><tr><th className="px-3 py-3 font-semibold">Nguồn dữ liệu</th><th className="px-3 py-3 font-semibold">Mô tả</th><th className="px-3 py-3 font-semibold">Trạng thái</th><th className="px-3 py-3 font-semibold">Lần gần nhất</th><th className="px-3 py-3 font-semibold">Kỳ dữ liệu</th><th className="px-3 py-3 text-right font-semibold">Hành động</th></tr></thead><tbody className="divide-y divide-border/70">{filteredRows.map(({ item, status }) => <tr key={item.key} className={status === 'NOT_SYNCED' || status === 'FAILED' || status === 'EMPTY' ? 'bg-amber-50/50' : ''}><td className="whitespace-nowrap px-3 py-3"><span className="flex items-center gap-2 font-semibold text-heading"><SystemMark name={getSystemName(item.key)} />{item.label}</span></td><td className="max-w-56 px-3 py-3 text-muted-foreground">{item.description}</td><td className="whitespace-nowrap px-3 py-3"><StatusBadge status={status} /></td><td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{getTimingDescription(item, status)}</td><td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{item.dataPeriod ?? '—'}</td><td className="px-3 py-3 text-right"><SourceLink href={item.href} /></td></tr>)}</tbody></table>{filteredRows.length === 0 && <p className="p-5 text-center text-sm text-muted-foreground">Không có nguồn ở trạng thái này.</p>}</div>
          <div className="grid gap-2 xl:hidden">{filteredRows.length === 0 ? <p className="p-5 text-center text-sm text-muted-foreground">Không có nguồn ở trạng thái này.</p> : filteredRows.map(({ item, status }) => <article key={item.key} className="flex min-w-0 flex-col gap-2 rounded-xl border border-border/70 bg-white p-3"><div className="flex items-start justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><SystemMark name={getSystemName(item.key)} /><h3 className="min-w-0 text-sm font-semibold text-heading">{item.label}</h3></div><StatusBadge status={status} /></div><p className="text-xs text-muted-foreground">{item.description}</p><div className="flex items-end justify-between gap-2 border-t border-border/70 pt-2"><p className="min-w-0 text-xs text-muted-foreground">Lần gần nhất: {getTimingDescription(item, status)}{item.dataPeriod && <span className="block">Kỳ dữ liệu: {item.dataPeriod}</span>}</p><SourceLink href={item.href} /></div></article>)}</div>
        </Card>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: DisplayStatus }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[status]}`}><StatusIcon status={status} />{getStatusLabel(status)}</span>;
}

function SourceLink({ href }: { href: string }) {
  return <Link href={href} className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold text-primary hover:bg-primary/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Mở nguồn <ArrowUpRight aria-hidden="true" className="size-3.5" /></Link>;
}
