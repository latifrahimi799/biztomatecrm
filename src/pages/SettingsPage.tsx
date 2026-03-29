import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { isMicrosoftOAuthConfigured } from '../lib/microsoft/config';
import { startMicrosoftLogin } from '../lib/microsoft/startLogin';
import {
  buildCrmBackupPayload,
  tryParseCrmBackup,
  useCrmStore,
} from '../store/crmStore';
import { useAuthStore } from '../store/authStore';
import { useMicrosoftAuthStore } from '../store/microsoftAuthStore';

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const team = useCrmStore((s) => s.team);
  const resetDemoData = useCrmStore((s) => s.resetDemoData);
  const importCrmBackup = useCrmStore((s) => s.importCrmBackup);
  const userName = useAuthStore((s) => s.userName);
  const userEmail = useAuthStore((s) => s.userEmail);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const msConnected = useMicrosoftAuthStore((s) => Boolean(s.refreshToken || s.accessToken));
  const clearMicrosoft = useMicrosoftAuthStore((s) => s.clear);
  const [showMicrosoftConnectedToast, setShowMicrosoftConnectedToast] = useState(false);

  useEffect(() => {
    if (searchParams.get('microsoft') !== 'connected') return;
    setShowMicrosoftConnectedToast(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

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
        <CardTitle>Microsoft 365 — send email</CardTitle>
        <p className="mt-2 text-sm text-muted">
          Connect your work or personal Microsoft account so the app can request permission to send
          email as you (Microsoft Graph). Redirect URI must be registered in Entra as:{' '}
          <span className="font-mono text-xs text-gray-800">
            {'{'}origin{'}'}/auth/microsoft/callback
          </span>
        </p>
        {!isMicrosoftOAuthConfigured() ? (
          <p className="mt-3 text-sm text-amber-800">
            Add <span className="font-mono">VITE_MICROSOFT_CLIENT_ID</span> and{' '}
            <span className="font-mono">VITE_MICROSOFT_TENANT_ID</span> to your environment and
            redeploy (Vercel) or restart the dev server.
          </p>
        ) : msConnected ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium text-green-800">Microsoft account connected.</p>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                if (confirm('Disconnect Microsoft? You will need to sign in again to send mail.')) {
                  clearMicrosoft();
                }
              }}
            >
              Disconnect Microsoft
            </Button>
          </div>
        ) : (
          <div className="mt-4">
            <Button
              type="button"
              onClick={() => {
                startMicrosoftLogin().catch((e) =>
                  alert(e instanceof Error ? e.message : 'Could not start sign-in.'),
                );
              }}
            >
              Connect Microsoft account
            </Button>
          </div>
        )}
        {showMicrosoftConnectedToast && (
          <p className="mt-3 text-sm text-green-800" role="status">
            Microsoft sign-in completed. Sending mail from campaigns still needs a send action wired to
            Graph.
          </p>
        )}
      </Card>

      <Card>
        <CardTitle>Where your data lives</CardTitle>
        <p className="mt-2 text-sm text-muted">
          CRM records (contacts, deals, campaigns, templates, and so on) are stored in{' '}
          <strong className="font-medium text-gray-800">this browser only</strong>, not in Supabase
          yet. Your local dev site, production URL on Vercel, and another device each have separate
          storage — that is why entries you created on one place do not appear on another.
          Supabase on this project is currently used for email template image uploads, not for syncing
          the full CRM database.
        </p>
      </Card>

      <Card>
        <CardTitle>Backup & restore</CardTitle>
        <p className="mt-2 text-sm text-muted">
          Download a JSON backup from the environment where your latest data is (for example
          localhost), then import it on Vercel or another browser.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => {
              const payload = buildCrmBackupPayload(useCrmStore.getState());
              const blob = new Blob([JSON.stringify(payload, null, 2)], {
                type: 'application/json',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `biztomate-crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download backup (JSON)
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => backupInputRef.current?.click()}
          >
            Import backup…
          </Button>
          <input
            ref={backupInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const raw = JSON.parse(reader.result as string) as unknown;
                  const backup = tryParseCrmBackup(raw);
                  if (!backup) {
                    alert('That file is not a valid Biztomate CRM backup.');
                    return;
                  }
                  if (
                    !confirm(
                      'Replace all CRM data in this browser with the backup? This cannot be undone.',
                    )
                  ) {
                    return;
                  }
                  importCrmBackup(backup);
                } catch {
                  alert('Could not read that file.');
                }
              };
              reader.readAsText(file);
            }}
          />
        </div>
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
