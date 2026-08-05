import { useMemo, useRef, useState } from 'react';
import { Check, Download, Pencil, Plus, Trash2, Upload, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useCrmStore } from '../store/crmStore';
import { useFilteredEntities } from '../hooks/useFilteredEntities';
import {
  LEAD_LOCATION_LABEL,
  LEAD_LOCATION_TYPES,
  LEAD_STATUS_LABEL,
  LEAD_STATUSES,
  normalizeLeadContactFields,
  type Lead,
  type LeadLocationType,
  type LeadStatus,
} from '../types/crm';
import {
  downloadLeadsCsv,
  leadsToCsv,
  parseLeadsCsvForImport,
} from '../lib/leadCsv';

const toneFor: Record<
  LeadStatus,
  'default' | 'success' | 'error' | 'muted' | 'secondary' | 'warning'
> = {
  dm: 'secondary',
  stuck_gatekeeper: 'warning',
  presentation: 'default',
  not_interested: 'muted',
  consultation_booked: 'default',
  sold: 'success',
  invalid_lead: 'error',
};

type LeadFormState = {
  name: string;
  company: string;
  phones: string[];
  emails: string[];
  website: string;
  city: string;
  locationType: LeadLocationType;
  status: LeadStatus;
  notes: string;
};

const emptyForm = (): LeadFormState => ({
  name: '',
  company: '',
  phones: [''],
  emails: [''],
  website: '',
  city: '',
  locationType: 'hq',
  status: 'dm',
  notes: '',
});

function formFromLead(lead: Lead): LeadFormState {
  const n = normalizeLeadContactFields(lead);
  return {
    name: n.name,
    company: n.company ?? '',
    phones: n.phones.length > 0 ? [...n.phones] : [''],
    emails: n.emails.length > 0 ? [...n.emails] : [''],
    website: n.website ?? '',
    city: n.city ?? '',
    locationType: n.locationType === 'branch' ? 'branch' : 'hq',
    status: n.status,
    notes: n.notes ?? '',
  };
}

function MultiTextField({
  label,
  type,
  values,
  onChange,
  addLabel,
}: {
  label: string;
  type: 'email' | 'tel' | 'text';
  values: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={index} className="flex gap-2">
            <Input
              type={type}
              value={value}
              onChange={(e) => {
                const next = [...values];
                next[index] = e.target.value;
                onChange(next);
              }}
              placeholder={index === 0 ? `Primary ${label.toLowerCase()}` : undefined}
            />
            {values.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                className="!px-2 shrink-0 text-error"
                aria-label={`Remove ${label}`}
                onClick={() => onChange(values.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="!py-1.5 text-xs"
          onClick={() => onChange([...values, ''])}
        >
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

function LeadFormFields({
  form,
  setForm,
}: {
  form: LeadFormState;
  setForm: React.Dispatch<React.SetStateAction<LeadFormState>>;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium">Name *</label>
        <Input
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Company</label>
        <Input
          value={form.company}
          onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium">City</label>
          <Input
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            placeholder="e.g. Toronto"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Location type</label>
          <Select
            value={form.locationType}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                locationType: e.target.value as LeadLocationType,
              }))
            }
          >
            {LEAD_LOCATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {LEAD_LOCATION_LABEL[t]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <MultiTextField
        label="Phone number"
        type="tel"
        values={form.phones}
        onChange={(phones) => setForm((f) => ({ ...f, phones }))}
        addLabel="Add phone number"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <MultiTextField
          label="Email"
          type="email"
          values={form.emails}
          onChange={(emails) => setForm((f) => ({ ...f, emails }))}
          addLabel="Add email"
        />
        <div>
          <label className="mb-1 block text-xs font-medium">Website</label>
          <Input
            type="url"
            placeholder="https://"
            value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Status</label>
        <Select
          value={form.status}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              status: e.target.value as LeadStatus,
            }))
          }
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Notes</label>
        <textarea
          className="w-full resize-y rounded-xl border border-brand/20 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
          rows={3}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>
    </div>
  );
}

function displayPhones(lead: Lead): string {
  const n = normalizeLeadContactFields(lead);
  if (n.phones.length === 0) return '—';
  if (n.phones.length === 1) return n.phones[0];
  return `${n.phones[0]} (+${n.phones.length - 1})`;
}

function displayEmails(lead: Lead): string {
  const n = normalizeLeadContactFields(lead);
  if (n.emails.length === 0) return '—';
  if (n.emails.length === 1) return n.emails[0];
  return `${n.emails[0]} (+${n.emails.length - 1})`;
}

export function LeadsPage() {
  const { leads, hasFilter } = useFilteredEntities();
  const updateLead = useCrmStore((s) => s.updateLead);
  const addLead = useCrmStore((s) => s.addLead);
  const removeLead = useCrmStore((s) => s.removeLead);
  const convertLead = useCrmStore((s) => s.convertLead);
  const remoteSyncStatus = useCrmStore((s) => s.remoteSyncStatus);
  const remoteSyncError = useCrmStore((s) => s.remoteSyncError);
  const remoteWriteError = useCrmStore((s) => s.remoteWriteError);
  const defaultOwnerId = useCrmStore((s) => s.defaultOwnerId);

  const [cityFilter, setCityFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState<'' | LeadLocationType>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<LeadFormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LeadFormState>(emptyForm);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const raw of leads) {
      const city = raw.city?.trim();
      if (city) set.add(city);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((raw) => {
      const city = (raw.city ?? '').trim();
      if (cityFilter && city.toLowerCase() !== cityFilter.toLowerCase()) return false;
      if (locationFilter) {
        const loc = raw.locationType === 'branch' ? 'branch' : 'hq';
        if (loc !== locationFilter) return false;
      }
      return true;
    });
  }, [leads, cityFilter, locationFilter]);

  function exportCsv() {
    const csv = leadsToCsv(filteredLeads);
    const stamp = new Date().toISOString().slice(0, 10);
    const suffix = hasFilter || cityFilter || locationFilter ? '-filtered' : '';
    downloadLeadsCsv(`leads${suffix}-${stamp}.csv`, csv);
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

    const parsed = parseLeadsCsvForImport(text);
    if (!parsed.ok) {
      setImportNotice(parsed.error);
      return;
    }

    const existing = new Set(
      useCrmStore
        .getState()
        .leads.flatMap((l) => {
          const n = normalizeLeadContactFields(l);
          return n.emails
            .map((em) => em.toLowerCase())
            .concat(n.email ? [n.email.toLowerCase()] : []);
        })
        .filter(Boolean),
    );

    let imported = 0;
    let skippedDup = 0;
    let skippedBad = 0;

    for (const row of parsed.rows) {
      if (!row.ok) {
        skippedBad++;
        continue;
      }
      const emails = row.payload.emails.map((em) => em.toLowerCase()).filter(Boolean);
      if (emails.some((em) => existing.has(em))) {
        skippedDup++;
        continue;
      }
      addLead(row.payload);
      for (const em of emails) existing.add(em);
      imported++;
    }

    setImportNotice(
      `Imported ${imported} lead(s). Skipped ${skippedDup} duplicate email(s) and ${skippedBad} row(s) with errors.`,
    );
  }

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    const emails = createForm.emails.map((x) => x.trim()).filter(Boolean);
    const phones = createForm.phones.map((x) => x.trim()).filter(Boolean);
    addLead({
      name: createForm.name.trim() || 'New lead',
      email: emails[0] ?? '',
      emails,
      company: createForm.company.trim() || undefined,
      phone: phones[0],
      phones,
      website: createForm.website.trim() || undefined,
      city: createForm.city.trim() || undefined,
      locationType: createForm.locationType,
      notes: createForm.notes.trim() || undefined,
      status: createForm.status,
      source: 'Manual',
      score: 0,
    });
    setCreateOpen(false);
    setCreateForm(emptyForm());
  }

  function openEdit(lead: Lead) {
    setEditId(lead.id);
    setEditForm(formFromLead(lead));
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    const emails = editForm.emails.map((x) => x.trim()).filter(Boolean);
    const phones = editForm.phones.map((x) => x.trim()).filter(Boolean);
    updateLead(editId, {
      name: editForm.name.trim() || 'New lead',
      email: emails[0] ?? '',
      emails,
      company: editForm.company.trim() || undefined,
      phone: phones[0],
      phones,
      website: editForm.website.trim() || undefined,
      city: editForm.city.trim() || undefined,
      locationType: editForm.locationType,
      notes: editForm.notes.trim() || undefined,
      status: editForm.status,
    });
    setEditId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {hasFilter || cityFilter || locationFilter
            ? `${filteredLeads.length} match(es)`
            : `${leads.length} leads`}
          {remoteSyncStatus === 'loading' ? ' · loading from Supabase…' : null}
          {remoteSyncStatus === 'ready' ? ' · synced from Supabase' : null}
          {remoteSyncStatus === 'error' && remoteSyncError
            ? ` · sync error: ${remoteSyncError}`
            : null}
          {!defaultOwnerId && remoteSyncStatus !== 'loading'
            ? ' · no team seat linked — new leads may not save'
            : null}
        </p>
        {remoteWriteError ? (
          <p
            className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            Could not save to Supabase: {remoteWriteError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-hidden
            onChange={onImportFileChange}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={exportCsv}
            disabled={filteredLeads.length === 0}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            onClick={() => {
              setCreateForm(emptyForm());
              setCreateOpen(true);
            }}
          >
            <UserPlus className="h-4 w-4" />
            New lead
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[10rem]">
          <label className="mb-1 block text-xs font-medium text-muted">City</label>
          <Select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            aria-label="Filter by city"
          >
            <option value="">All cities</option>
            {cityOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-[10rem]">
          <label className="mb-1 block text-xs font-medium text-muted">HQ / Branch</label>
          <Select
            value={locationFilter}
            onChange={(e) =>
              setLocationFilter(e.target.value as '' | LeadLocationType)
            }
            aria-label="Filter by HQ or Branch"
          >
            <option value="">All</option>
            {LEAD_LOCATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {LEAD_LOCATION_LABEL[t]}
              </option>
            ))}
          </Select>
        </div>
        {cityFilter || locationFilter ? (
          <Button
            type="button"
            variant="ghost"
            className="!py-2 text-xs"
            onClick={() => {
              setCityFilter('');
              setLocationFilter('');
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      {importNotice ? (
        <p className="text-sm text-muted" role="status">
          {importNotice}
        </p>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[72rem] text-left text-sm">
            <thead className="bg-brand/5 text-muted">
              <tr>
                <th className="w-12 px-3 py-3 font-semibold" aria-label="Delete" />
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">City</th>
                <th className="px-4 py-3 font-semibold">HQ / Branch</th>
                <th className="px-4 py-3 font-semibold">Phone number</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Website</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
                <th className="px-4 py-3 font-semibold">Edit</th>
                <th className="px-4 py-3 font-semibold">Convert</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-sm text-muted">
                    No leads match these filters. Create one or clear filters.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((raw) => {
                  const l = normalizeLeadContactFields(raw);
                  const locationType = l.locationType === 'branch' ? 'branch' : 'hq';
                  return (
                    <tr
                      key={l.id}
                      className="border-t border-brand/10 align-top hover:bg-brand/[0.03]"
                    >
                      <td className="px-3 py-3">
                        <Button
                          type="button"
                          variant="ghost"
                          className="!px-2 !py-1.5 text-error"
                          aria-label={`Delete ${l.name}`}
                          title="Delete lead"
                          onClick={() => {
                            if (confirm(`Delete lead “${l.name}”?`)) {
                              removeLead(l.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{l.name}</td>
                      <td className="px-4 py-3 text-muted">{l.company ?? '—'}</td>
                      <td className="px-4 py-3 text-muted">{l.city?.trim() || '—'}</td>
                      <td className="px-4 py-3">
                        <Select
                          className="!min-w-[7rem] !py-1.5 text-xs"
                          value={locationType}
                          onChange={(e) =>
                            updateLead(l.id, {
                              locationType: e.target.value as LeadLocationType,
                            })
                          }
                          aria-label="HQ or Branch"
                        >
                          {LEAD_LOCATION_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {LEAD_LOCATION_LABEL[t]}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-muted">{displayPhones(l)}</td>
                      <td className="px-4 py-3 text-muted">{displayEmails(l)}</td>
                      <td className="px-4 py-3">
                        {l.website ? (
                          <a
                            href={
                              l.website.startsWith('http')
                                ? l.website
                                : `https://${l.website}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand hover:underline"
                          >
                            {l.website.replace(/^https?:\/\//, '')}
                          </a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          className={`!min-w-[11rem] !py-1.5 text-xs font-medium ${
                            toneFor[l.status] === 'success'
                              ? 'border-success/40 text-emerald-800'
                              : toneFor[l.status] === 'error'
                                ? 'border-error/40 text-red-700'
                                : toneFor[l.status] === 'warning'
                                  ? 'border-warning/40 text-amber-800'
                                  : ''
                          }`}
                          value={l.status}
                          onChange={(e) =>
                            updateLead(l.id, {
                              status: e.target.value as LeadStatus,
                            })
                          }
                          aria-label="Status"
                        >
                          {LEAD_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {LEAD_STATUS_LABEL[s]}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-muted">
                        {l.notes || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="!px-3 !py-1.5 text-xs"
                          onClick={() => openEdit(l)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </td>
                      <td className="px-4 py-3">
                        {l.status === 'sold' ? (
                          <span
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-success"
                            title="Converted"
                            aria-label="Converted"
                          >
                            <Check className="h-5 w-5 stroke-[2.5]" aria-hidden />
                          </span>
                        ) : l.status !== 'invalid_lead' ? (
                          <Button
                            variant="outline"
                            className="!px-3 !py-1.5 text-xs"
                            type="button"
                            onClick={() => {
                              if (
                                confirm(
                                  'Convert this lead to a contact and mark status Sold?',
                                )
                              ) {
                                convertLead(l.id);
                              }
                            }}
                          >
                            Convert
                          </Button>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New lead"
        className="max-w-xl"
      >
        <form onSubmit={submitCreate} className="space-y-4">
          <LeadFormFields form={createForm} setForm={setCreateForm} />
          <div className="flex justify-end gap-2 border-t border-brand/10 pt-3">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(editId)}
        onClose={() => setEditId(null)}
        title="Edit lead"
        className="max-w-xl"
      >
        <form onSubmit={submitEdit} className="space-y-4">
          <LeadFormFields form={editForm} setForm={setEditForm} />
          <div className="flex justify-end gap-2 border-t border-brand/10 pt-3">
            <Button type="button" variant="outline" onClick={() => setEditId(null)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
