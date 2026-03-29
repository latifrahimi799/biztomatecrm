import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useCrmStore } from '../store/crmStore';
import { useFilteredEntities } from '../hooks/useFilteredEntities';
import type { LeadStatus } from '../types/crm';

const statuses: LeadStatus[] = [
  'new',
  'working',
  'nurturing',
  'qualified',
  'disqualified',
  'converted',
];

const toneFor: Partial<
  Record<LeadStatus, 'default' | 'success' | 'error' | 'muted' | 'secondary'>
> = {
  new: 'secondary',
  qualified: 'success',
  converted: 'success',
  disqualified: 'error',
};

export function LeadsPage() {
  const { leads, hasFilter } = useFilteredEntities();
  const updateLead = useCrmStore((s) => s.updateLead);
  const addLead = useCrmStore((s) => s.addLead);
  const convertLead = useCrmStore((s) => s.convertLead);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    source: 'Inbound',
    score: '50',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addLead({
      name: form.name.trim() || 'New lead',
      email: form.email.trim(),
      company: form.company.trim() || undefined,
      source: form.source,
      score: Number(form.score) || 0,
      status: 'new',
    });
    setOpen(false);
    setForm({ name: '', email: '', company: '', source: 'Inbound', score: '50' });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {hasFilter ? `${leads.length} match(es)` : `${leads.length} leads · nurture and qualify`}
        </p>
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="h-4 w-4" />
          New lead
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface/80 text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Lead</th>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Score</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t border-[var(--color-border)]/60">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900">{l.name}</div>
                    <div className="text-xs text-muted">{l.email}</div>
                  </td>
                  <td className="px-5 py-3 text-muted">{l.company ?? '—'}</td>
                  <td className="px-5 py-3">
                    <Input
                      type="number"
                      className="!w-20 !py-1"
                      value={l.score}
                      onChange={(e) =>
                        updateLead(l.id, { score: Number(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="px-5 py-3">
                    <Select
                      className="!py-1 text-xs"
                      value={l.status}
                      onChange={(e) =>
                        updateLead(l.id, { status: e.target.value as LeadStatus })
                      }
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-5 py-3 text-muted">{l.source}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={toneFor[l.status] ?? 'default'}>{l.status}</Badge>
                      {l.status !== 'converted' && l.status !== 'disqualified' && (
                        <Button
                          variant="outline"
                          className="!py-1 !px-2 text-xs"
                          type="button"
                          onClick={() => {
                            if (confirm('Convert lead to contact?')) convertLead(l.id);
                          }}
                        >
                          Convert
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New lead">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Full name *</label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
            <label className="mb-1 block text-xs font-medium">Company</label>
            <Input
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
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
              <label className="mb-1 block text-xs font-medium">Initial score</label>
              <Input
                type="number"
                value={form.score}
                onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))}
              />
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
