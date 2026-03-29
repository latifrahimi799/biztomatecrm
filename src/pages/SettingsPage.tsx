import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useCrmStore } from '../store/crmStore';
import { useAuthStore } from '../store/authStore';

export function SettingsPage() {
  const team = useCrmStore((s) => s.team);
  const resetDemoData = useCrmStore((s) => s.resetDemoData);
  const userName = useAuthStore((s) => s.userName);
  const userEmail = useAuthStore((s) => s.userEmail);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardTitle>Workspace profile</CardTitle>
        <p className="mt-2 text-sm text-muted">
          Signed in as <span className="font-medium text-gray-900">{userName}</span> ({userEmail}
          ).
        </p>
        <div className="mt-4 rounded-lg bg-brand-muted/40 p-4 text-sm">
          <p className="font-medium text-brand">Biztomate brand</p>
          <p className="mt-1 text-muted">
            Primary <span className="font-mono text-gray-800">#007AFF</span>, secondary{' '}
            <span className="font-mono text-gray-800">#5856D6</span> — aligned with the Biztomate
            Scanner app.
          </p>
        </div>
      </Card>

      <Card>
        <CardTitle>Team & roles</CardTitle>
        <p className="mt-1 text-sm text-muted">
          Prospect view of seat management. Hook to your directory or SSO later.
        </p>
        <ul className="mt-4 divide-y divide-[var(--color-border)]/60">
          {team.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <div className="font-medium text-gray-900">{m.name}</div>
                <div className="text-sm text-muted">{m.email}</div>
              </div>
              <Badge tone="secondary">{m.role}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>Data & demo reset</CardTitle>
        <p className="mt-2 text-sm text-muted">
          Clears persisted CRM records in this browser and reloads sample Biztomate data. Auth
          session is kept.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          type="button"
          onClick={() => {
            if (confirm('Reset all CRM data to the built-in demo dataset?')) resetDemoData();
          }}
        >
          Reset demo data
        </Button>
      </Card>

      <Card>
        <CardTitle>Integrations (roadmap)</CardTitle>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-muted">
          <li>Email sync (Gmail / Microsoft 365)</li>
          <li>Calendar meetings → activities</li>
          <li>Zapier / webhooks for Biztomate Scanner signups</li>
          <li>Stripe or Play Billing for quote-to-cash</li>
        </ul>
      </Card>
    </div>
  );
}
