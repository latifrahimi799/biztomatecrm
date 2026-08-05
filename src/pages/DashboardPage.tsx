import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { Card, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useCrmStore } from '../store/crmStore';
import { DEAL_STAGE_LABEL, type DealStage, isOpenLeadStatus } from '../types/crm';
import { formatDate, formatMoney, relativeTime } from '../lib/format';

const STAGES: DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

const PIPELINE_COLORS = ['#0A84FF', '#5E5CE6', '#64D2FF', '#30D158', '#FF9F0A', '#FF453A'];

export function DashboardPage() {
  const deals = useCrmStore((s) => s.deals);
  const contacts = useCrmStore((s) => s.contacts);
  const activities = useCrmStore((s) => s.activities);
  const leads = useCrmStore((s) => s.leads);

  const kpis = useMemo(() => {
    const openDeals = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost');
    const weighted = openDeals.reduce((acc, d) => acc + d.value * (d.probability / 100), 0);
    const pipeline = openDeals.reduce((acc, d) => acc + d.value, 0);
    const won = deals.filter((d) => d.stage === 'won').reduce((acc, d) => acc + d.value, 0);
    return {
      openCount: openDeals.length,
      pipeline,
      weighted,
      won,
      leadCount: leads.filter((l) => isOpenLeadStatus(l.status)).length,
    };
  }, [deals, leads]);

  const chartData = useMemo(() => {
    return STAGES.map((stage) => ({
      stage: DEAL_STAGE_LABEL[stage],
      key: stage,
      value: deals.filter((d) => d.stage === stage).reduce((a, d) => a + d.value, 0),
    }));
  }, [deals]);

  const upcoming = useMemo(() => {
    return activities
      .filter((a) => a.dueAt && !a.completedAt)
      .sort((a, b) => (a.dueAt! < b.dueAt! ? -1 : 1))
      .slice(0, 5);
  }, [activities]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-brand bg-gradient-to-br from-brand/10 to-white">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand">Open deals</div>
          <div className="mt-1 text-3xl font-bold text-brand">{kpis.openCount}</div>
          <div className="mt-2 text-sm text-muted">{formatMoney(kpis.pipeline)} pipeline</div>
        </Card>
        <Card className="border-l-4 border-l-brand-secondary bg-gradient-to-br from-brand-secondary/10 to-white">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
            Weighted forecast
          </div>
          <div className="mt-1 flex items-center gap-2 text-3xl font-bold text-gray-900">
            {formatMoney(kpis.weighted)}
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <div className="mt-2 text-sm text-muted">Probability-adjusted open</div>
        </Card>
        <Card className="border-l-4 border-l-success bg-gradient-to-br from-success/10 to-white">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Won revenue
          </div>
          <div className="mt-1 text-3xl font-bold text-success">{formatMoney(kpis.won)}</div>
          <div className="mt-2 text-sm text-muted">All won deals</div>
        </Card>
        <Card className="border-l-4 border-l-warning bg-gradient-to-br from-warning/10 to-white">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Active leads
          </div>
          <div className="mt-1 text-3xl font-bold text-amber-600">{kpis.leadCount}</div>
          <div className="mt-2 text-sm text-muted">Excl. converted & disqualified</div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardTitle>Pipeline by stage</CardTitle>
          <p className="mt-1 text-sm text-muted">Deal value summed per stage (all currencies mixed)</p>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#c5d4eb" />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#5b6b86' }} />
                <YAxis tick={{ fontSize: 11, fill: '#5b6b86' }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  formatter={(value) =>
                    [formatMoney(Number(value ?? 0)), 'Value'] as [string, string]
                  }
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgba(10,132,255,0.2)',
                    boxShadow: '0 8px 24px rgba(10,132,255,0.12)',
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={PIPELINE_COLORS[i % PIPELINE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>Upcoming activities</CardTitle>
          <ul className="mt-4 space-y-3">
            {upcoming.length === 0 ? (
              <li className="text-sm text-muted">No due items — log a task from Activities.</li>
            ) : (
              upcoming.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border border-brand/15 bg-gradient-to-r from-brand/5 to-brand-secondary/5 p-3"
                >
                  <div className="font-medium text-gray-900">{a.subject}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <Badge tone="muted">{a.type}</Badge>
                    <span>{relativeTime(a.dueAt)}</span>
                  </div>
                </li>
              ))
            )}
          </ul>
          <Link
            to="/activities"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            All activities <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Recently updated contacts</CardTitle>
          <Link to="/contacts" className="text-sm font-medium text-brand hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-muted">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Lifecycle</th>
                <th className="pb-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {[...contacts]
                .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
                .slice(0, 6)
                .map((c) => (
                  <tr key={c.id} className="border-b border-[var(--color-border)]/50">
                    <td className="py-3 pr-4">
                      <Link to={`/contacts/${c.id}`} className="font-medium text-brand hover:underline">
                        {c.firstName} {c.lastName}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-muted">{c.email}</td>
                    <td className="py-3 pr-4">
                      <Badge tone="default">{c.lifecycle}</Badge>
                    </td>
                    <td className="py-3 text-muted">{formatDate(c.updatedAt)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
