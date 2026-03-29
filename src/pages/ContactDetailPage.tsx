import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { useCrmStore } from '../store/crmStore';
import type { ContactLifecycle } from '../types/crm';
import { formatDateTime } from '../lib/format';
import { ACTIVITY_TYPE_LABEL } from '../types/crm';

const lifecycles: ContactLifecycle[] = ['subscriber', 'lead', 'customer', 'churned'];

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contacts = useCrmStore((s) => s.contacts);
  const companies = useCrmStore((s) => s.companies);
  const deals = useCrmStore((s) => s.deals);
  const activities = useCrmStore((s) => s.activities);
  const updateContact = useCrmStore((s) => s.updateContact);
  const removeContact = useCrmStore((s) => s.removeContact);
  const addActivity = useCrmStore((s) => s.addActivity);

  const contact = contacts.find((c) => c.id === id);

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteSubject, setNoteSubject] = useState('');

  const relatedDeals = useMemo(
    () => deals.filter((d) => d.contactIds.includes(id!)),
    [deals, id],
  );

  const timeline = useMemo(() => {
    return activities
      .filter((a) => a.relatedType === 'contact' && a.relatedId === id)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [activities, id]);

  if (!contact) {
    return (
      <p className="text-muted">
        Contact not found. <Link to="/contacts" className="text-brand underline">Back</Link>
      </p>
    );
  }

  const company = companies.find((c) => c.id === contact.companyId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/contacts"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Contacts
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {contact.firstName} {contact.lastName}
          </h2>
          {company && (
            <p className="mt-1 text-sm text-muted">
              <Link to={`/companies/${company.id}`} className="text-brand hover:underline">
                {company.name}
              </Link>
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="default">{contact.lifecycle}</Badge>
            {contact.tags.map((t) => (
              <Badge key={t} tone="muted">
                {t}
              </Badge>
            ))}
          </div>
        </div>
        <Button
          variant="danger"
          onClick={() => {
            if (confirm('Delete this contact?')) {
              removeContact(contact.id);
              navigate('/contacts');
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Profile</CardTitle>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <label className="text-xs font-medium text-muted">Email</label>
              <Input
                className="mt-1"
                value={contact.email}
                onChange={(e) => updateContact(contact.id, { email: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted">First name</label>
                <Input
                  className="mt-1"
                  value={contact.firstName}
                  onChange={(e) => updateContact(contact.id, { firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Last name</label>
                <Input
                  className="mt-1"
                  value={contact.lastName}
                  onChange={(e) => updateContact(contact.id, { lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Phone</label>
              <Input
                className="mt-1"
                value={contact.phone ?? ''}
                onChange={(e) => updateContact(contact.id, { phone: e.target.value || undefined })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Job title</label>
              <Input
                className="mt-1"
                value={contact.jobTitle ?? ''}
                onChange={(e) =>
                  updateContact(contact.id, { jobTitle: e.target.value || undefined })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Company</label>
              <Select
                className="mt-1"
                value={contact.companyId ?? ''}
                onChange={(e) =>
                  updateContact(contact.id, {
                    companyId: e.target.value || undefined,
                  })
                }
              >
                <option value="">— None —</option>
                {companies.map((co) => (
                  <option key={co.id} value={co.id}>
                    {co.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Lifecycle</label>
              <Select
                className="mt-1"
                value={contact.lifecycle}
                onChange={(e) =>
                  updateContact(contact.id, { lifecycle: e.target.value as ContactLifecycle })
                }
              >
                {lifecycles.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Notes</label>
              <Textarea
                className="mt-1"
                value={contact.notes ?? ''}
                onChange={(e) => updateContact(contact.id, { notes: e.target.value || undefined })}
              />
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardTitle>Related deals</CardTitle>
            <ul className="mt-3 space-y-2 text-sm">
              {relatedDeals.length === 0 ? (
                <li className="text-muted">No deals linked</li>
              ) : (
                relatedDeals.map((d) => (
                  <li key={d.id}>
                    <Link to={`/deals/${d.id}`} className="font-medium text-brand hover:underline">
                      {d.name}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Activity timeline</CardTitle>
              <Button variant="outline" className="!py-1 !px-2 text-xs" onClick={() => setNoteOpen(true)}>
                Log activity
              </Button>
            </div>
            <ul className="mt-4 space-y-3">
              {timeline.length === 0 ? (
                <li className="text-sm text-muted">No activities yet</li>
              ) : (
                timeline.map((a) => (
                  <li key={a.id} className="border-l-2 border-brand-muted pl-3 text-sm">
                    <div className="font-medium text-gray-900">{a.subject}</div>
                    <div className="mt-1 text-xs text-muted">
                      {ACTIVITY_TYPE_LABEL[a.type]} · {formatDateTime(a.createdAt)}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </Card>
        </div>
      </div>

      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title="Log activity">
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Subject"
            value={noteSubject}
            onChange={(e) => setNoteSubject(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!noteSubject.trim()) return;
                addActivity({
                  type: 'note',
                  subject: noteSubject.trim(),
                  relatedType: 'contact',
                  relatedId: contact.id,
                  ownerId: 'user-1',
                });
                setNoteSubject('');
                setNoteOpen(false);
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}