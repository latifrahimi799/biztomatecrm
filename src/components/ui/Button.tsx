import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand text-white shadow-sm hover:bg-brand-hover disabled:opacity-50',
  secondary: 'bg-brand-secondary text-white hover:opacity-90 disabled:opacity-50',
  ghost: 'bg-transparent text-brand hover:bg-brand-muted',
  danger: 'bg-error text-white hover:opacity-90',
  outline:
    'border border-border bg-white text-brand hover:bg-brand-muted border-[var(--color-border)]',
};

export function Button({
  className,
  variant = 'primary',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
