'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

type Props = {
  src: string;
  alt: string;
};

export function EvidenceImageViewer({ src, alt }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const openButton = openButtonRef.current;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
      openButton?.focus();
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={openButtonRef}
        type="button"
        aria-haspopup="dialog"
        className="group relative min-h-32 overflow-hidden rounded-lg border border-input-border/60 bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        onClick={() => setIsOpen(true)}
      >
        {/* Signed Cloudinary URL is already the final optimized image; Next Image proxy would not add value. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-32 w-full object-cover transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transition-none" />
        <span className="absolute inset-x-2 bottom-2 flex min-h-8 items-center justify-center gap-1.5 rounded-md bg-foreground/85 px-2 text-xs font-semibold text-card">
          <Maximize2 aria-hidden="true" className="size-4" />
          Xem ảnh lớn
        </span>
      </button>

      {isOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-[100] flex h-dvh flex-col overflow-hidden bg-foreground/95"
          onKeyDown={(event) => {
            if (event.key === 'Tab') {
              event.preventDefault();
              closeButtonRef.current?.focus();
            }
          }}
        >
          <div className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-background/20 px-4 py-2">
            <h2 id={titleId} className="text-base font-semibold text-card">Ảnh chăm sóc khách hàng</h2>
            <Button ref={closeButtonRef} variant="secondary" onClick={() => setIsOpen(false)}>
              <X aria-hidden="true" className="size-5" />
              Đóng
            </Button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-2 sm:p-4" onClick={() => setIsOpen(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="h-auto max-h-full w-auto max-w-full object-contain" onClick={(event) => event.stopPropagation()} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
