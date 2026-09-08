'use client';

import Image from 'next/image';
import { Maximize2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export function PreviewImageViewer({ src, alt, width, height }: Props) {
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
      <div className="flex justify-end">
        <Button
          ref={openButtonRef}
          variant="secondary"
          className="w-full sm:w-auto"
          aria-haspopup="dialog"
          onClick={() => setIsOpen(true)}
        >
          <Maximize2 aria-hidden="true" className="size-4" />
          Xem toàn màn hình
        </Button>
      </div>

      <div className="mx-auto w-full max-w-[540px] overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="(min-width: 768px) 540px, calc(100vw - 64px)"
          unoptimized
          className="h-auto w-full"
        />
      </div>

      {isOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-foreground/95"
            onKeyDown={(event) => {
              if (event.key === 'Tab') {
                event.preventDefault();
                closeButtonRef.current?.focus();
              }
            }}
          >
            <div className="z-10 flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-background/20 bg-foreground/95 px-4 py-2 supports-backdrop-filter:backdrop-blur-lg">
              <h2 id={titleId} className="text-base font-semibold text-background">
                Xem báo cáo toàn màn hình
              </h2>
              <Button
                ref={closeButtonRef}
                variant="secondary"
                className="shrink-0"
                onClick={() => setIsOpen(false)}
              >
                <X aria-hidden="true" className="size-5" />
                Đóng
              </Button>
            </div>

            <div className="mx-auto flex min-h-0 w-full flex-1 items-center justify-center p-2 sm:p-4">
              <Image
                src={src}
                alt={alt}
                width={width}
                height={height}
                sizes="100vw"
                unoptimized
                priority
                className="h-auto max-h-full w-auto max-w-full bg-card object-contain"
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
