import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useCrmStore } from '../store/crmStore';
import { useFilteredEntities } from '../hooks/useFilteredEntities';

export function CompaniesPage() {
  const { companies, hasFilter } = useFilteredEntities();
  const addCompany = useCrmStore((s) => s.addCompany);
  const contacts = useCrmStore((s) => s.contacts);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    industry: '',
    website: '',
    phone: '',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    addCompany({
      name: form.name.trim(),
      industry: form.industry.trim() || undefined,
      website: form.website.trim() || undefined,
      phone: form.phone.trim() || undefined,
      ownerId: 'user-1',
    });
    setOpen(false);
    setForm({ name: '', industry: '', website: '', phone: '' });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {hasFilter ? `${companies.length} match(es)` : `${companies.length} companies`}
        </p>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New company
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {companies.map((c) => {
          const count = contacts.filter((x) => x.companyId === c.id).length;
          return (
            <Link key={c.id} to={`/companies/${c.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <h3 className="font-semibold text-gray-900">{c.name}</h3>
                <p className="mt-1 text-sm text-muted">{c.industry ?? 'Industry not set'}</p>
                <p className="mt-3 text-xs text-muted">{count} linked contacts</p>
              </Card>
            </Link>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New company">
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
            <label className="mb-1 block text-xs font-medium">Industry</label>
            <Input
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Website</label>
            <Input
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Phone</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
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
