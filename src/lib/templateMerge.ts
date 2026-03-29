import type { Contact, Lead } from '../types/crm';

export type MergeContext = {
  contact?: Contact | null;
  lead?: Lead | null;
  /** Company display name when only a lead (free-text company) or resolved from contact */
  companyName?: string;
};

function companyFromContext(ctx: MergeContext): string {
  if (ctx.companyName?.trim()) return ctx.companyName.trim();
  return '';
}

/** Replace {{FieldName}} tokens (Zoho-style) for preview or future send. */
export function applyMergeFields(template: string, ctx: MergeContext): string {
  const c = ctx.contact;
  const l = ctx.lead;

  const firstName = c?.firstName ?? (l ? l.name.trim().split(/\s+/)[0] : '') ?? '';
  const lastName =
    c?.lastName ??
    (l
      ? l.name
          .trim()
          .split(/\s+/)
          .slice(1)
          .join(' ')
      : '') ??
    '';
  const email = c?.email ?? l?.email ?? '';
  const phone = c?.phone ?? l?.phone ?? '';
  const jobTitle = c?.jobTitle ?? '';
  const company = companyFromContext(ctx) || (l?.company ?? '');

  const map: Record<string, string> = {
    FirstName: firstName || '—',
    LastName: lastName || '—',
    Email: email || '—',
    Company: company || '—',
    Phone: phone || '—',
    JobTitle: jobTitle || '—',
  };

  let out = template;
  for (const [key, val] of Object.entries(map)) {
    const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    out = out.replace(re, val);
  }
  return out;
}
