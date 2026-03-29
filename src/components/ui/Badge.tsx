import { cn } from '../../lib/cn';

const tones: Record<string, string> = {
  default: 'bg-brand-muted text-brand',
  success: 'bg-green-50 text-success',
  warning: 'bg-orange-50 text-warning',
  error: 'bg-red-50 text-error',
  muted: 'bg-gray-100 text-muted',
  secondary: 'bg-violet-50 text-brand-secondary',
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
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
