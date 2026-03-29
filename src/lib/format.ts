import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatMoney(value: number, currency = 'CAD') {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(0)}`;
  }
}

export function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

export function formatDateTime(iso?: string) {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), "MMM d, yyyy '·' h:mm a");
  } catch {
    return iso;
  }
}

export function relativeTime(iso?: string) {
  if (!iso) return '—';
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}
