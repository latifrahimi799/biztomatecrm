import {
  LEAD_STATUS_LABEL,
  LEAD_STATUSES,
  type Lead,
  type LeadStatus,
  normalizeLeadContactFields,
} from '../types/crm';
import { parseCsv } from './contactCsv';

function escapeCsvField(value: string): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function joinList(values: string[]): string {
  return values.filter(Boolean).join('; ');
}

function splitList(value: string): string[] {
  return value
    .split(/[;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const STATUS_ALIASES: Record<string, LeadStatus> = {
  dm: 'dm',
  'stuck at gatekeeper': 'stuck_gatekeeper',
  stuck_gatekeeper: 'stuck_gatekeeper',
  presentation: 'presentation',
  'not interested': 'not_interested',
  not_interested: 'not_interested',
  'consultation booked': 'consultation_booked',
  consultation_booked: 'consultation_booked',
  sold: 'sold',
  'invalid lead': 'invalid_lead',
  invalid_lead: 'invalid_lead',
  // legacy
  new: 'dm',
  working: 'presentation',
  nurturing: 'stuck_gatekeeper',
  qualified: 'consultation_booked',
  converted: 'sold',
  disqualified: 'invalid_lead',
};

function parseStatus(raw: string): LeadStatus {
  const key = raw.toLowerCase().trim();
  if ((LEAD_STATUSES as string[]).includes(key)) return key as LeadStatus;
  if (STATUS_ALIASES[key]) return STATUS_ALIASES[key];
  // Match labels ignoring case
  for (const s of LEAD_STATUSES) {
    if (LEAD_STATUS_LABEL[s].toLowerCase() === key) return s;
  }
  return 'dm';
}

export function leadsToCsv(leads: Lead[]): string {
  const headers = [
    'Name',
    'Company',
    'Phone numbers',
    'Emails',
    'Website',
    'Status',
    'Notes',
    'Source',
  ];
  const lines = [headers.map(escapeCsvField).join(',')];

  for (const raw of leads) {
    const l = normalizeLeadContactFields(raw);
    lines.push(
      [
        l.name,
        l.company ?? '',
        joinList(l.phones),
        joinList(l.emails.length ? l.emails : l.email ? [l.email] : []),
        l.website ?? '',
        LEAD_STATUS_LABEL[l.status] ?? l.status,
        l.notes ?? '',
        l.source ?? '',
      ]
        .map(escapeCsvField)
        .join(','),
    );
  }

  return lines.join('\n');
}

export function downloadLeadsCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type ImportKeys =
  | 'name'
  | 'company'
  | 'phones'
  | 'emails'
  | 'website'
  | 'status'
  | 'notes'
  | 'source';

const HEADER_TO_KEY: Record<string, ImportKeys> = {
  name: 'name',
  'full name': 'name',
  lead: 'name',
  'lead name': 'name',
  company: 'company',
  phone: 'phones',
  phones: 'phones',
  'phone number': 'phones',
  'phone numbers': 'phones',
  email: 'emails',
  emails: 'emails',
  website: 'website',
  site: 'website',
  url: 'website',
  status: 'status',
  notes: 'notes',
  note: 'notes',
  source: 'source',
};

export type LeadImportPayload = Omit<
  Lead,
  'id' | 'createdAt' | 'updatedAt' | 'ownerId' | 'score'
> & {
  score?: number;
  ownerId?: string;
};

export type LeadImportRow =
  | { ok: true; line: number; payload: LeadImportPayload }
  | { ok: false; line: number; error: string };

export function parseLeadsCsvForImport(
  text: string,
): { ok: false; error: string } | { ok: true; rows: LeadImportRow[] } {
  const table = parseCsv(text);
  if (table.length < 2) {
    return { ok: false, error: 'The file is empty or has no data rows.' };
  }

  const header = table[0].map((h) => h.toLowerCase().trim().replace(/\s+/g, ' '));
  const keyByIndex: (ImportKeys | null)[] = header.map((h) => HEADER_TO_KEY[h] ?? null);

  if (!keyByIndex.includes('name') && !keyByIndex.includes('emails')) {
    return {
      ok: false,
      error: 'No recognizable Name or Email column. Use headers such as "Name", "Email".',
    };
  }

  const rows: LeadImportRow[] = [];

  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    const line = r + 1;
    const bag: Partial<Record<ImportKeys, string>> = {};

    keyByIndex.forEach((key, i) => {
      if (!key) return;
      const v = (cells[i] ?? '').trim();
      if (!v) return;
      bag[key] = bag[key] ? `${bag[key]}; ${v}` : v;
    });

    const name = (bag.name ?? '').trim();
    const emails = splitList(bag.emails ?? '');
    const phones = splitList(bag.phones ?? '');

    if (!name && emails.length === 0) {
      rows.push({ ok: false, line, error: 'Missing name and email' });
      continue;
    }

    const email = emails[0] ?? '';
    rows.push({
      ok: true,
      line,
      payload: {
        name: name || email.split('@')[0] || 'Imported lead',
        email,
        emails,
        company: (bag.company ?? '').trim() || undefined,
        phone: phones[0],
        phones,
        website: (bag.website ?? '').trim() || undefined,
        status: parseStatus(bag.status ?? 'dm'),
        notes: (bag.notes ?? '').trim() || undefined,
        source: (bag.source ?? '').trim() || 'Import',
      },
    });
  }

  return { ok: true, rows };
}
