import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-brand/20 bg-white px-3 py-2 text-sm outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand/25',
        className,
      )}
      {...props}
    />
  );
}
