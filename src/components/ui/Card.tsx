import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--color-border)]/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,122,255,0.06)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <h2 className={cn('text-base font-semibold text-gray-900', className)}>{children}</h2>;
}
