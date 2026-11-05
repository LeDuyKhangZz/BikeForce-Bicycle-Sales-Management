import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  ContactRound,
  Search,
  Send,
  UsersRound,
} from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ContactCountCard } from '@/features/admin-salework-customers/contact-count-card';
import { SaleWorkCustomersSyncButton } from '@/features/admin-salework-customers/sync-button';
import { requireRole } from '@/features/auth/queries';
import { getVietnamMonthRange } from '@/lib/date';
import { parsePageParam } from '@/lib/reports/pagination';
import { createClient } from '@/lib/supabase/server';
import { listSaleWorkZaloCustomers } from '@/services/salework-zalo-customers';

export const metadata: Metadata = { title: 'Khách hàng SaleWork · BikeForce' };

type RawParam = string | string[] | undefined;
type Props = { searchParams: Promise<Record<string, RawParam>> };
type CategoryFilter = 'all' | 'friends' | 'directory' | 'requests';

function first(raw: RawParam): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function AdminSaleWorkCustomersPage({ searchParams }: Props) {
  await requireRole('ADMIN');
  const params = await searchParams;
  const page = parsePageParam(first(params.page));
  const search = (first(params.q) ?? '').trim().slice(0, 60);
  const rawCategory = first(params.category);
  const category: CategoryFilter = rawCategory === 'friends' || rawCategory === 'directory' || rawCategory === 'requests'
    ? rawCategory
    : 'all';
  const rawMonth = first(params.month) ?? '';
  const month = getVietnamMonthRange(rawMonth) ? rawMonth : '';
  const supabase = await createClient();
  const result = await listSaleWorkZaloCustomers(supabase, page, search, { category, month });

  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    if (search) query.set('q', search);
    if (category !== 'all') query.set('category', category);
    if (month) query.set('month', month);
    if (target > 1) query.set('page', String(target));
    const text = query.toString();
    return `/admin/salework/customers${text ? `?${text}` : ''}`;
  };
  const pageCount = result.pageInfo.pageCount;
  const currentPage = result.pageInfo.page;
  const visiblePages = getVisiblePages(currentPage, pageCount);

  return (
    <div className="relative isolate flex min-h-full flex-col gap-5 overflow-hidden rounded-2xl bg-linear-to-br from-status-info-bg/60 via-background to-background p-3 sm:gap-6 sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute -top-32 right-8 -z-10 size-80 rounded-full bg-primary/10 blur-3xl" />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <UsersRound className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium text-muted-foreground">BikeForce&nbsp; › &nbsp;Quản trị</p>
            <h1 className="text-2xl font-bold tracking-tight text-heading">Khách hàng và liên hệ</h1>
            <p className="mt-1 text-sm text-muted-foreground">Danh sách đồng bộ từ tài khoản SaleWork đang liên kết.</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <SaleWorkCustomersSyncButton />
          <p className="text-xs text-muted-foreground sm:text-right">
            Cập nhật lần cuối: {result.latestSync ? formatDateTime(result.latestSync) : 'Chưa đồng bộ'}
          </p>
        </div>
      </header>

      <section aria-label="Tổng số liên hệ SaleWork" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ContactCountCard label="Tất cả liên hệ" count={result.counts.total} icon="users" tone="blue" category="all" />
        <ContactCountCard label="Bạn bè Zalo" count={result.counts.friends} icon="users" tone="green" category="friends" />
        <ContactCountCard label="Danh bạ SaleWork" count={result.counts.directory} icon="contact" tone="violet" category="directory" />
        <ContactCountCard label="Lời mời kết bạn" count={result.counts.requests} icon="send" tone="orange" category="requests" />
      </section>

      <section aria-label="Phân tích liên hệ" className="grid gap-3 xl:grid-cols-3">
        <Card className="flex min-w-0 flex-col gap-2 p-4 sm:p-5">
          <h2 className="font-semibold text-heading">Liên hệ theo nguồn</h2>
          <SourceDistributionChart counts={result.counts} />
        </Card>
        <Card className="flex min-w-0 flex-col gap-2 p-4 sm:p-5">
          <h2 className="font-semibold text-heading">Cập nhật theo nguồn · 7 ngày</h2>
          <p className="text-xs text-muted-foreground">Mỗi liên hệ được tính theo lần thay đổi dữ liệu gần nhất.</p>
          <DailyUpdateBars data={result.dailySyncCounts} />
        </Card>
        <Card className="flex min-w-0 flex-col gap-2 p-4 sm:p-5">
          <h2 className="font-semibold text-heading">Nhịp cập nhật liên hệ</h2>
          <p className="text-xs text-muted-foreground">Số liên hệ có mốc cập nhật gần nhất theo ngày, không phải tổng lịch sử.</p>
          <DailyUpdateTrend data={result.dailySyncCounts} />
        </Card>
      </section>

      <Card className="flex flex-col gap-4 p-3 sm:p-4">
        <form action="/admin/salework/customers" method="get" className="grid gap-2 lg:grid-cols-[minmax(16rem,1fr)_10rem_11rem_auto]">
          <label className="relative block min-w-0">
            <span className="sr-only">Tìm kiếm theo tên hoặc số điện thoại</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" type="search" maxLength={60} defaultValue={search} placeholder="Tìm kiếm theo tên hoặc số điện thoại..." className="h-11 min-h-11 rounded-full border-transparent bg-background pl-11 focus:border-input-border" />
          </label>
          <label>
            <span className="sr-only">Lọc theo nhóm liên hệ</span>
            <select name="category" defaultValue={category} className="h-11 w-full rounded-full border border-border bg-background px-4 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <option value="all">Tất cả nguồn</option>
              <option value="friends">Bạn bè Zalo</option>
              <option value="directory">Danh bạ SaleWork</option>
              <option value="requests">Lời mời kết bạn</option>
            </select>
          </label>
          <label className="relative">
            <span className="sr-only">Lọc theo tháng đồng bộ</span>
            <Input name="month" type="month" defaultValue={month} className="h-11 min-h-11 rounded-full bg-background px-4 text-sm" />
          </label>
          <div className="flex gap-2">
            <button type="submit" className={buttonClassName({ size: 'md', className: 'min-h-11 rounded-full px-5' })}>Lọc</button>
            <Link href="/admin/salework/customers" className={buttonClassName({ variant: 'secondary', size: 'md', className: 'min-h-11 rounded-full px-4' })}>Đặt lại</Link>
          </div>
        </form>

        {result.rows.length === 0 ? (
          <p className="rounded-xl bg-background p-6 text-center text-sm text-muted-foreground">Không tìm thấy liên hệ phù hợp.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-status-info-bg/55 text-xs font-semibold text-heading">
                  <tr>
                    <th scope="col" className="px-4 py-3.5">Tên liên hệ</th>
                    <th scope="col" className="px-4 py-3.5">Số điện thoại</th>
                    <th scope="col" className="px-4 py-3.5">Nhóm</th>
                    <th scope="col" className="px-4 py-3.5">Nguồn</th>
                    <th scope="col" className="px-4 py-3.5">Cập nhật</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {result.rows.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-status-info-bg/25">
                      <td className="max-w-[420px] px-4 py-2.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold ${avatarTone(row.name)}`}>{getInitials(row.name)}</span>
                          <span className="truncate font-semibold text-heading">{row.name}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-foreground">{row.phone ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-2.5"><CategoryBadge category={row.category} /></td>
                      <td className="whitespace-nowrap px-4 py-2.5"><SourceBadge source={row.source} /></td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-muted-foreground">{formatDateTime(row.syncedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <nav aria-label="Phân trang liên hệ SaleWork" className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm">
              <p className="text-muted-foreground">Hiển thị {result.pageInfo.rangeStart}–{result.pageInfo.rangeEnd} trong {result.pageInfo.total.toLocaleString('vi-VN')} liên hệ</p>
              <div className="flex items-center gap-1">
                <PageLink href={result.pageInfo.hasPrev ? pageHref(currentPage - 1) : null} label="Trang trước" icon={<ArrowLeft aria-hidden="true" className="size-4" />} />
                {visiblePages.map((item, index) => item === 'ellipsis'
                  ? <span key={`ellipsis-${index}`} className="px-1 text-muted-foreground" aria-hidden="true">…</span>
                  : <Link key={item} href={pageHref(item)} aria-current={item === currentPage ? 'page' : undefined} className={buttonClassName({ variant: item === currentPage ? 'primary' : 'secondary', size: 'md', className: 'min-h-9 min-w-9 rounded-lg px-2.5' })}>{item}</Link>)}
                <PageLink href={result.pageInfo.hasNext ? pageHref(currentPage + 1) : null} label="Trang sau" icon={<ArrowRight aria-hidden="true" className="size-4" />} />
              </div>
            </nav>
          </>
        )}
      </Card>
    </div>
  );
}

const CHART_SOURCE_SERIES = [
  { key: 'friends', label: 'Bạn bè Zalo', color: '#3478e5' },
  { key: 'directory', label: 'Danh bạ SaleWork', color: '#ad56d5' },
  { key: 'requests', label: 'Lời mời kết bạn', color: '#f59b28' },
] as const;

function SourceDistributionChart({ counts }: { counts: { total: number; friends: number; directory: number; requests: number } }) {
  const circumference = 2 * Math.PI * 64;
  let offset = 0;
  const segments = CHART_SOURCE_SERIES.map((series) => {
    const amount = counts[series.key];
    const length = counts.total > 0 ? amount / counts.total * circumference : 0;
    const segment = { ...series, amount, length, offset };
    offset += length;
    return segment;
  });

  return (
    <div className="grid min-h-48 grid-cols-[minmax(130px,0.9fr)_minmax(0,1fr)] items-center gap-2">
      <svg viewBox="0 0 180 180" role="img" aria-label={`Tỷ trọng ${counts.total.toLocaleString('vi-VN')} liên hệ theo nguồn`} className="mx-auto w-full max-w-48">
        <circle cx="90" cy="90" r="64" fill="none" stroke="var(--color-border)" strokeWidth="22" />
        <g transform="rotate(-90 90 90)">
          {segments.map((segment) => <circle key={segment.key} cx="90" cy="90" r="64" fill="none" stroke={segment.color} strokeWidth="22" strokeDasharray={`${segment.length} ${circumference - segment.length}`} strokeDashoffset={-segment.offset}><title>{`${segment.label}: ${segment.amount.toLocaleString('vi-VN')}`}</title></circle>)}
        </g>
        <text x="90" y="87" textAnchor="middle" className="fill-heading text-2xl font-bold">{counts.total.toLocaleString('vi-VN')}</text>
        <text x="90" y="106" textAnchor="middle" className="fill-muted-foreground text-[10px]">Liên hệ</text>
      </svg>
      <ul className="flex flex-col gap-3">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-start gap-2 text-xs sm:text-sm">
            <span aria-hidden="true" className="mt-1 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="min-w-0 text-foreground">{segment.label}<strong className="ml-1 whitespace-nowrap">{segment.amount.toLocaleString('vi-VN')}</strong><span className="ml-1 text-muted-foreground">{counts.total ? `${(segment.amount / counts.total * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%` : '0%'}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type DailyCount = { date: string; label: string; friends: number; directory: number; requests: number; total: number };

function DailyUpdateBars({ data }: { data: readonly DailyCount[] }) {
  const width = 520;
  const height = 230;
  const left = 42;
  const right = 12;
  const top = 14;
  const bottom = 38;
  const plotHeight = height - top - bottom;
  const maxCount = Math.max(3, ...data.map((day) => day.total));
  const step = Math.max(1, Math.ceil(maxCount / 3));
  const max = step * 3;
  const plotWidth = width - left - right;
  const slot = plotWidth / Math.max(1, data.length);
  const barWidth = Math.min(34, slot * 0.58);

  return (
    <div className="min-w-0">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Số liên hệ theo lần cập nhật gần nhất trong 7 ngày, chia theo nguồn" className="h-auto w-full">
        {[0, 1, 2, 3].map((tick) => {
          const value = tick * step;
          const y = top + plotHeight - value / max * plotHeight;
          return <g key={value}><line x1={left} y1={y} x2={width - right} y2={y} stroke="var(--color-border)" strokeWidth="1" /><text x={left - 7} y={y + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{value}</text></g>;
        })}
        {data.map((day, index) => {
          const x = left + index * slot + (slot - barWidth) / 2;
          let y = top + plotHeight;
          const values = [day.friends, day.directory, day.requests];
          return <g key={day.date}>
            {values.map((value, sourceIndex) => {
              const series = CHART_SOURCE_SERIES[sourceIndex];
              const segmentHeight = value / max * plotHeight;
              y -= segmentHeight;
              return <rect key={series?.key} x={x} y={y} width={barWidth} height={segmentHeight} rx={sourceIndex === 2 ? 3 : 0} fill={series?.color}><title>{`${day.label} · ${series?.label}: ${value}`}</title></rect>;
            })}
            <text x={x + barWidth / 2} y={height - 12} textAnchor="middle" className="fill-muted-foreground text-[10px]">{day.label}</text>
          </g>;
        })}
      </svg>
      <ChartLegend />
    </div>
  );
}

function DailyUpdateTrend({ data }: { data: readonly DailyCount[] }) {
  const width = 520;
  const height = 230;
  const left = 42;
  const right = 16;
  const top = 14;
  const bottom = 38;
  const plotHeight = height - top - bottom;
  const maxCount = Math.max(3, ...data.map((day) => day.total));
  const step = Math.max(1, Math.ceil(maxCount / 3));
  const max = step * 3;
  const plotWidth = width - left - right;
  const points = data.map((day, index) => ({
    ...day,
    x: left + (data.length <= 1 ? plotWidth / 2 : index / (data.length - 1) * plotWidth),
    y: top + plotHeight - day.total / max * plotHeight,
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = points.length ? `M ${points[0]?.x} ${top + plotHeight} L ${points.map((point) => `${point.x} ${point.y}`).join(' L ')} L ${points.at(-1)?.x} ${top + plotHeight} Z` : '';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Liên hệ được cập nhật gần nhất theo ngày trong 7 ngày" className="h-auto w-full">
      {[0, 1, 2, 3].map((tick) => {
        const value = tick * step;
        const y = top + plotHeight - value / max * plotHeight;
        return <g key={value}><line x1={left} y1={y} x2={width - right} y2={y} stroke="var(--color-border)" strokeWidth="1" /><text x={left - 7} y={y + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{value}</text></g>;
      })}
      {area && <path d={area} fill="#34b783" fillOpacity="0.12" />}
      <polyline points={line} fill="none" stroke="#27a875" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((point) => <g key={point.date}><circle cx={point.x} cy={point.y} r="4" fill="var(--color-card)" stroke="#27a875" strokeWidth="2.5"><title>{`${point.label}: ${point.total.toLocaleString('vi-VN')} liên hệ`}</title></circle><text x={point.x} y={height - 12} textAnchor="middle" className="fill-muted-foreground text-[10px]">{point.label}</text></g>)}
    </svg>
  );
}

function ChartLegend() {
  return <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">{CHART_SOURCE_SERIES.map((series) => <li key={series.key} className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: series.color }} />{series.label}</li>)}</ul>;
}

function CategoryBadge({ category }: { category: 'Bạn bè' | 'Danh bạ Salework' | 'Lời mời kết bạn' }) {
  const styles = category === 'Bạn bè'
    ? 'bg-blue-100 text-blue-700'
    : category === 'Danh bạ Salework'
      ? 'bg-violet-100 text-violet-700'
      : 'bg-orange-100 text-orange-700';
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles}`}><ContactRound aria-hidden="true" className="mr-1.5 size-3.5" />{category}</span>;
}

function SourceBadge({ source }: { source: 'Zalo' | 'SaleWork' | 'Lời mời kết bạn' }) {
  const styles = source === 'Zalo'
    ? 'bg-sky-100 text-sky-800'
    : source === 'SaleWork'
      ? 'bg-violet-100 text-violet-800'
      : 'bg-orange-100 text-orange-800';
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{source}</span>;
}

function PageLink({ href, label, icon }: { href: string | null; label: string; icon: React.ReactNode }) {
  return href
    ? <Link href={href} aria-label={label} className={buttonClassName({ variant: 'secondary', size: 'md', className: 'min-h-9 min-w-9 rounded-lg px-2.5' })}>{icon}</Link>
    : <span aria-hidden="true" className={buttonClassName({ variant: 'secondary', size: 'md', className: 'min-h-9 min-w-9 rounded-lg px-2.5 opacity-45' })}>{icon}</span>;
}

function getVisiblePages(current: number, total: number): (number | 'ellipsis')[] {
  const nearbyPages = current <= 2 ? [1, 2, 3] : [1, current - 1, current, current + 1, total];
  const candidates = [...new Set([...nearbyPages, total])]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];
  for (const page of candidates) {
    const previous = result.at(-1);
    if (typeof previous === 'number' && page - previous > 1) result.push('ellipsis');
    result.push(page);
  }
  return result;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) return '?';
  return `${words.length > 1 ? words[0]?.[0] ?? '' : ''}${words.at(-1)?.[0] ?? ''}`.toLocaleUpperCase('vi-VN');
}

function avatarTone(name: string): string {
  const tones = ['bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700', 'bg-orange-100 text-orange-700', 'bg-teal-100 text-teal-700'] as const;
  const hash = [...name].reduce((value, char) => value + char.charCodeAt(0), 0);
  return tones[hash % tones.length] ?? tones[0];
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
}
