import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { useCrmStore } from '../store/crmStore';
import {
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_TYPE_LABEL,
  type CampaignStatus,
  type CampaignType,
} from '../types/crm';
import { formatDate, formatMoney } from '../lib/format';

const types: CampaignType[] = [
  'email',
  'webinar',
  'trade_show',
  'advertisement',
  'conference',
  'referral',
  'other',
];
const statuses: CampaignStatus[] = ['planning', 'active', 'completed', 'cancelled'];

const statusTone: Partial<
  Record<CampaignStatus, 'default' | 'success' | 'error' | 'muted' | 'secondary'>
> = {
  planning: 'secondary',
  active: 'success',
  completed: 'muted',
  cancelled: 'error',
};

export function CampaignsPage() {
  const campaigns = useCrmStore((s) => s.campaigns);
  const addCampaign = useCrmStore((s) => s.addCampaign);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'email' as CampaignType,
    status: 'planning' as CampaignStatus,
    startDate: '',
    endDate: '',
    budgetedCost: '',
    actualCost: '',
    expectedRevenue: '',
    description: '',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    addCampaign({
      name: form.name.trim(),
      type: form.type,
      status: form.status,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      budgetedCost: form.budgetedCost ? Number(form.budgetedCost) : undefined,
      actualCost: form.actualCost ? Number(form.actualCost) : undefined,
      expectedRevenue: form.expectedRevenue ? Number(form.expectedRevenue) : undefined,
      currency: 'CAD',
      description: form.description.trim() || undefined,
      ownerId: 'user-1',
    });
    setOpen(false);
    setForm({
      name: '',
      type: 'email',
      status: 'planning',
      startDate: '',
      endDate: '',
      budgetedCost: '',
      actualCost: '',
      expectedRevenue: '',
      description: '',
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} · Zoho-style types & status
        </p>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New campaign
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface/80 text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Campaign</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Members</th>
                <th className="px-5 py-3 font-medium">Expected</th>
                <th className="px-5 py-3 font-medium">Period</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-t border-[var(--color-border)]/60">
                  <td className="px-5 py-3">
                    <Link
                      to={`/campaigns/${c.id}`}
                      className="flex items-center gap-2 font-medium text-brand hover:underline"
                    >
                      <Megaphone className="h-4 w-4 shrink-0 opacity-70" />
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted">{CAMPAIGN_TYPE_LABEL[c.type]}</td>
                  <td className="px-5 py-3">
                    <Badge tone={statusTone[c.status] ?? 'default'}>
                      {CAMPAIGN_STATUS_LABEL[c.status]}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {c.contactIds.length + c.leadIds.length} total
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {c.expectedRevenue != null
                      ? formatMoney(c.expectedRevenue, c.currency)
                      : '—'}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {formatDate(c.startDate)}
                    {' · '}
                    {formatDate(c.endDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New campaign" className="max-w-lg">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">Type</label>
              <Select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CampaignType }))}
              >
                {types.map((t) => (
                  <option key={t} value={t}>
                    {CAMPAIGN_TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Status</label>
              <Select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as CampaignStatus }))
                }
              >
                {statuses.map((st) => (
                  <option key={st} value={st}>
                    {CAMPAIGN_STATUS_LABEL[st]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">Start date</label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">End date</label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Budget</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.budgetedCost}
                onChange={(e) => setForm((f) => ({ ...f, budgetedCost: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Actual cost</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.actualCost}
                onChange={(e) => setForm((f) => ({ ...f, actualCost: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Expected revenue</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.expectedRevenue}
                onChange={(e) => setForm((f) => ({ ...f, expectedRevenue: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Description</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="min-h-[72px]"
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
