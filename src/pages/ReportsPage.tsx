import { useMemo } from 'react';
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardTitle } from '../components/ui/Card';
import { useCrmStore } from '../store/crmStore';
import { DEAL_STAGE_LABEL } from '../types/crm';
import { formatMoney } from '../lib/format';

export function ReportsPage() {
  const deals = useCrmStore((s) => s.deals);
  const contacts = useCrmStore((s) => s.contacts);
  const activities = useCrmStore((s) => s.activities);
  const leads = useCrmStore((s) => s.leads);

  const stats = useMemo(() => {
    const closed = deals.filter((d) => d.stage === 'won' || d.stage === 'lost');
    const won = deals.filter((d) => d.stage === 'won');
    const lost = deals.filter((d) => d.stage === 'lost');
    const winRate =
      won.length + lost.length > 0
        ? Math.round((won.length / (won.length + lost.length)) * 100)
        : 0;
    const avgDeal =
      won.length > 0
        ? won.reduce((a, d) => a + d.value, 0) / won.length
        : 0;
    const openPipeline = deals
      .filter((d) => d.stage !== 'won' && d.stage !== 'lost')
      .reduce((a, d) => a + d.value, 0);
    return {
      winRate,
      avgDeal,
      openPipeline,
      totalDeals: deals.length,
      closedCount: closed.length,
      completedTasks: activities.filter((a) => a.completedAt).length,
      leadConversion: leads.filter((l) => l.status === 'sold').length,
    };
  }, [deals, activities, leads]);

  const funnel = useMemo(() => {
    return ['lead', 'qualified', 'proposal', 'negotiation', 'won'].map((stage) => ({
      stage: DEAL_STAGE_LABEL[stage as keyof typeof DEAL_STAGE_LABEL],
      count: deals.filter((d) => d.stage === stage).length,
    }));
  }, [deals]);

  const pieData = useMemo(() => {
    const byLifecycle = ['lead', 'customer', 'subscriber', 'churned'].map((l) => ({
      name: l,
      value: contacts.filter((c) => c.lifecycle === l).length,
    }));
    return byLifecycle.filter((x) => x.value > 0);
  }, [contacts]);

  const COLORS = ['#007AFF', '#5856D6', '#34C759', '#FF9500', '#8E8E93'];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="text-xs font-medium uppercase text-muted">Win rate</div>
          <div className="mt-1 text-3xl font-semibold text-brand">{stats.winRate}%</div>
          <div className="text-sm text-muted">Won vs lost (closed)</div>
        </Card>
        <Card>
          <div className="text-xs font-medium uppercase text-muted">Avg won deal</div>
          <div className="mt-1 text-3xl font-semibold text-gray-900">
            {formatMoney(stats.avgDeal)}
          </div>
        </Card>
        <Card>
          <div className="text-xs font-medium uppercase text-muted">Open pipeline</div>
          <div className="mt-1 text-3xl font-semibold text-brand-secondary">
            {formatMoney(stats.openPipeline)}
          </div>
        </Card>
        <Card>
          <div className="text-xs font-medium uppercase text-muted">Activities completed</div>
          <div className="mt-1 text-3xl font-semibold text-success">{stats.completedTasks}</div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Deal funnel (counts)</CardTitle>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={funnel}>
                <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#007AFF"
                  strokeWidth={2}
                  dot={{ fill: '#5856D6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle>Contacts by lifecycle</CardTitle>
          <div className="mt-4 h-64">
            {pieData.length === 0 ? (
              <p className="text-sm text-muted">No contact data</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Export & integrations</CardTitle>
        <p className="mt-2 text-sm text-muted">
          This build keeps data locally. For production, pipe the same entities (contacts, deals,
          quotes) to your warehouse, Google Sheets export, or Biztomate&apos;s own backend when you
          connect it.
        </p>
      </Card>
    </div>
  );
}
