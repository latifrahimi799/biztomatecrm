import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      {/* Full-viewport opaque scrim so page content (e.g. Microsoft card) cannot show through */}
      <button
        type="button"
        className="absolute inset-0 z-0 bg-slate-900/70 backdrop-blur-md"
        aria-label="Close dialog"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="crm-modal-title"
        className={cn(
          'relative z-10 flex max-h-[min(92vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-brand/15 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.45)]',
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-brand/10 bg-gradient-to-r from-brand/5 via-white to-brand-secondary/5 px-6 py-4">
          <h2 id="crm-modal-title" className="text-lg font-bold tracking-tight text-gray-900">
            {title}
          </h2>
          <Button
            variant="ghost"
            className="!rounded-full !p-1.5 text-gray-500 hover:bg-brand/10 hover:text-brand"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
