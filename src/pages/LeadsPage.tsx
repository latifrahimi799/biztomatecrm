import { useState } from 'react';
import { UserPlus } from 'lucide-react';
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

export function LeadsPage() {
  const { leads, hasFilter } = useFilteredEntities();
  const updateLead = useCrmStore((s) => s.updateLead);
  const addLead = useCrmStore((s) => s.addLead);
  const convertLead = useCrmStore((s) => s.convertLead);
  const remoteSyncStatus = useCrmStore((s) => s.remoteSyncStatus);
  const remoteSyncError = useCrmStore((s) => s.remoteSyncError);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    status: 'dm' as LeadStatus,
    notes: '',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addLead({
      name: form.name.trim() || 'New lead',
      email: form.email.trim(),
      company: form.company.trim() || undefined,
      phone: form.phone.trim() || undefined,
      notes: form.notes.trim() || undefined,
      status: form.status,
      source: 'Manual',
      score: 0,
    });
    setOpen(false);
    setForm({
      name: '',
      company: '',
      phone: '',
      email: '',
      status: 'dm',
      notes: '',
    });
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
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="h-4 w-4" />
          New lead
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="bg-brand/5 text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Phone number</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
                <th className="px-4 py-3 font-semibold">Convert</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                    No leads yet. Create one or sync from Supabase.
                  </td>
                </tr>
              ) : (
                leads.map((l) => (
                  <tr
                    key={l.id}
                    className="border-t border-brand/10 align-top hover:bg-brand/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <Input
                        className="!min-w-[8rem] !py-1.5 font-medium"
                        value={l.name}
                        onChange={(e) => updateLead(l.id, { name: e.target.value })}
                        aria-label="Lead name"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        className="!min-w-[8rem] !py-1.5"
                        value={l.company ?? ''}
                        onChange={(e) =>
                          updateLead(l.id, {
                            company: e.target.value || undefined,
                          })
                        }
                        aria-label="Company"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        className="!min-w-[8rem] !py-1.5"
                        type="tel"
                        value={l.phone ?? ''}
                        onChange={(e) =>
                          updateLead(l.id, {
                            phone: e.target.value || undefined,
                          })
                        }
                        aria-label="Phone number"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        className="!min-w-[10rem] !py-1.5"
                        type="email"
                        value={l.email}
                        onChange={(e) => updateLead(l.id, { email: e.target.value })}
                        aria-label="Email"
                      />
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
                    <td className="px-4 py-3">
                      <textarea
                        className="min-h-[2.5rem] w-full min-w-[10rem] resize-y rounded-xl border border-brand/20 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
                        rows={2}
                        value={l.notes ?? ''}
                        onChange={(e) =>
                          updateLead(l.id, {
                            notes: e.target.value || undefined,
                          })
                        }
                        aria-label="Notes"
                      />
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New lead">
        <form onSubmit={submit} className="space-y-3">
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
          <div>
            <label className="mb-1 block text-xs font-medium">Phone number</label>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
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
