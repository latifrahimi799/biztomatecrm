import type { Company, Contact, ContactLifecycle } from '../types/crm';

const OWNER = 'user-1';

const LIFECYCLES: ContactLifecycle[] = ['subscriber', 'lead', 'customer', 'churned'];

function norm(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

function escapeCsvField(value: string): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Minimal RFC-style CSV parser (quoted fields, commas, newlines). */
export function parseCsv(text: string): string[][] {
  let t = text;
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let i = 0;
  let inQuotes = false;

  const pushRow = () => {
    row.push(field);
    const nonEmpty = row.some((c) => c.length > 0);
    if (nonEmpty || rows.length === 0) rows.push(row);
    row = [];
    field = '';
  };

  while (i < t.length) {
    const c = t[i];
    if (inQuotes) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\r') {
      i++;
      continue;
    }
    if (c === '\n') {
      pushRow();
      i++;
      continue;
    }
    field += c;
    i++;
  }
  pushRow();

  while (rows.length > 0 && rows[rows.length - 1].every((c) => c.trim() === '')) {
    rows.pop();
  }
  return rows;
}

type ImportKeys =
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'jobTitle'
  | 'company'
  | 'tags'
  | 'source'
  | 'lifecycle'
  | 'notes';

const HEADER_TO_KEY: Record<string, ImportKeys> = {
  'first name': 'firstName',
  firstname: 'firstName',
  first_name: 'firstName',
  'last name': 'lastName',
  lastname: 'lastName',
  last_name: 'lastName',
  name: 'fullName',
  'full name': 'fullName',
  fullname: 'fullName',
  displayname: 'fullName',
  email: 'email',
  'e-mail': 'email',
  mail: 'email',
  phone: 'phone',
  'phone number': 'phone',
  mobile: 'phone',
  tel: 'phone',
  title: 'jobTitle',
  'job title': 'jobTitle',
  jobtitle: 'jobTitle',
  role: 'jobTitle',
  company: 'company',
  organization: 'company',
  organisation: 'company',
  account: 'company',
  tags: 'tags',
  source: 'source',
  lifecycle: 'lifecycle',
  stage: 'lifecycle',
  notes: 'notes',
  note: 'notes',
};

function parseLifecycle(raw: string | undefined): ContactLifecycle {
  if (!raw?.trim()) return 'lead';
  const n = norm(raw);
  const m = LIFECYCLES.find((l) => l === n);
  return m ?? 'lead';
}

function parseTags(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function splitFullName(full: string): { first: string; last: string } {
  const p = full.trim().split(/\s+/);
  if (p.length === 0) return { first: '—', last: '—' };
  if (p.length === 1) return { first: p[0], last: '—' };
  return { first: p[0], last: p.slice(1).join(' ') };
}

function buildHeaderIndex(headerRow: string[]): Map<ImportKeys, number> | null {
  const map = new Map<ImportKeys, number>();
  headerRow.forEach((cell, idx) => {
    const key = HEADER_TO_KEY[norm(cell.replace(/^\uFEFF/, ''))];
    if (key) map.set(key, idx);
  });
  return map.has('email') ? map : null;
}

function cell(row: string[], map: Map<ImportKeys, number>, key: ImportKeys): string {
  const i = map.get(key);
  if (i === undefined || i >= row.length) return '';
  return row[i]?.trim() ?? '';
}

function resolveCompanyId(name: string | undefined, companies: Company[]): string | undefined {
  if (!name?.trim()) return undefined;
  const n = norm(name);
  return companies.find((c) => norm(c.name) === n)?.id;
}

export type ContactImportRow =
  | { ok: true; line: number; payload: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'> }
  | { ok: false; line: number; reason: string };

export function parseContactsCsvForImport(
  text: string,
  companies: Company[],
): { ok: false; error: string } | { ok: true; rows: ContactImportRow[] } {
  const table = parseCsv(text);
  if (table.length === 0) {
    return { ok: false, error: 'The file is empty.' };
  }

  const headerMap = buildHeaderIndex(table[0]);
  if (!headerMap) {
    return {
      ok: false,
      error: 'No recognizable email column. Use a header such as "email".',
    };
  }

  const rows: ContactImportRow[] = [];
  for (let r = 1; r < table.length; r++) {
    const line = r + 1;
    const row = table[r];
    const email = cell(row, headerMap, 'email');
    if (!email) {
      rows.push({ ok: false, line, reason: 'Missing email' });
      continue;
    }

    let firstName = cell(row, headerMap, 'firstName');
    let lastName = cell(row, headerMap, 'lastName');
    const fullName = cell(row, headerMap, 'fullName');
    if ((!firstName && !lastName) && fullName) {
      const sp = splitFullName(fullName);
      firstName = sp.first;
      lastName = sp.last;
    }
    if (!firstName && !lastName) {
      firstName = '—';
      lastName = '—';
    } else {
      firstName = firstName || '—';
      lastName = lastName || '—';
    }

    const companyName = cell(row, headerMap, 'company');
    const companyId = resolveCompanyId(companyName || undefined, companies);

    rows.push({
      ok: true,
      line,
      payload: {
        firstName,
        lastName,
        email,
        phone: cell(row, headerMap, 'phone') || undefined,
        jobTitle: cell(row, headerMap, 'jobTitle') || undefined,
        companyId,
        ownerId: OWNER,
        tags: parseTags(cell(row, headerMap, 'tags')),
        source: cell(row, headerMap, 'source') || 'CSV import',
        lifecycle: parseLifecycle(cell(row, headerMap, 'lifecycle')),
        notes: cell(row, headerMap, 'notes') || undefined,
      },
    });
  }

  return { ok: true, rows };
}

export function contactsToCsv(contacts: Contact[], companies: Company[]): string {
  const headers = [
    'first_name',
    'last_name',
    'email',
    'phone',
    'job_title',
    'company',
    'tags',
    'source',
    'lifecycle',
    'notes',
  ];
  const lines = [headers.join(',')];

  for (const c of contacts) {
    const co = companies.find((x) => x.id === c.companyId);
    const row = [
      c.firstName,
      c.lastName,
      c.email,
      c.phone ?? '',
      c.jobTitle ?? '',
      co?.name ?? '',
      c.tags.join('; '),
      c.source,
      c.lifecycle,
      c.notes ?? '',
    ].map(escapeCsvField);
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

export function downloadContactsCsv(filename: string, csv: string) {
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
