import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Mail, Trash2, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import { useCrmStore } from '../store/crmStore';
import {
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_TYPE_LABEL,
  type CampaignStatus,
  type CampaignType,
} from '../types/crm';
import { formatDate, formatMoney } from '../lib/format';
import { applyMergeFields } from '../lib/templateMerge';
import { getTemplateBodyHtml } from '../lib/emailTemplateBody';
import { getMicrosoftMailBlockReason } from '../lib/microsoft/mailPrereqs';
import {
  sendCampaignTemplateToMembers,
  type CampaignSendResult,
} from '../lib/microsoft/sendCampaignMails';

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

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const campaigns = useCrmStore((s) => s.campaigns);
  const contacts = useCrmStore((s) => s.contacts);
  const leads = useCrmStore((s) => s.leads);
  const companies = useCrmStore((s) => s.companies);
  const templates = useCrmStore((s) => s.emailTemplates);
  const updateCampaign = useCrmStore((s) => s.updateCampaign);
  const removeCampaign = useCrmStore((s) => s.removeCampaign);
  const addCampaignContact = useCrmStore((s) => s.addCampaignContact);
  const removeCampaignContact = useCrmStore((s) => s.removeCampaignContact);
  const addCampaignLead = useCrmStore((s) => s.addCampaignLead);
  const removeCampaignLead = useCrmStore((s) => s.removeCampaignLead);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [addContactId, setAddContactId] = useState('');
  const [addLeadId, setAddLeadId] = useState('');
  const [previewPickContact, setPreviewPickContact] = useState('');
  const [previewPickLead, setPreviewPickLead] = useState('');
  const [sendOpen, setSendOpen] = useState(false);
  const [sendProgress, setSendProgress] = useState('');
  const [sendResult, setSendResult] = useState<CampaignSendResult | null>(null);
  const [sendRunning, setSendRunning] = useState(false);

  const campaign = campaigns.find((c) => c.id === id);
  const template = templates.find((t) => t.id === campaign?.templateId);

  const availableContacts = useMemo(
    () => contacts.filter((c) => !campaign?.contactIds.includes(c.id)),
    [contacts, campaign],
  );
  const availableLeads = useMemo(
    () => leads.filter((l) => !campaign?.leadIds.includes(l.id)),
    [leads, campaign],
  );

  if (!campaign) {
    return (
      <p className="text-muted">
        Campaign not found.{' '}
        <Link to="/campaigns" className="text-brand underline">
          Back
        </Link>
      </p>
    );
  }

  function mergedSample() {
    if (!template) return { subject: '', body: '' };
    const c = contacts.find((x) => x.id === previewPickContact) ?? null;
    const l = leads.find((x) => x.id === previewPickLead) ?? null;
    const co = c?.companyId ? companies.find((x) => x.id === c.companyId) : undefined;
    const ctx = {
      contact: c ?? undefined,
      lead: l ?? undefined,
      companyName: co?.name ?? l?.company,
    };
    return {
      subject: applyMergeFields(template.subject, ctx),
      body: applyMergeFields(getTemplateBodyHtml(template), ctx),
    };
  }

  const merged = mergedSample();

  const recipientCount = useMemo(() => {
    let n = 0;
    for (const cid of campaign.contactIds) {
      const c = contacts.find((x) => x.id === cid);
      if (c?.email?.trim()) n++;
    }
    for (const lid of campaign.leadIds) {
      const l = leads.find((x) => x.id === lid);
      if (l?.email?.trim()) n++;
    }
    return n;
  }, [campaign.contactIds, campaign.leadIds, contacts, leads]);

  const mailBlock = getMicrosoftMailBlockReason();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/campaigns"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Campaigns
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-2xl font-semibold text-gray-900">{campaign.name}</h2>
        <div className="flex flex-wrap gap-2">
          {template ? (
            <>
              <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
                <Eye className="h-4 w-4" />
                Preview email
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setSendResult(null);
                  setSendProgress('');
                  setSendOpen(true);
                }}
                disabled={recipientCount === 0}
              >
                <Mail className="h-4 w-4" />
                Send to members
              </Button>
            </>
          ) : null}
          <Button
            variant="danger"
            onClick={() => {
              if (confirm('Delete this campaign?')) {
                removeCampaign(campaign.id);
                navigate('/campaigns');
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardTitle>Campaign details</CardTitle>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted">Name</label>
            <Input
              className="mt-1"
              value={campaign.name}
              onChange={(e) => updateCampaign(campaign.id, { name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Type</label>
            <Select
              className="mt-1"
              value={campaign.type}
              onChange={(e) => updateCampaign(campaign.id, { type: e.target.value as CampaignType })}
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {CAMPAIGN_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Status</label>
            <Select
              className="mt-1"
              value={campaign.status}
              onChange={(e) =>
                updateCampaign(campaign.id, { status: e.target.value as CampaignStatus })
              }
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {CAMPAIGN_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Start date</label>
            <Input
              type="date"
              className="mt-1"
              value={campaign.startDate ?? ''}
              onChange={(e) =>
                updateCampaign(campaign.id, { startDate: e.target.value || undefined })
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">End date</label>
            <Input
              type="date"
              className="mt-1"
              value={campaign.endDate ?? ''}
              onChange={(e) =>
                updateCampaign(campaign.id, { endDate: e.target.value || undefined })
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Budgeted cost</label>
            <Input
              type="number"
              className="mt-1"
              min={0}
              value={campaign.budgetedCost ?? ''}
              onChange={(e) =>
                updateCampaign(campaign.id, {
                  budgetedCost: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Actual cost</label>
            <Input
              type="number"
              className="mt-1"
              min={0}
              value={campaign.actualCost ?? ''}
              onChange={(e) =>
                updateCampaign(campaign.id, {
                  actualCost: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Expected revenue</label>
            <Input
              type="number"
              className="mt-1"
              min={0}
              value={campaign.expectedRevenue ?? ''}
              onChange={(e) =>
                updateCampaign(campaign.id, {
                  expectedRevenue: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Currency</label>
            <Input
              className="mt-1"
              value={campaign.currency}
              onChange={(e) => updateCampaign(campaign.id, { currency: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted">Email template</label>
            <Select
              className="mt-1"
              value={campaign.templateId ?? ''}
              onChange={(e) =>
                updateCampaign(campaign.id, {
                  templateId: e.target.value || undefined,
                })
              }
            >
              <option value="">— None —</option>
              {templates
                .filter((t) => t.active)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted">Description</label>
            <Textarea
              className="mt-1 min-h-[88px]"
              value={campaign.description ?? ''}
              onChange={(e) =>
                updateCampaign(campaign.id, { description: e.target.value || undefined })
              }
            />
          </div>
        </div>
        <p className="mt-4 text-xs text-muted">
          Budget {formatMoney(campaign.budgetedCost ?? 0, campaign.currency)} · Actual{' '}
          {formatMoney(campaign.actualCost ?? 0, campaign.currency)} · Expected{' '}
          {campaign.expectedRevenue != null
            ? formatMoney(campaign.expectedRevenue, campaign.currency)
            : '—'}{' '}
          · Updated {formatDate(campaign.updatedAt)}
        </p>
      </Card>

      <Card>
        <CardTitle>Members</CardTitle>
        <p className="mt-1 text-sm text-muted">
          Contacts and leads included in this campaign (Zoho-style member list).
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Select
            className="min-w-[12rem]"
            value={addContactId}
            onChange={(e) => setAddContactId(e.target.value)}
          >
            <option value="">Add contact…</option>
            {availableContacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="secondary"
            disabled={!addContactId}
            onClick={() => {
              addCampaignContact(campaign.id, addContactId);
              setAddContactId('');
            }}
          >
            Add contact
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={availableContacts.length === 0}
            title="Add every contact that is not already in this campaign"
            onClick={() => {
              if (
                availableContacts.length > 0 &&
                !confirm(
                  `Add all ${availableContacts.length} contact${availableContacts.length === 1 ? '' : 's'} to this campaign?`,
                )
              ) {
                return;
              }
              for (const c of availableContacts) {
                addCampaignContact(campaign.id, c.id);
              }
            }}
          >
            Add all contacts
            {availableContacts.length > 0 ? ` (${availableContacts.length})` : ''}
          </Button>
          <Select
            className="min-w-[12rem]"
            value={addLeadId}
            onChange={(e) => setAddLeadId(e.target.value)}
          >
            <option value="">Add lead…</option>
            {availableLeads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="secondary"
            disabled={!addLeadId}
            onClick={() => {
              addCampaignLead(campaign.id, addLeadId);
              setAddLeadId('');
            }}
          >
            Add lead
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={availableLeads.length === 0}
            title="Add every lead that is not already in this campaign"
            onClick={() => {
              if (
                availableLeads.length > 0 &&
                !confirm(
                  `Add all ${availableLeads.length} lead${availableLeads.length === 1 ? '' : 's'} to this campaign?`,
                )
              ) {
                return;
              }
              for (const l of availableLeads) {
                addCampaignLead(campaign.id, l.id);
              }
            }}
          >
            Add all leads
            {availableLeads.length > 0 ? ` (${availableLeads.length})` : ''}
          </Button>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted">Contacts</h4>
            <ul className="mt-2 space-y-2">
              {campaign.contactIds.length === 0 ? (
                <li className="text-sm text-muted">None</li>
              ) : (
                campaign.contactIds.map((cid) => {
                  const c = contacts.find((x) => x.id === cid);
                  if (!c) return null;
                  return (
                    <li key={cid} className="flex items-center justify-between gap-2 text-sm">
                      <Link to={`/contacts/${cid}`} className="text-brand hover:underline">
                        {c.firstName} {c.lastName}
                      </Link>
                      <button
                        type="button"
                        className="rounded p-1 text-muted hover:bg-red-50 hover:text-error"
                        aria-label="Remove"
                        onClick={() => removeCampaignContact(campaign.id, cid)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted">Leads</h4>
            <ul className="mt-2 space-y-2">
              {campaign.leadIds.length === 0 ? (
                <li className="text-sm text-muted">None</li>
              ) : (
                campaign.leadIds.map((lid) => {
                  const l = leads.find((x) => x.id === lid);
                  if (!l) return null;
                  return (
                    <li key={lid} className="flex items-center justify-between gap-2 text-sm">
                      <span>{l.name}</span>
                      <button
                        type="button"
                        className="rounded p-1 text-muted hover:bg-red-50 hover:text-error"
                        aria-label="Remove"
                        onClick={() => removeCampaignLead(campaign.id, lid)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      </Card>

      <Modal
        open={sendOpen}
        onClose={() => !sendRunning && setSendOpen(false)}
        title="Send campaign email"
        className="max-w-lg"
      >
        {template ? (
          <div className="space-y-4 text-sm">
            <p className="text-muted">
              Sends the template <span className="font-medium text-gray-900">{template.name}</span>{' '}
              once per member that has an email, from your Microsoft mailbox. Merge fields like{' '}
              <span className="font-mono text-xs">{'{{'}FirstName{'}}'}</span> are filled per
              recipient.
            </p>
            {mailBlock ? (
              <p className="rounded-lg bg-amber-50 p-3 text-amber-950">{mailBlock}</p>
            ) : (
              <>
                <p>
                  <span className="font-medium text-gray-900">{recipientCount}</span> message
                  {recipientCount === 1 ? '' : 's'} will be sent
                  {recipientCount === 0 ? ' (add members with email addresses).' : '.'}
                </p>
                {sendProgress ? (
                  <p className="font-mono text-xs text-muted">Progress: {sendProgress}</p>
                ) : null}
                {sendResult ? (
                  <div className="rounded-lg border border-[var(--color-border)] bg-gray-50 p-3 text-xs">
                    <p className="font-medium text-gray-900">
                      Sent {sendResult.sent}
                      {sendResult.skippedNoEmail > 0
                        ? ` · Skipped (no email): ${sendResult.skippedNoEmail}`
                        : ''}
                    </p>
                    {sendResult.errors.length > 0 ? (
                      <ul className="mt-2 max-h-32 list-inside list-disc overflow-y-auto text-red-800">
                        {sendResult.errors.map((e, i) => (
                          <li key={i} className="break-words">
                            {e}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={sendRunning}
                    onClick={() => setSendOpen(false)}
                  >
                    {sendResult ? 'Close' : 'Cancel'}
                  </Button>
                  {!sendResult && recipientCount > 0 ? (
                    <Button
                      type="button"
                      disabled={sendRunning || Boolean(mailBlock)}
                      onClick={async () => {
                        setSendRunning(true);
                        setSendProgress('');
                        setSendResult(null);
                        try {
                          const r = await sendCampaignTemplateToMembers(
                            campaign,
                            template,
                            contacts,
                            leads,
                            companies,
                            (done, total) => setSendProgress(`${done} / ${total}`),
                          );
                          setSendResult(r);
                        } catch (e) {
                          setSendResult({
                            sent: 0,
                            skippedNoEmail: 0,
                            errors: [e instanceof Error ? e.message : 'Failed'],
                          });
                        } finally {
                          setSendRunning(false);
                        }
                      }}
                    >
                      {sendRunning ? 'Sending…' : 'Send now'}
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Preview linked template"
        className="max-w-2xl"
      >
        {template ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium">Sample contact</label>
                <Select
                  value={previewPickContact}
                  onChange={(e) => {
                    setPreviewPickContact(e.target.value);
                    setPreviewPickLead('');
                  }}
                >
                  <option value="">— None —</option>
                  {campaign.contactIds.map((cid) => {
                    const c = contacts.find((x) => x.id === cid);
                    if (!c) return null;
                    return (
                      <option key={cid} value={cid}>
                        {c.firstName} {c.lastName}
                      </option>
                    );
                  })}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Sample lead</label>
                <Select
                  value={previewPickLead}
                  onChange={(e) => {
                    setPreviewPickLead(e.target.value);
                    setPreviewPickContact('');
                  }}
                >
                  <option value="">— None —</option>
                  {campaign.leadIds.map((lid) => {
                    const l = leads.find((x) => x.id === lid);
                    if (!l) return null;
                    return (
                      <option key={lid} value={lid}>
                        {l.name}
                      </option>
                    );
                  })}
                </Select>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-surface/50 p-4">
              <div className="text-xs font-medium text-muted">Subject</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{merged.subject}</div>
              <div className="mt-4 text-xs font-medium text-muted">Body</div>
              <div
                className="mt-2 text-sm leading-relaxed text-gray-800 [&_a]:text-brand [&_p]:my-2"
                dangerouslySetInnerHTML={{ __html: merged.body || '<p class="text-muted">(empty)</p>' }}
              />
            </div>
            <p className="text-xs text-muted">Template: {template.name}</p>
            <Button type="button" variant="outline" className="w-full" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
