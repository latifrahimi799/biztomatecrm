import { useMemo, useState } from 'react';
import { FilePlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useCrmStore } from '../store/crmStore';
import type { Product, QuoteLine } from '../types/crm';
import { formatMoney } from '../lib/format';

function quoteTotal(lines: QuoteLine[], products: Product[]) {
  return lines.reduce((sum, line) => {
    const p = products.find((x) => x.id === line.productId);
    if (!p) return sum;
    const sub = p.unitPrice * line.quantity * (1 - line.discountPct / 100);
    return sum + sub;
  }, 0);
}

export function QuotesPage() {
  const quotes = useCrmStore((s) => s.quotes);
  const products = useCrmStore((s) => s.products);
  const deals = useCrmStore((s) => s.deals);
  const addQuote = useCrmStore((s) => s.addQuote);
  const updateQuote = useCrmStore((s) => s.updateQuote);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    dealId: '',
    status: 'draft' as 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired',
  });

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    const q = addQuote({
      title: form.title.trim() || 'Untitled quote',
      dealId: form.dealId || undefined,
      companyId: undefined,
      contactId: undefined,
      status: form.status,
      validUntil: undefined,
      ownerId: 'user-1',
    });
    setEditingId(q.id);
    setOpen(false);
    setForm({ title: '', dealId: '', status: 'draft' });
  }

  const editing = quotes.find((q) => q.id === editingId);

  const editTotal = useMemo(() => {
    if (!editing) return 0;
    return quoteTotal(editing.lines, products);
  }, [editing, products]);

  function addLine() {
    if (!editing) return;
    const first = products[0];
    if (!first) return;
    const lines = [
      ...editing.lines,
      { productId: first.id, quantity: 1, discountPct: 0 },
    ] satisfies QuoteLine[];
    updateQuote(editing.id, { lines });
  }

  function updateLine(i: number, patch: Partial<QuoteLine>) {
    if (!editing) return;
    const lines = editing.lines.map((l, j) => (j === i ? { ...l, ...patch } : l));
    updateQuote(editing.id, { lines });
  }

  function removeLine(i: number) {
    if (!editing) return;
    const lines = editing.lines.filter((_, j) => j !== i);
    updateQuote(editing.id, { lines });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <FilePlus className="h-4 w-4" />
          New quote
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-0 overflow-hidden">
          <div className="border-b border-[var(--color-border)] px-5 py-3">
            <CardTitle className="!mb-0">All quotes</CardTitle>
          </div>
          <table className="w-full text-left text-sm">
            <tbody>
              {quotes.map((q) => {
                const total = quoteTotal(q.lines, products);
                return (
                  <tr key={q.id} className="border-t border-[var(--color-border)]/60">
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        className="text-left font-medium text-brand hover:underline"
                        onClick={() => setEditingId(q.id)}
                      >
                        {q.title}
                      </button>
                      <div className="text-xs text-muted">
                        {formatMoney(total, products[0]?.currency ?? 'CAD')} · {q.lines.length}{' '}
                        line(s)
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        tone={
                          q.status === 'accepted'
                            ? 'success'
                            : q.status === 'rejected'
                              ? 'error'
                              : 'default'
                        }
                      >
                        {q.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardTitle>{editing ? 'Quote editor' : 'Select a quote'}</CardTitle>
          {!editing ? (
            <p className="mt-3 text-sm text-muted">Choose a quote from the list to edit line items.</p>
          ) : (
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <label className="text-xs font-medium text-muted">Title</label>
                <Input
                  className="mt-1"
                  value={editing.title}
                  onChange={(e) => updateQuote(editing.id, { title: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted">Status</label>
                  <Select
                    className="mt-1"
                    value={editing.status}
                    onChange={(e) =>
                      updateQuote(editing.id, {
                        status: e.target.value as typeof editing.status,
                      })
                    }
                  >
                    {(['draft', 'sent', 'accepted', 'rejected', 'expired'] as const).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted">Valid until</label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={editing.validUntil ?? ''}
                    onChange={(e) =>
                      updateQuote(editing.id, { validUntil: e.target.value || undefined })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Deal</label>
                <Select
                  className="mt-1"
                  value={editing.dealId ?? ''}
                  onChange={(e) =>
                    updateQuote(editing.id, { dealId: e.target.value || undefined })
                  }
                >
                  <option value="">— None —</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium">Line items</span>
                <Button type="button" variant="outline" className="!py-1" onClick={addLine}>
                  Add line
                </Button>
              </div>
              {editing.lines.length === 0 ? (
                <p className="text-muted">No lines — add products from your catalog.</p>
              ) : (
                <div className="space-y-2">
                  {editing.lines.map((line, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--color-border)] p-3"
                    >
                      <div className="min-w-[180px] flex-1">
                        <label className="text-xs text-muted">Product</label>
                        <Select
                          className="mt-1"
                          value={line.productId}
                          onChange={(e) => updateLine(i, { productId: e.target.value })}
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="w-24">
                        <label className="text-xs text-muted">Qty</label>
                        <Input
                          type="number"
                          className="mt-1"
                          min={1}
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(i, { quantity: Number(e.target.value) || 1 })
                          }
                        />
                      </div>
                      <div className="w-24">
                        <label className="text-xs text-muted">Disc %</label>
                        <Input
                          type="number"
                          className="mt-1"
                          min={0}
                          max={100}
                          value={line.discountPct}
                          onChange={(e) =>
                            updateLine(i, { discountPct: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <Button variant="ghost" type="button" onClick={() => removeLine(i)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg bg-brand-muted/50 p-3 text-lg font-semibold text-brand">
                Total: {formatMoney(editTotal, products[0]?.currency ?? 'CAD')}
              </div>
            </div>
          )}
        </Card>
      </div>

      <p className="text-xs text-muted">
        Quotes tie to deals and use your product catalog — typical CPQ flow before connecting
        billing (Stripe, etc.).
      </p>

      <Modal open={open} onClose={() => setOpen(false)} title="New quote">
        <form onSubmit={submitNew} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Title</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Deal (optional)</label>
            <Select
              value={form.dealId}
              onChange={(e) => setForm((f) => ({ ...f, dealId: e.target.value }))}
            >
              <option value="">— None —</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Initial status</label>
            <Select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as typeof form.status }))
              }
            >
              <option value="draft">draft</option>
              <option value="sent">sent</option>
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
