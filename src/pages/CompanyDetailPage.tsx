import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { useCrmStore } from '../store/crmStore';
import { useMemo } from 'react';
import { formatMoney } from '../lib/format';
import { DEAL_STAGE_LABEL } from '../types/crm';

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const companies = useCrmStore((s) => s.companies);
  const contacts = useCrmStore((s) => s.contacts);
  const deals = useCrmStore((s) => s.deals);
  const updateCompany = useCrmStore((s) => s.updateCompany);
  const removeCompany = useCrmStore((s) => s.removeCompany);

  const company = companies.find((c) => c.id === id);

  const linkedContacts = useMemo(
    () => contacts.filter((c) => c.companyId === id),
    [contacts, id],
  );

  const linkedDeals = useMemo(() => deals.filter((d) => d.companyId === id), [deals, id]);

  if (!company) {
    return (
      <p className="text-muted">
        Company not found. <Link to="/companies" className="text-brand underline">Back</Link>
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to="/companies"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Companies
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-2xl font-semibold text-gray-900">{company.name}</h2>
        <Button
          variant="danger"
          onClick={() => {
            if (confirm('Delete this company? Contacts will be unlinked.')) {
              removeCompany(company.id);
              navigate('/companies');
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      <Card>
        <CardTitle>Company record</CardTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted">Name</label>
            <Input
              className="mt-1"
              value={company.name}
              onChange={(e) => updateCompany(company.id, { name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Industry</label>
            <Input
              className="mt-1"
              value={company.industry ?? ''}
              onChange={(e) =>
                updateCompany(company.id, { industry: e.target.value || undefined })
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Website</label>
            <Input
              className="mt-1"
              value={company.website ?? ''}
              onChange={(e) =>
                updateCompany(company.id, { website: e.target.value || undefined })
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Phone</label>
            <Input
              className="mt-1"
              value={company.phone ?? ''}
              onChange={(e) => updateCompany(company.id, { phone: e.target.value || undefined })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Employees</label>
            <Input
              className="mt-1"
              value={company.employeeCount ?? ''}
              onChange={(e) =>
                updateCompany(company.id, { employeeCount: e.target.value || undefined })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted">Address</label>
            <Textarea
              className="mt-1 min-h-[72px]"
              value={company.address ?? ''}
              onChange={(e) =>
                updateCompany(company.id, { address: e.target.value || undefined })
              }
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Contacts at this company</CardTitle>
          <ul className="mt-3 space-y-2 text-sm">
            {linkedContacts.length === 0 ? (
              <li className="text-muted">None</li>
            ) : (
              linkedContacts.map((c) => (
                <li key={c.id}>
                  <Link to={`/contacts/${c.id}`} className="text-brand hover:underline">
                    {c.firstName} {c.lastName}
                  </Link>
                  <span className="text-muted"> · {c.email}</span>
                </li>
              ))
            )}
          </ul>
        </Card>
        <Card>
          <CardTitle>Deals</CardTitle>
          <ul className="mt-3 space-y-2 text-sm">
            {linkedDeals.length === 0 ? (
              <li className="text-muted">None</li>
            ) : (
              linkedDeals.map((d) => (
                <li key={d.id}>
                  <Link to={`/deals/${d.id}`} className="font-medium text-brand hover:underline">
                    {d.name}
                  </Link>
                  <div className="text-xs text-muted">
                    {DEAL_STAGE_LABEL[d.stage]} · {formatMoney(d.value, d.currency)}
                  </div>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
