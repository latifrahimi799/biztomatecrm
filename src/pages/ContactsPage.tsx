import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Plus, Upload } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useCrmStore } from '../store/crmStore';
import { useFilteredEntities } from '../hooks/useFilteredEntities';
import type { ContactLifecycle, Deal } from '../types/crm';
import { formatDate, formatMoney } from '../lib/format';
import { contactsToCsv, downloadContactsCsv, parseContactsCsvForImport } from '../lib/contactCsv';

const lifecycles: ContactLifecycle[] = ['subscriber', 'lead', 'customer', 'churned'];

function dealTotalsForContact(deals: Deal[], contactId: string) {
  const linked = deals.filter((d) => d.contactIds.includes(contactId));
  if (linked.length === 0) return { count: 0, total: 0, currency: 'CAD' as string };
  const currency = linked[0].currency || 'CAD';
  const total = linked.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  return { count: linked.length, total, currency };
}

export function ContactsPage() {
  const { contacts, hasFilter } = useFilteredEntities();
  const companies = useCrmStore((s) => s.companies);
  const deals = useCrmStore((s) => s.deals);
  const addContact = useCrmStore((s) => s.addContact);
  const defaultOwnerId = useCrmStore((s) => s.defaultOwnerId);
  const remoteSyncStatus = useCrmStore((s) => s.remoteSyncStatus);
  const remoteSyncError = useCrmStore((s) => s.remoteSyncError);

  const dealsByContact = useMemo(() => {
    const map = new Map<string, { count: number; total: number; currency: string }>();
    for (const c of contacts) {
      map.set(c.id, dealTotalsForContact(deals, c.id));
    }
    return map;
  }, [contacts, deals]);
  const [open, setOpen] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
    companyId: '',
    source: 'Manual',
    lifecycle: 'lead' as ContactLifecycle,
  });

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim()) return;
    addContact({
      firstName: form.firstName.trim() || '—',
      lastName: form.lastName.trim() || '—',
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      jobTitle: form.jobTitle.trim() || undefined,
      companyId: form.companyId || undefined,
      ownerId: defaultOwnerId ?? 'user-1',
      tags: [],
      source: form.source,
      lifecycle: form.lifecycle,
    });
    setOpen(false);
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      jobTitle: '',
      companyId: '',
      source: 'Manual',
      lifecycle: 'lead',
    });
  }

  function exportCsv() {
    const csv = contactsToCsv(contacts, companies);
    const stamp = new Date().toISOString().slice(0, 10);
    const suffix = hasFilter ? '-filtered' : '';
    downloadContactsCsv(`contacts${suffix}-${stamp}.csv`, csv);
  }

  async function onImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const text = await file.text().catch(() => '');
    if (!text) {
      setImportNotice('Could not read that file.');
      return;
    }

    const parsed = parseContactsCsvForImport(text, companies);
    if (!parsed.ok) {
      setImportNotice(parsed.error);
      return;
    }

    const existing = new Set(
      useCrmStore.getState().contacts.map((c) => c.email.toLowerCase()),
    );

    let imported = 0;
    let skippedDup = 0;
    let skippedBad = 0;

    for (const row of parsed.rows) {
      if (!row.ok) {
        skippedBad++;
        continue;
      }
      const em = row.payload.email.toLowerCase();
      if (existing.has(em)) {
        skippedDup++;
        continue;
      }
      addContact(row.payload);
      existing.add(em);
      imported++;
    }

    setImportNotice(
      `Imported ${imported} contact(s). Skipped ${skippedDup} duplicate email(s) and ${skippedBad} row(s) with errors.`,
    );
  }

  return (
    <div className="space-y-4">
      <input
        ref={importInputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-hidden
        onChange={onImportFileChange}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {hasFilter ? `Showing ${contacts.length} match(es)` : `${contacts.length} contacts`}
          {remoteSyncStatus === 'loading' ? ' · loading from Supabase…' : null}
          {remoteSyncStatus === 'ready' ? ' · synced from Supabase' : null}
          {remoteSyncStatus === 'error' && remoteSyncError
            ? ` · sync error: ${remoteSyncError}`
            : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button type="button" variant="outline" onClick={exportCsv} disabled={contacts.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New contact
          </Button>
        </div>
      </div>
      {importNotice ? (
        <p className="text-sm text-muted" role="status">
          {importNotice}
        </p>
      ) : null}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface/80 text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Deals</th>
                <th className="px-5 py-3 font-medium">Lifecycle</th>
                <th className="px-5 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => {
                const co = companies.find((x) => x.id === c.companyId);
                const dealInfo = dealsByContact.get(c.id) ?? {
                  count: 0,
                  total: 0,
                  currency: 'CAD',
                };
                return (
                  <tr key={c.id} className="border-t border-[var(--color-border)]/60">
                    <td className="px-5 py-3">
                      <Link to={`/contacts/${c.id}`} className="font-medium text-brand hover:underline">
                        {c.firstName} {c.lastName}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted">{c.email}</td>
                    <td className="px-5 py-3 text-muted">{co?.name ?? '—'}</td>
                    <td className="px-5 py-3">
                      {dealInfo.count === 0 ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <div>
                          <div className="font-medium text-gray-900">
                            {formatMoney(dealInfo.total, dealInfo.currency)}
                          </div>
                          <div className="text-xs text-muted">
                            {dealInfo.count} deal{dealInfo.count === 1 ? '' : 's'}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone="default">{c.lifecycle}</Badge>
                    </td>
                    <td className="px-5 py-3 text-muted">{formatDate(c.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New contact">
        <form onSubmit={submitNew} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">First name</label>
              <Input
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Last name</label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Email *</label>
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">Phone</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Job title</label>
              <Input
                value={form.jobTitle}
                onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Company</label>
            <Select
              value={form.companyId}
              onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
            >
              <option value="">— None —</option>
              {companies.map((co) => (
                <option key={co.id} value={co.id}>
                  {co.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">Source</label>
              <Input
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Lifecycle</label>
              <Select
                value={form.lifecycle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lifecycle: e.target.value as ContactLifecycle }))
                }
              >
                {lifecycles.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
