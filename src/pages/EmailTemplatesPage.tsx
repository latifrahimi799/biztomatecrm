import { useMemo, useState } from 'react';
import { Eye, LayoutTemplate, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { EmailTemplateEditorModal } from '../components/emailTemplate/EmailTemplateEditorModal';
import { useCrmStore } from '../store/crmStore';
import { useFilteredEntities } from '../hooks/useFilteredEntities';
import type { EmailTemplate, EmailTemplateCategory } from '../types/crm';
import { formatDate } from '../lib/format';
import { applyMergeFields } from '../lib/templateMerge';
import { getTemplateBodyHtml } from '../lib/emailTemplateBody';
import { createTextBlock } from '../lib/emailBlocks/blockFactory';

export function EmailTemplatesPage() {
  const { contacts, leads } = useFilteredEntities();
  const templates = useCrmStore((s) => s.emailTemplates);
  const addEmailTemplate = useCrmStore((s) => s.addEmailTemplate);
  const updateEmailTemplate = useCrmStore((s) => s.updateEmailTemplate);
  const removeEmailTemplate = useCrmStore((s) => s.removeEmailTemplate);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitial, setEditorInitial] = useState<EmailTemplate | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewContactId, setPreviewContactId] = useState('');
  const [previewLeadId, setPreviewLeadId] = useState('');

  const previewTemplate = useMemo(
    () => templates.find((t) => t.id === previewId) ?? null,
    [templates, previewId],
  );

  function openNew() {
    const t = new Date().toISOString();
    const first = createTextBlock();
    setEditingId(null);
    setEditorInitial({
      id: '',
      name: '',
      subject: '',
      body: '',
      bodyFormat: 'blocks',
      blocks: [first],
      category: 'campaign',
      active: true,
      ownerId: 'user-1',
      createdAt: t,
      updatedAt: t,
    });
    setEditorOpen(true);
  }

  function openEdit(template: EmailTemplate) {
    setEditingId(template.id);
    setEditorInitial(template);
    setEditorOpen(true);
  }

  function mergePreview() {
    if (!previewTemplate) return { subject: '', body: '' };
    const contact = contacts.find((c) => c.id === previewContactId) ?? null;
    const lead = leads.find((l) => l.id === previewLeadId) ?? null;
    const co = contact?.companyId
      ? useCrmStore.getState().companies.find((x) => x.id === contact.companyId)
      : undefined;
    const ctx = {
      contact: contact ?? undefined,
      lead: lead ?? undefined,
      companyName: co?.name ?? lead?.company,
    };
    const rawHtml = getTemplateBodyHtml(previewTemplate);
    return {
      subject: applyMergeFields(previewTemplate.subject, ctx),
      body: applyMergeFields(rawHtml, ctx),
    };
  }

  const merged = mergePreview();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {templates.length} template{templates.length !== 1 ? 's' : ''} · Drag-and-drop builder ·{' '}
          <code className="text-xs">{`{{FirstName}} {{LastName}} {{Email}} {{Company}} {{Phone}} {{JobTitle}}`}</code>
        </p>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          New template
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface/80 text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Format</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Subject</th>
                <th className="px-5 py-3 font-medium">Updated</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-t border-[var(--color-border)]/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <LayoutTemplate className="h-4 w-4 shrink-0 text-muted" />
                      <span className="font-medium text-gray-900">{t.name}</span>
                      {t.active ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge tone="muted">Inactive</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {t.bodyFormat === 'blocks' ? 'Builder' : 'HTML'}
                  </td>
                  <td className="px-5 py-3 capitalize text-muted">{t.category}</td>
                  <td className="px-5 py-3 text-muted line-clamp-2 max-w-xs">{t.subject}</td>
                  <td className="px-5 py-3 text-muted">{formatDate(t.updatedAt)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="!px-2"
                        onClick={() => {
                          setPreviewId(t.id);
                          setPreviewContactId(contacts[0]?.id ?? '');
                          setPreviewLeadId('');
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => openEdit(t)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        className="!px-2"
                        onClick={() => {
                          if (confirm(`Delete template “${t.name}”?`)) removeEmailTemplate(t.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <EmailTemplateEditorModal
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditorInitial(null);
        }}
        initial={editorInitial}
        onSave={(payload) => {
          const strip = {
            name: payload.name,
            subject: payload.subject,
            category: payload.category as EmailTemplateCategory,
            active: payload.active,
            body: payload.body,
            bodyFormat: payload.bodyFormat,
            blocks: payload.blocks,
          };
          if (editingId) {
            updateEmailTemplate(editingId, strip);
          } else {
            addEmailTemplate({
              ...strip,
              ownerId: 'user-1',
            });
          }
        }}
      />

      <Modal
        open={!!previewId && !!previewTemplate}
        onClose={() => setPreviewId(null)}
        title="Preview merged email"
        className="max-w-2xl"
      >
        {previewTemplate ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium">Sample contact</label>
                <Select
                  value={previewContactId}
                  onChange={(e) => {
                    setPreviewContactId(e.target.value);
                    setPreviewLeadId('');
                  }}
                >
                  <option value="">— None —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Sample lead</label>
                <Select
                  value={previewLeadId}
                  onChange={(e) => {
                    setPreviewLeadId(e.target.value);
                    setPreviewContactId('');
                  }}
                >
                  <option value="">— None —</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-surface/50 p-4">
              <div className="text-xs font-medium text-muted">Subject</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{merged.subject}</div>
              <div className="mt-4 text-xs font-medium text-muted">Body</div>
              <div
                className="mt-2 max-w-none text-sm leading-relaxed text-gray-800 [&_a]:text-brand [&_p]:my-2"
                dangerouslySetInnerHTML={{ __html: merged.body || '<p class="text-muted">(empty)</p>' }}
              />
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={() => setPreviewId(null)}>
              Close
            </Button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
