import { useMemo, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { useCrmStore } from '../store/crmStore';
import { ACTIVITY_TYPE_LABEL, type ActivityType } from '../types/crm';
import { formatDateTime, relativeTime } from '../lib/format';

const types: ActivityType[] = ['task', 'call', 'meeting', 'email', 'note'];

export function ActivitiesPage() {
  const activities = useCrmStore((s) => s.activities);
  const addActivity = useCrmStore((s) => s.addActivity);
  const completeActivity = useCrmStore((s) => s.completeActivity);
  const removeActivity = useCrmStore((s) => s.removeActivity);
  const contacts = useCrmStore((s) => s.contacts);
  const companies = useCrmStore((s) => s.companies);
  const deals = useCrmStore((s) => s.deals);

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('open');
  const [form, setForm] = useState({
    type: 'task' as ActivityType,
    subject: '',
    body: '',
    dueAt: '',
    relatedType: '' as '' | 'contact' | 'company' | 'deal',
    relatedId: '',
  });

  const sorted = useMemo(() => {
    let list = [...activities];
    if (filter === 'open') list = list.filter((a) => !a.completedAt);
    if (filter === 'done') list = list.filter((a) => !!a.completedAt);
    return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [activities, filter]);

  function relatedLabel(a: (typeof activities)[0]) {
    if (!a.relatedType || !a.relatedId) return null;
    if (a.relatedType === 'contact') {
      const c = contacts.find((x) => x.id === a.relatedId);
      return c ? `${c.firstName} ${c.lastName}` : a.relatedId;
    }
    if (a.relatedType === 'company') {
      return companies.find((x) => x.id === a.relatedId)?.name ?? a.relatedId;
    }
    return deals.find((x) => x.id === a.relatedId)?.name ?? a.relatedId;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject.trim()) return;
    addActivity({
      type: form.type,
      subject: form.subject.trim(),
      body: form.body.trim() || undefined,
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
      relatedType: form.relatedType || undefined,
      relatedId: form.relatedId || undefined,
      ownerId: 'user-1',
    });
    setOpen(false);
    setForm({
      type: 'task',
      subject: '',
      body: '',
      dueAt: '',
      relatedType: '',
      relatedId: '',
    });
  }

  const relationOptions =
    form.relatedType === 'contact'
      ? contacts.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` }))
      : form.relatedType === 'company'
        ? companies.map((c) => ({ id: c.id, label: c.name }))
        : form.relatedType === 'deal'
          ? deals.map((d) => ({ id: d.id, label: d.name }))
          : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['open', 'all', 'done'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'primary' : 'outline'}
              type="button"
              className="!capitalize"
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Log activity
        </Button>
      </div>

      <div className="space-y-3">
        {sorted.map((a) => (
          <Card key={a.id} className={a.completedAt ? 'opacity-70' : ''}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="default">{ACTIVITY_TYPE_LABEL[a.type]}</Badge>
                  <span className="font-medium text-gray-900">{a.subject}</span>
                  {a.completedAt && <Badge tone="success">Done</Badge>}
                </div>
                {a.body && <p className="mt-2 text-sm text-muted">{a.body}</p>}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                  <span>Logged {relativeTime(a.createdAt)}</span>
                  {a.dueAt && !a.completedAt && (
                    <span className="text-brand">Due {formatDateTime(a.dueAt)}</span>
                  )}
                  {relatedLabel(a) && (
                    <span>
                      Related: {a.relatedType} · {relatedLabel(a)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {!a.completedAt && (
                  <Button variant="outline" type="button" onClick={() => completeActivity(a.id)}>
                    <Check className="h-4 w-4" />
                    Complete
                  </Button>
                )}
                <Button variant="ghost" type="button" onClick={() => removeActivity(a.id)}>
                  Remove
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {sorted.length === 0 && (
          <p className="text-center text-sm text-muted">No activities in this view.</p>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Log activity">
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">Type</label>
              <Select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ActivityType }))}
              >
                {types.map((t) => (
                  <option key={t} value={t}>
                    {ACTIVITY_TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Due date</label>
              <Input
                type="datetime-local"
                value={form.dueAt}
                onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Subject *</label>
            <Input
              required
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Details</label>
            <Textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">Related type</label>
              <Select
                value={form.relatedType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    relatedType: e.target.value as typeof form.relatedType,
                    relatedId: '',
                  }))
                }
              >
                <option value="">— None —</option>
                <option value="contact">Contact</option>
                <option value="company">Company</option>
                <option value="deal">Deal</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Related record</label>
              <Select
                value={form.relatedId}
                disabled={!form.relatedType}
                onChange={(e) => setForm((f) => ({ ...f, relatedId: e.target.value }))}
              >
                <option value="">Select…</option>
                {relationOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
