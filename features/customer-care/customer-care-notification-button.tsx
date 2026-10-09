'use client';

import Link from 'next/link';
import { Bell, Clock3 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { formatVietnamDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { PendingCareNotification } from '@/services/customer-care';

type Props = {
  pendingCount: number;
  notifications: PendingCareNotification[];
};

export function CustomerCareNotificationButton({ pendingCount, notifications }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    firstLinkRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button
        ref={buttonRef}
        type="button"
        variant="secondary"
        aria-label={pendingCount > 0 ? `Thông báo: ${pendingCount} yêu cầu chăm sóc chờ duyệt` : 'Thông báo: không có yêu cầu chăm sóc chờ duyệt'}
        aria-expanded={open}
        aria-controls="customer-care-notifications"
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className="relative size-11 p-0"
      >
        <Bell aria-hidden="true" className="size-4" />
        {pendingCount > 0 && (
          <span aria-hidden="true" className={cn(
            'absolute -end-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-pill',
            'bg-destructive px-1 text-[11px] font-bold leading-none text-card tabular-nums',
          )}>
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          id="customer-care-notifications"
          role="dialog"
          aria-label="Danh sách thông báo"
          className="fixed inset-x-4 top-28 z-50 rounded-xl border border-input-border/40 bg-card p-3 text-left shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.75rem)] sm:w-[min(22rem,calc(100vw-2rem))]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
            <h2 className="text-sm font-bold text-heading">Thông báo</h2>
            <span className="text-xs text-muted-foreground">{pendingCount} chờ duyệt</span>
          </div>
          {notifications.length === 0 ? (
            <p className="py-5 text-center text-sm text-muted-foreground">Chưa có yêu cầu chăm sóc chờ duyệt.</p>
          ) : (
            <ul className="max-h-[min(60dvh,24rem)] divide-y divide-border overflow-y-auto">
              {notifications.map((notification, index) => (
                <li key={notification.id}>
                  <Link
                    ref={index === 0 ? firstLinkRef : undefined}
                    href={`/admin/customer-care#care-${notification.id}`}
                    onClick={() => setOpen(false)}
                    className="flex min-h-16 flex-col justify-center gap-1 rounded-md px-2 py-2 hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="break-words text-sm font-semibold text-heading">{notification.customer_name}</span>
                    <span className="text-xs text-muted-foreground">{notification.customer_code || 'Không có mã'} · Gửi {formatVietnamDateTime(notification.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {pendingCount > 0 && (
            <Link
              href="/admin/customer-care"
              onClick={() => setOpen(false)}
              className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-md border border-input-border/50 text-sm font-semibold text-primary hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Clock3 aria-hidden="true" className="size-4" />
              Xem tất cả yêu cầu
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
