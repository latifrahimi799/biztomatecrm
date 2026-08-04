import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

/**
 * Always portaled to document.body so stacking contexts inside the app
 * (sidebar/main/cards) cannot paint above the dialog.
 */
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
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) {
      document.body.style.paddingRight = `${scrollbar}px`;
    }
    document.documentElement.classList.add('crm-modal-open');
    document.getElementById('root')?.setAttribute('aria-hidden', 'true');
    document.getElementById('root')?.setAttribute('inert', '');

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      document.documentElement.classList.remove('crm-modal-open');
      document.getElementById('root')?.removeAttribute('aria-hidden');
      document.getElementById('root')?.removeAttribute('inert');
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="crm-modal-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      role="presentation"
    >
      {/* Fully opaque cover — no translucency so Setup page text cannot read through */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          margin: 0,
          border: 0,
          padding: 0,
          cursor: 'pointer',
          background: 'rgba(15, 23, 42, 0.92)',
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="crm-modal-title"
        className={cn(
          'relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white',
          className,
        )}
        style={{
          zIndex: 1,
          maxHeight: 'min(92vh, 40rem)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
          isolation: 'isolate',
          backgroundColor: '#ffffff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-4"
          style={{ backgroundColor: '#ffffff' }}
        >
          <h2
            id="crm-modal-title"
            className="text-lg font-bold tracking-tight text-slate-900"
          >
            {title}
          </h2>
          <Button
            variant="ghost"
            className="!rounded-full !p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div
          className="overflow-y-auto px-6 py-5"
          style={{ backgroundColor: '#ffffff' }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
