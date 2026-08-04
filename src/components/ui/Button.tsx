import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-brand to-brand-secondary text-white shadow-md shadow-brand/25 hover:brightness-105 disabled:opacity-50',
  secondary:
    'bg-brand-secondary text-white shadow-sm shadow-brand-secondary/25 hover:brightness-110 disabled:opacity-50',
  ghost: 'bg-transparent text-brand hover:bg-brand/10',
  danger: 'bg-error text-white shadow-sm hover:brightness-105',
  outline:
    'border border-brand/30 bg-white/90 text-brand hover:border-brand hover:bg-brand/10',
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
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
