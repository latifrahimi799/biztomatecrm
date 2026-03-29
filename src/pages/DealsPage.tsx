import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useCrmStore } from '../store/crmStore';
import { useFilteredEntities } from '../hooks/useFilteredEntities';
import { DEAL_STAGE_LABEL, type DealStage } from '../types/crm';
import { formatMoney } from '../lib/format';

const STAGES: DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

export function DealsPage() {
  const { deals, hasFilter } = useFilteredEntities();
  const companies = useCrmStore((s) => s.companies);
  const addDeal = useCrmStore((s) => s.addDeal);
  const moveDealStage = useCrmStore((s) => s.moveDealStage);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    companyId: '',
    value: '0',
    currency: 'CAD',
    probability: '20',
    stage: 'lead' as DealStage,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    addDeal({
      name: form.name.trim(),
      companyId: form.companyId || undefined,
      contactIds: [],
      stage: form.stage,
      value: Number(form.value) || 0,
      currency: form.currency,
      probability: Math.min(100, Math.max(0, Number(form.probability) || 0)),
      ownerId: 'user-1',
    });
    setOpen(false);
    setForm({
      name: '',
      companyId: '',
      value: '0',
      currency: 'CAD',
      probability: '20',
      stage: 'lead',
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {hasFilter ? `${deals.length} match(es)` : `${deals.length} deals`}
        </p>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New deal
        </Button>
      </div>

      <Card>
        <CardTitle>Pipeline (Kanban)</CardTitle>
        <p className="mt-1 text-sm text-muted">Move deals between stages from the deal record or here.</p>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {STAGES.map((stage) => (
            <div
              key={stage}
              className="w-56 shrink-0 rounded-lg border border-[var(--color-border)] bg-surface/60 p-3"
            >
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {DEAL_STAGE_LABEL[stage]}
              </div>
              <div className="space-y-2">
                {deals
                  .filter((d) => d.stage === stage)
                  .map((d) => (
                    <div key={d.id} className="rounded-md bg-white p-2 shadow-sm ring-1 ring-black/5">
                      <Link
                        to={`/deals/${d.id}`}
                        className="text-sm font-medium text-brand hover:underline"
                      >
                        {d.name}
                      </Link>
                      <div className="mt-1 text-xs text-muted">
                        {formatMoney(d.value, d.currency)} · {d.probability}%
                      </div>
                      <Select
                        className="mt-2 !py-1 text-xs"
                        value={d.stage}
                        onChange={(e) => moveDealStage(d.id, e.target.value as DealStage)}
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {DEAL_STAGE_LABEL[s]}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="border-b border-[var(--color-border)] px-5 py-3 text-sm font-medium">
          All deals
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface/80 text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Deal</th>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Stage</th>
                <th className="px-5 py-3 font-medium">Value</th>
                <th className="px-5 py-3 font-medium">Probability</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => {
                const co = companies.find((c) => c.id === d.companyId);
                return (
                  <tr key={d.id} className="border-t border-[var(--color-border)]/60">
                    <td className="px-5 py-3">
                      <Link to={`/deals/${d.id}`} className="font-medium text-brand hover:underline">
                        {d.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted">{co?.name ?? '—'}</td>
                    <td className="px-5 py-3">
                      <Badge tone={d.stage === 'won' ? 'success' : d.stage === 'lost' ? 'error' : 'default'}>
                        {DEAL_STAGE_LABEL[d.stage]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">{formatMoney(d.value, d.currency)}</td>
                    <td className="px-5 py-3 text-muted">{d.probability}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New deal">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Deal name *</label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Company</label>
            <Select
              value={form.companyId}
              onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
            >
              <option value="">— Optional —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Value</label>
              <Input
                type="number"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Currency</label>
              <Input
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Probability %</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.probability}
                onChange={(e) => setForm((f) => ({ ...f, probability: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Stage</label>
            <Select
              value={form.stage}
              onChange={(e) =>
                setForm((f) => ({ ...f, stage: e.target.value as DealStage }))
              }
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {DEAL_STAGE_LABEL[s]}
                </option>
              ))}
            </Select>
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
