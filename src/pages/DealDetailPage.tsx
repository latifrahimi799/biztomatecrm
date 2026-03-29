import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useCrmStore } from '../store/crmStore';
import { DEAL_STAGE_LABEL, type DealStage } from '../types/crm';
import { formatMoney } from '../lib/format';

const STAGES: DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

export function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const deals = useCrmStore((s) => s.deals);
  const companies = useCrmStore((s) => s.companies);
  const contacts = useCrmStore((s) => s.contacts);
  const updateDeal = useCrmStore((s) => s.updateDeal);
  const removeDeal = useCrmStore((s) => s.removeDeal);

  const deal = deals.find((d) => d.id === id);

  if (!deal) {
    return (
      <p className="text-muted">
        Deal not found. <Link to="/deals" className="text-brand underline">Back</Link>
      </p>
    );
  }

  const company = companies.find((c) => c.id === deal.companyId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/deals"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Deals
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-2xl font-semibold text-gray-900">{deal.name}</h2>
        <Button
          variant="danger"
          onClick={() => {
            if (confirm('Delete this deal?')) {
              removeDeal(deal.id);
              navigate('/deals');
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      <Card>
        <CardTitle>Deal details</CardTitle>
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <label className="text-xs font-medium text-muted">Name</label>
            <Input
              className="mt-1"
              value={deal.name}
              onChange={(e) => updateDeal(deal.id, { name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Stage</label>
            <Select
              className="mt-1"
              value={deal.stage}
              onChange={(e) => updateDeal(deal.id, { stage: e.target.value as DealStage })}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {DEAL_STAGE_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-muted">Value</label>
              <Input
                type="number"
                className="mt-1"
                value={deal.value}
                onChange={(e) => updateDeal(deal.id, { value: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Currency</label>
              <Input
                className="mt-1"
                value={deal.currency}
                onChange={(e) => updateDeal(deal.id, { currency: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Probability %</label>
              <Input
                type="number"
                className="mt-1"
                min={0}
                max={100}
                value={deal.probability}
                onChange={(e) => updateDeal(deal.id, { probability: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Expected close</label>
            <Input
              type="date"
              className="mt-1"
              value={deal.expectedCloseDate ?? ''}
              onChange={(e) =>
                updateDeal(deal.id, { expectedCloseDate: e.target.value || undefined })
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Company</label>
            <Select
              className="mt-1"
              value={deal.companyId ?? ''}
              onChange={(e) =>
                updateDeal(deal.id, { companyId: e.target.value || undefined })
              }
            >
              <option value="">— None —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          {company && (
            <p className="text-muted">
              Company:{' '}
              <Link to={`/companies/${company.id}`} className="text-brand hover:underline">
                {company.name}
              </Link>
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Linked contacts</CardTitle>
        <p className="mt-1 text-sm text-muted">
          Linking from contact detail or bulk editor can be added when you connect your API.
        </p>
        <ul className="mt-3 text-sm">
          {deal.contactIds.length === 0 ? (
            <li className="text-muted">None — associate contacts in your workflow</li>
          ) : (
            deal.contactIds.map((cid) => {
              const c = contacts.find((x) => x.id === cid);
              return (
                <li key={cid}>
                  {c ? (
                    <Link to={`/contacts/${c.id}`} className="text-brand hover:underline">
                      {c.firstName} {c.lastName}
                    </Link>
                  ) : (
                    cid
                  )}
                </li>
              );
            })
          )}
        </ul>
        <div className="mt-4 rounded-lg bg-brand-muted/40 p-3 text-sm text-brand">
          Weighted value: {formatMoney(deal.value * (deal.probability / 100), deal.currency)}
        </div>
      </Card>
    </div>
  );
}
