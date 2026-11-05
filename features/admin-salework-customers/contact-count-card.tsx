'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, ContactRound, Search, Send, UsersRound, X } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PageInfo } from '@/lib/reports/pagination';
import type {
  SaleWorkZaloCustomer,
  SaleWorkZaloCustomerCategoryFilter,
} from '@/services/salework-zalo-customers';

type Tone = 'blue' | 'green' | 'violet' | 'orange';
type IconName = 'users' | 'contact' | 'send';
type Props = {
  label: string;
  count: number;
  icon: IconName;
  tone: Tone;
  category: SaleWorkZaloCustomerCategoryFilter;
};

type CustomerDialogResponse = { rows: SaleWorkZaloCustomer[]; pageInfo: PageInfo };

const TONE_CLASS: Record<Tone, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-emerald-100 text-emerald-700',
  violet: 'bg-violet-100 text-violet-700',
  orange: 'bg-orange-100 text-orange-700',
};

const CATEGORY_TITLE: Record<SaleWorkZaloCustomerCategoryFilter, string> = {
  all: 'Tất cả liên hệ',
  friends: 'Bạn bè Zalo',
  directory: 'Danh bạ SaleWork',
  requests: 'Lời mời kết bạn',
};

export function ContactCountCard({ label, count, icon: Icon, tone, category }: Props) {
  const IconComponent = Icon === 'users' ? UsersRound : Icon === 'contact' ? ContactRound : Send;
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<SaleWorkZaloCustomer[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

  async function loadPage(targetPage: number, term: string) {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ category, page: String(targetPage) });
    if (term.trim()) params.set('q', term.trim());
    try {
      const response = await fetch(`/api/admin/salework/customers?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json() as CustomerDialogResponse | { message?: string };
      if (!response.ok || !('rows' in payload)) {
        throw new Error('message' in payload ? payload.message : undefined);
      }
      setRows(payload.rows);
      setPageInfo(payload.pageInfo);
      setPage(payload.pageInfo.page);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được danh sách liên hệ.');
      setRows([]);
      setPageInfo(null);
    } finally {
      setLoading(false);
    }
  }

  function openDialog() {
    setOpen(true);
    setSearch('');
    setPage(1);
    void loadPage(1, '');
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadPage(1, search);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openDialog}
        className="group relative flex min-h-28 w-full items-center gap-4 overflow-hidden rounded-xl border border-border/70 bg-card p-4 text-left shadow-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-5"
      >
        <span aria-hidden="true" className={`grid size-12 shrink-0 place-items-center rounded-full ${TONE_CLASS[tone]}`}><IconComponent className="size-6" /></span>
        <span className="min-w-0"><span className="block text-sm text-muted-foreground">{label}</span><span className="block text-2xl font-bold tabular-nums tracking-tight text-heading">{count.toLocaleString('vi-VN')}</span></span>
        <span aria-hidden="true" className={`pointer-events-none absolute -right-7 -bottom-9 size-24 rounded-full opacity-40 blur-2xl ${TONE_CLASS[tone]}`} />
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/45 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="salework-contact-dialog-title"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <ContactDialogContents
            title={CATEGORY_TITLE[category]}
            closeRef={closeRef}
            triggerRef={triggerRef}
            rows={rows}
            pageInfo={pageInfo}
            page={page}
            search={search}
            loading={loading}
            error={error}
            onSearchChange={setSearch}
            onSubmitSearch={submitSearch}
            onLoadPage={(nextPage) => void loadPage(nextPage, search)}
            onClose={() => setOpen(false)}
          />
        </div>,
        document.body,
      )}
    </>
  );
}

function ContactDialogContents({
  title,
  closeRef,
  triggerRef,
  rows,
  pageInfo,
  page,
  search,
  loading,
  error,
  onSearchChange,
  onSubmitSearch,
  onLoadPage,
  onClose,
}: {
  title: string;
  closeRef: React.RefObject<HTMLButtonElement | null>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  rows: SaleWorkZaloCustomer[];
  pageInfo: PageInfo | null;
  page: number;
  search: string;
  loading: boolean;
  error: string | null;
  onSearchChange: (value: string) => void;
  onSubmitSearch: (event: FormEvent<HTMLFormElement>) => void;
  onLoadPage: (page: number) => void;
  onClose: () => void;
}) {
  return (
    <section className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-status-info-bg text-primary"><UsersRound className="size-5" /></span>
          <div className="min-w-0"><h2 id="salework-contact-dialog-title" className="text-lg font-bold text-heading">{title}</h2><p className="text-sm text-muted-foreground">{pageInfo ? `${pageInfo.total.toLocaleString('vi-VN')} liên hệ` : 'Danh sách đồng bộ từ SaleWork'}</p></div>
        </div>
        <button ref={closeRef} type="button" aria-label="Đóng danh sách" onClick={() => { onClose(); triggerRef.current?.focus(); }} className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-background focus-visible:outline-2 focus-visible:outline-ring"><X aria-hidden="true" className="size-5" /></button>
      </header>

      <form onSubmit={onSubmitSearch} className="border-b border-border px-4 py-3 sm:px-6">
        <label className="relative block"><span className="sr-only">Tìm liên hệ trong danh sách</span><Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => onSearchChange(event.currentTarget.value)} maxLength={60} placeholder="Tìm theo tên hoặc số điện thoại..." className="pl-11" /></label>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:px-6" aria-busy={loading}>
        {error && <p role="alert" className="rounded-lg bg-status-missed-bg p-3 text-sm text-status-missed-fg">{error}</p>}
        {loading ? <p className="py-10 text-center text-sm text-muted-foreground">Đang tải danh sách…</p> : !error && rows.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Không tìm thấy liên hệ phù hợp.</p> : (
          <ul className="divide-y divide-border/70">
            {rows.map((row) => <li key={row.id} className="grid gap-1.5 py-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(8rem,0.8fr)_minmax(8rem,0.8fr)] sm:items-center sm:gap-4">
              <div className="min-w-0"><p className="truncate font-semibold text-heading">{row.name}</p><p className="break-all text-xs text-muted-foreground sm:hidden">{row.phone ?? 'Chưa có số điện thoại'}</p></div>
              <p className="hidden whitespace-nowrap text-sm tabular-nums text-foreground sm:block">{row.phone ?? '—'}</p>
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-status-info-bg px-2.5 py-1 text-xs font-medium text-status-info-fg">{row.category}</span><span className="text-xs text-muted-foreground">{formatCustomerDate(row.syncedAt)}</span></div>
            </li>)}
          </ul>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
        <p className="text-sm text-muted-foreground">{pageInfo && pageInfo.total > 0 ? `Hiển thị ${pageInfo.rangeStart}–${pageInfo.rangeEnd} trong ${pageInfo.total.toLocaleString('vi-VN')}` : 'Danh sách liên hệ'}</p>
        {pageInfo && pageInfo.pageCount > 1 && <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1 || loading} onClick={() => onLoadPage(page - 1)} aria-label="Trang trước" className={buttonClassName({ variant: 'secondary', className: 'min-h-10 px-3' })}><ArrowLeft aria-hidden="true" className="size-4" /></button>
          <span className="min-w-16 text-center text-sm tabular-nums text-muted-foreground">{page} / {pageInfo.pageCount}</span>
          <button type="button" disabled={page >= pageInfo.pageCount || loading} onClick={() => onLoadPage(page + 1)} aria-label="Trang sau" className={buttonClassName({ variant: 'secondary', className: 'min-h-10 px-3' })}><ArrowRight aria-hidden="true" className="size-4" /></button>
        </div>}
        {pageInfo && pageInfo.total === 0 && <CheckCircle2 aria-hidden="true" className="sr-only" />}
      </footer>
    </section>
  );
}

function formatCustomerDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
}
