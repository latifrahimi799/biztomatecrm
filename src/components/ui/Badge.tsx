import { cn } from '../../lib/cn';

const tones: Record<string, string> = {
  default: 'bg-brand/15 text-brand ring-1 ring-brand/20',
  success: 'bg-success/15 text-emerald-700 ring-1 ring-success/25',
  warning: 'bg-warning/15 text-amber-800 ring-1 ring-warning/25',
  error: 'bg-error/15 text-red-700 ring-1 ring-error/20',
  muted: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  secondary: 'bg-brand-secondary/15 text-brand-secondary ring-1 ring-brand-secondary/20',
};

export function Badge({
  children,
  tone = 'default',
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
