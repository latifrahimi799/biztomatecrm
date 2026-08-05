import { useState } from 'react';
import { Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useCrmStore } from '../store/crmStore';
import { useFilteredEntities } from '../hooks/useFilteredEntities';
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUSES,
  normalizeLeadContactFields,
  type Lead,
  type LeadStatus,
} from '../types/crm';

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
  status: LeadStatus;
  notes: string;
};

const emptyForm = (): LeadFormState => ({
  name: '',
  company: '',
  phones: [''],
  emails: [''],
  website: '',
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
  const convertLead = useCrmStore((s) => s.convertLead);
  const remoteSyncStatus = useCrmStore((s) => s.remoteSyncStatus);
  const remoteSyncError = useCrmStore((s) => s.remoteSyncError);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<LeadFormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LeadFormState>(emptyForm);

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
      notes: editForm.notes.trim() || undefined,
      status: editForm.status,
    });
    setEditId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {hasFilter ? `${leads.length} match(es)` : `${leads.length} leads`}
          {remoteSyncStatus === 'loading' ? ' · loading from Supabase…' : null}
          {remoteSyncStatus === 'ready' ? ' · synced from Supabase' : null}
          {remoteSyncStatus === 'error' && remoteSyncError
            ? ` · sync error: ${remoteSyncError}`
            : null}
        </p>
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

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] text-left text-sm">
            <thead className="bg-brand/5 text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Company</th>
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
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted">
                    No leads yet. Create one or sync from Supabase.
                  </td>
                </tr>
              ) : (
                leads.map((raw) => {
                  const l = normalizeLeadContactFields(raw);
                  return (
                    <tr
                      key={l.id}
                      className="border-t border-brand/10 align-top hover:bg-brand/[0.03]"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{l.name}</td>
                      <td className="px-4 py-3 text-muted">{l.company ?? '—'}</td>
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
                        {l.status !== 'sold' && l.status !== 'invalid_lead' ? (
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
