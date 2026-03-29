import { useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useCrmStore } from '../store/crmStore';
import { formatMoney } from '../lib/format';

export function ProductsPage() {
  const products = useCrmStore((s) => s.products);
  const addProduct = useCrmStore((s) => s.addProduct);
  const updateProduct = useCrmStore((s) => s.updateProduct);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    unitPrice: '0',
    currency: 'CAD',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    addProduct({
      name: form.name.trim(),
      sku: form.sku.trim() || 'SKU-' + Date.now(),
      unitPrice: Number(form.unitPrice) || 0,
      currency: form.currency,
      active: true,
    });
    setOpen(false);
    setForm({ name: '', sku: '', unitPrice: '0', currency: 'CAD' });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <PackagePlus className="h-4 w-4" />
          New product
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface/80 text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-5 py-3 font-medium">SKU</th>
              <th className="px-5 py-3 font-medium">Price</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-[var(--color-border)]/60">
                <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-5 py-3 text-muted">{p.sku}</td>
                <td className="px-5 py-3">{formatMoney(p.unitPrice, p.currency)}</td>
                <td className="px-5 py-3">
                  <button
                    type="button"
                    onClick={() => updateProduct(p.id, { active: !p.active })}
                    className="inline-flex"
                  >
                    <Badge tone={p.active ? 'success' : 'muted'}>
                      {p.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New product">
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
            <label className="mb-1 block text-xs font-medium">SKU</label>
            <Input
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">Unit price</label>
              <Input
                type="number"
                value={form.unitPrice}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Currency</label>
              <Input
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              />
            </div>
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
