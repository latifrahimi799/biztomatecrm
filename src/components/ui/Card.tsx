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
        'rounded-2xl border border-brand/15 bg-white/90 p-5 shadow-[0_8px_30px_rgba(10,132,255,0.08)] backdrop-blur-sm transition-shadow hover:shadow-[0_12px_36px_rgba(10,132,255,0.12)]',
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
  return (
    <h2 className={cn('text-base font-bold tracking-tight text-gray-900', className)}>
      {children}
    </h2>
  );
}
