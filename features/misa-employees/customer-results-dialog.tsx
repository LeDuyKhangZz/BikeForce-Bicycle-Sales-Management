'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { UsersRound, X } from 'lucide-react';

type Props = {
  title: string;
  closeHref: string;
  children: ReactNode;
};

const subscribeToHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function CustomerResultsDialog({ title, closeHref, children }: Props) {
  const router = useRouter();
  const closeRef = useRef<HTMLAnchorElement>(null);
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!hydrated) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') router.push(closeHref);
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [closeHref, router, hydrated]);

  if (!hydrated) return null;

  // Render ngoài main có animation để fixed luôn neo vào viewport.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-2 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="customer-results-dialog-title">
      <Link href={closeHref} aria-label="Đóng danh sách khách hàng" className="absolute inset-0 bg-foreground/45" />
      <section className="relative flex h-[calc(100dvh-8px)] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl bg-background pb-[env(safe-area-inset-bottom)] shadow-xl sm:h-auto sm:max-h-[90dvh] sm:rounded-2xl sm:pb-0">
        <div aria-hidden="true" className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border" />
        <header className="flex shrink-0 items-center justify-between gap-2 bg-card px-3 py-3 sm:px-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><UsersRound aria-hidden="true" className="size-5" /></span>
          <div className="min-w-0 flex-1"><h2 id="customer-results-dialog-title" className="text-base font-bold text-heading sm:text-lg">{title}</h2><p className="mt-1 text-xs text-muted-foreground">Danh sách khách hàng và doanh số theo tháng</p></div>
          <Link ref={closeRef} href={closeHref} aria-label="Đóng" className="grid size-11 shrink-0 place-items-center rounded-full text-heading hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <X aria-hidden="true" className="size-5" />
          </Link>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </section>
    </div>,
    document.body,
  );
}
